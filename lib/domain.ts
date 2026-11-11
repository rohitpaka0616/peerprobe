import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { State, User, View } from "./model";
const text = z.string().trim().min(1).max(8000);
const url = z
  .string()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return /^\/demo\/v[12]$/.test(v);
    }
  }, "Use an http(s) preview URL.");
const publish = z.object({
  projectId: z.string().optional(),
  name: text,
  description: text,
  label: text,
  url,
  feature: text,
  mode: z.enum(["guided", "usability"]),
  goal: text,
  context: text,
  minutes: z.number().int().min(1).max(180),
  device: text,
  capacity: z.number().int().min(1).max(100),
  steps: z.array(z.object({ instruction: text, expected: text })).max(30),
  criteria: z.string().max(8000).default(""),
});
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function requireValue<T>(v: T | undefined, message = "Not found"): T {
  if (!v) throw new DomainError(message, 404);
  return v;
}
export function issueAccess(s: State, id: string, user: User) {
  const issue = requireValue(s.issues.find((x) => x.id === id));
  const project = requireValue(
    s.projects.find((x) => x.id === issue.projectId),
  );
  if (project.ownerId !== user.id && issue.testerId !== user.id)
    throw new DomainError("This issue is private.", 403);
  return { issue, project };
}
export function view(s: State, user: User | null, demo: boolean): View {
  const owned = new Set(
    s.projects.filter((p) => p.ownerId === user?.id).map((p) => p.id),
  );
  const issues = s.issues.filter(
    (i) => owned.has(i.projectId) || i.testerId === user?.id,
  );
  const ids = new Set(issues.map((i) => i.id));
  return {
    user,
    demo,
    claimed: Object.fromEntries(
      s.tasks.map((t) => [
        t.id,
        s.sessions.filter((x) => x.taskId === t.id).length,
      ]),
    ),
    projects: s.projects,
    builds: s.builds,
    tasks: s.tasks,
    criteria: s.criteria.filter((c) => c.ownerId === user?.id),
    sessions: s.sessions.filter(
      (x) =>
        x.testerId === user?.id ||
        owned.has(s.tasks.find((t) => t.id === x.taskId)!.projectId),
    ),
    issues,
    attempts: s.attempts.filter((a) => ids.has(a.issueId)),
    comments: s.comments.filter((c) => ids.has(c.issueId)),
  };
}
// Every mutation runs inside a persistent transaction; never trust IDs supplied by the browser.
export function mutate(s: State, user: User, raw: unknown): unknown {
  const a = z.object({ type: z.string(), payload: z.unknown() }).parse(raw);
  const p = a.payload as Record<string, unknown>;
  const id = () => randomUUID(),
    now = () => new Date().toISOString();
  const getTask = (v: unknown) => requireValue(s.tasks.find((t) => t.id === v));
  const getSession = (v: unknown) => {
    const session = requireValue(s.sessions.find((x) => x.id === v));
    if (session.testerId !== user.id)
      throw new DomainError("This session belongs to another student.", 403);
    return session;
  };
  const owner = (projectId: string) => {
    const project = requireValue(s.projects.find((x) => x.id === projectId));
    if (project.ownerId !== user.id)
      throw new DomainError("Only the project owner can do that.", 403);
    return project;
  };
  switch (a.type) {
    case "publish": {
      const d = publish.parse(p);
      if (d.mode === "guided" && !d.steps.length)
        throw new DomainError("Add at least one test step.");
      const project = d.projectId
        ? owner(d.projectId)
        : {
            id: id(),
            name: d.name,
            description: d.description,
            ownerId: user.id,
          };
      if (!d.projectId) s.projects.push(project);
      const build = {
        id: id(),
        projectId: project.id,
        label: d.label,
        url: d.url,
        createdAt: now(),
      };
      s.builds.push(build);
      const task = {
        id: id(),
        projectId: project.id,
        buildId: build.id,
        feature: d.feature,
        mode: d.mode,
        goal: d.goal,
        context: d.context,
        minutes: d.minutes,
        device: d.device,
        capacity: d.capacity,
        steps: d.mode === "guided" ? d.steps : [],
        createdAt: now(),
      };
      s.tasks.push(task);
      if (d.mode === "usability")
        s.criteria.push({
          id: id(),
          taskId: task.id,
          ownerId: user.id,
          text: d.criteria,
        });
      return { taskId: task.id };
    }
    case "claim": {
      const task = getTask(p.taskId);
      if (s.projects.find((x) => x.id === task.projectId)!.ownerId === user.id)
        throw new DomainError(
          "Switch to another student to test your project.",
        );
      const existing = s.sessions.find(
        (x) => x.taskId === task.id && x.testerId === user.id,
      );
      if (existing) return { sessionId: existing.id };
      if (
        s.sessions.filter((x) => x.taskId === task.id).length >= task.capacity
      )
        throw new DomainError("All tester spots have been claimed.", 409);
      const session = {
        id: id(),
        taskId: task.id,
        buildId: task.buildId,
        testerId: user.id,
        status: "active" as const,
        progress: {},
        response: { tried: "", result: "", confusion: "" },
        createdAt: now(),
        updatedAt: now(),
      };
      s.sessions.push(session);
      return { sessionId: session.id };
    }
    case "progress": {
      const d = z
        .object({
          sessionId: text,
          step: z.number().int().min(0),
          status: z.enum(["passed", "failed", "blocked"]),
        })
        .parse(p);
      const session = getSession(d.sessionId),
        task = getTask(session.taskId);
      if (session.status === "completed")
        throw new DomainError("Completed sessions are read-only.");
      if (task.mode !== "guided" || !task.steps[d.step])
        throw new DomainError("Invalid test step.");
      session.progress[d.step] = d.status;
      session.status = Object.values(session.progress).includes("blocked")
        ? "blocked"
        : "active";
      session.updatedAt = now();
      return {};
    }
    case "response": {
      const d = z
        .object({
          sessionId: text,
          tried: z.string().max(8000),
          result: z.string().max(8000),
          confusion: z.string().max(8000),
        })
        .parse(p);
      const session = getSession(d.sessionId);
      if (
        getTask(session.taskId).mode !== "usability" ||
        session.status === "completed"
      )
        throw new DomainError("Response cannot be changed.");
      session.response = {
        tried: d.tried,
        result: d.result,
        confusion: d.confusion,
      };
      session.updatedAt = now();
      return {};
    }
    case "complete": {
      const session = getSession(p.sessionId),
        task = getTask(session.taskId);
      if (
        task.mode === "guided" &&
        task.steps.some((_, i) => !session.progress[i])
      )
        throw new DomainError("Record an outcome for every step first.");
      if (
        task.mode === "usability" &&
        (!session.response.tried.trim() || !session.response.result.trim())
      )
        throw new DomainError(
          "Tell us what you tried and what result you got.",
        );
      session.status = Object.values(session.progress).includes("blocked")
        ? "blocked"
        : "completed";
      session.updatedAt = now();
      return {};
    }
    case "report": {
      const d = z
        .object({
          sessionId: text,
          title: text,
          reproduce: text,
          expected: text,
          actual: text,
          step: z.number().int().min(0).nullable(),
          browser: z.string().max(2000),
          requestId: z.string().uuid(),
        })
        .parse(p);
      const session = getSession(d.sessionId),
        task = getTask(session.taskId);
      if (d.step !== null && (task.mode !== "guided" || !task.steps[d.step]))
        throw new DomainError("Invalid step.");
      const existing = s.issues.find((i) => i.id === d.requestId);
      if (existing) {
        if (existing.testerId !== user.id || existing.sessionId !== session.id)
          throw new DomainError("Invalid request ID.");
        return { issueId: existing.id };
      }
      const issue = {
        id: d.requestId,
        sessionId: session.id,
        projectId: task.projectId,
        taskId: task.id,
        buildId: session.buildId,
        testerId: user.id,
        title: d.title,
        reproduce: d.reproduce,
        expected: d.expected,
        actual: d.actual,
        step: d.step,
        browser: d.browser,
        status: "reported" as const,
        createdAt: now(),
      };
      s.issues.push(issue);
      return { issueId: issue.id };
    }
    case "comment": {
      const d = z.object({ issueId: text, text }).parse(p);
      issueAccess(s, d.issueId, user);
      s.comments.push({
        id: id(),
        issueId: d.issueId,
        authorId: user.id,
        authorName: user.name,
        text: d.text,
        createdAt: now(),
      });
      return {};
    }
    case "triage": {
      const d = z
        .object({ issueId: text, status: z.enum(["confirmed", "duplicate"]) })
        .parse(p);
      const { issue } = issueAccess(s, d.issueId, user);
      owner(issue.projectId);
      if (
        s.attempts.some((x) => x.issueId === issue.id && x.result === "pending")
      )
        throw new DomainError(
          "Wait for the pending retest before changing status.",
        );
      issue.status = d.status;
      return {};
    }
    case "retest": {
      const d = z
        .object({
          issueId: text,
          buildId: z.string().optional(),
          label: z.string().optional(),
          url: z.string().optional(),
        })
        .parse(p);
      const { issue } = issueAccess(s, d.issueId, user);
      owner(issue.projectId);
      if (
        s.attempts.some((x) => x.issueId === issue.id && x.result === "pending")
      )
        throw new DomainError("A retest is already pending.");
      let build = d.buildId
        ? s.builds.find(
            (b) => b.id === d.buildId && b.projectId === issue.projectId,
          )
        : undefined;
      if (!d.buildId) {
        build = {
          id: id(),
          projectId: issue.projectId,
          label: text.parse(d.label),
          url: url.parse(d.url),
          createdAt: now(),
        };
        s.builds.push(build);
      }
      build = requireValue(build, "Build not found.");
      const last = s.attempts.filter((x) => x.issueId === issue.id).at(-1);
      if (build.id === (last?.buildId || issue.buildId))
        throw new DomainError("Choose a different build for this retest.");
      s.attempts.push({
        id: id(),
        issueId: issue.id,
        buildId: build.id,
        testerId: issue.testerId,
        result: "pending",
        notes: "",
        createdAt: now(),
      });
      issue.status = "retest";
      return {};
    }
    case "verdict": {
      const d = z
        .object({
          attemptId: text,
          result: z.enum(["fixed", "still-failing"]),
          notes: text,
        })
        .parse(p);
      const attempt = requireValue(
        s.attempts.find((x) => x.id === d.attemptId),
      );
      if (attempt.testerId !== user.id)
        throw new DomainError(
          "Only the reporting tester can verify this fix.",
          403,
        );
      if (attempt.result !== "pending")
        throw new DomainError("This attempt is already recorded.");
      attempt.result = d.result;
      attempt.notes = d.notes;
      attempt.completedAt = now();
      requireValue(s.issues.find((x) => x.id === attempt.issueId)).status =
        d.result;
      return {};
    }
    default:
      throw new DomainError("Unknown action.");
  }
}
