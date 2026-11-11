import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import { mutate, view, issueAccess } from "../lib/domain";
import { DEVELOPER, TESTER, type State } from "../lib/model";
import { randomUUID } from "node:crypto";
const developer = { id: DEVELOPER, name: "Alex" },
  tester = { id: TESTER, name: "Jamie" };
const act = (s: State, u: typeof tester, type: string, payload: unknown) =>
  mutate(s, u, { type, payload }) as Record<string, string>;
test("publish → other student → failure → issue → discussion → newer build → verified fix preserves original", () => {
  const s = seed();
  const { taskId } = act(s, developer, "publish", {
    name: "Workflow app",
    description: "Example",
    label: "v1",
    url: "https://example.com/v1",
    feature: "Split rent",
    mode: "guided",
    goal: "Check equal split",
    context: "Rent is $2400",
    minutes: 5,
    device: "Desktop",
    capacity: 1,
    steps: [{ instruction: "Change 2 to 3", expected: "$800 per person" }],
    criteria: "",
  });
  const { sessionId } = act(s, tester, "claim", { taskId });
  assert.equal(act(s, tester, "claim", { taskId }).sessionId, sessionId);
  assert.equal(s.sessions.length, 1);
  act(s, tester, "progress", { sessionId, step: 0, status: "failed" });
  const requestId = randomUUID();
  const report = {
    sessionId,
    step: 0,
    title: "Stale rent",
    reproduce: "Change to 3",
    expected: "800",
    actual: "1200",
    browser: "test",
    requestId,
  };
  const { issueId } = act(s, tester, "report", report);
  assert.equal(act(s, tester, "report", report).issueId, issueId);
  assert.equal(s.issues.length, 1);
  assert.equal(s.sessions[0].progress[0], "failed");
  act(s, developer, "comment", { issueId, text: "Thanks! Fixed in v2." });
  act(s, developer, "triage", { issueId, status: "confirmed" });
  act(s, developer, "retest", {
    issueId,
    label: "v2",
    url: "https://example.com/v2",
  });
  const original = s.issues[0].buildId;
  act(s, tester, "verdict", {
    attemptId: s.attempts[0].id,
    result: "fixed",
    notes: "Three people now pay $800 each.",
  });
  assert.equal(s.issues[0].status, "fixed");
  assert.equal(s.issues[0].buildId, original);
  assert.notEqual(s.attempts[0].buildId, original);
  assert.equal(s.sessions[0].buildId, original);
  assert.equal(s.comments.length, 1);
});
test("private criteria and private work never enter another student view", () => {
  const s = seed();
  const { sessionId } = act(s, tester, "claim", { taskId: "find-your-share" });
  act(s, tester, "response", {
    sessionId,
    tried: "Changed number of roommates",
    result: "$800",
    confusion: "None",
  });
  act(s, tester, "complete", { sessionId });
  const { issueId } = act(s, tester, "report", {
    sessionId,
    step: null,
    title: "An issue",
    reproduce: "A",
    expected: "B",
    actual: "C",
    browser: "D",
    requestId: randomUUID(),
  });
  const unrelated = { id: randomUUID(), name: "Other" };
  assert.equal(view(s, tester, true).criteria.length, 0);
  assert.equal(view(s, null, true).criteria.length, 0);
  assert.equal(view(s, developer, true).criteria.length, 1);
  assert.equal(view(s, unrelated, true).sessions.length, 0);
  assert.equal(view(s, unrelated, true).issues.length, 0);
  assert.equal(view(s, unrelated, true).claimed["find-your-share"], 1);
  assert.throws(() => issueAccess(s, issueId, unrelated));
  assert.throws(() =>
    act(s, unrelated, "progress", { sessionId, step: 0, status: "passed" }),
  );
  assert.throws(() =>
    act(s, tester, "retest", { issueId, buildId: "nest-v2" }),
  );
});
test("capacity, exact builds, blocked state, invalid steps and illegal status transitions", () => {
  const s = seed();
  s.tasks[0].capacity = 1;
  const { sessionId } = act(s, tester, "claim", { taskId: "rent-split" });
  assert.throws(() =>
    act(s, { id: randomUUID(), name: "Other" }, "claim", {
      taskId: "rent-split",
    }),
  );
  assert.throws(() => act(s, developer, "claim", { taskId: "rent-split" }));
  assert.throws(() =>
    act(s, tester, "progress", { sessionId, step: 99, status: "passed" }),
  );
  assert.throws(() => act(s, tester, "complete", { sessionId }));
  act(s, tester, "progress", { sessionId, step: 0, status: "passed" });
  act(s, tester, "progress", { sessionId, step: 1, status: "blocked" });
  act(s, tester, "complete", { sessionId });
  assert.equal(s.sessions[0].status, "blocked");
  act(s, tester, "progress", { sessionId, step: 1, status: "passed" });
  act(s, tester, "complete", { sessionId });
  assert.equal(s.sessions[0].status, "completed");
  assert.throws(() =>
    act(s, tester, "progress", { sessionId, step: 1, status: "failed" }),
  );
});
test("usability publish strips guidance; unsafe URLs and blank reports are rejected", () => {
  const s = seed();
  const d = {
    name: "App",
    description: "Description",
    label: "v1",
    url: "javascript:alert(1)",
    feature: "Feature",
    mode: "usability",
    goal: "Find your share",
    context: "Starting page",
    minutes: 5,
    device: "Mobile",
    capacity: 4,
    steps: [{ instruction: "Secret path", expected: "Secret answer" }],
    criteria: "PRIVATE_SENTINEL_800",
  };
  assert.throws(() => act(s, developer, "publish", d));
  const { taskId } = act(s, developer, "publish", {
    ...d,
    url: "https://example.com",
  });
  assert.deepEqual(s.tasks.find((t) => t.id === taskId)?.steps, []);
  assert.ok(
    !JSON.stringify(view(s, tester, true)).includes("PRIVATE_SENTINEL"),
  );
  assert.ok(!JSON.stringify(view(s, tester, true)).includes("Secret path"));
});
test("still failing retests retain every attempt and prohibit overwrite", () => {
  const s = seed();
  const { sessionId } = act(s, tester, "claim", { taskId: "rent-split" });
  const { issueId } = act(s, tester, "report", {
    sessionId,
    step: 1,
    title: "Stale",
    reproduce: "3 people",
    expected: "800",
    actual: "1200",
    browser: "Test",
    requestId: randomUUID(),
  });
  act(s, developer, "retest", { issueId, buildId: "nest-v2" });
  assert.throws(() =>
    act(s, developer, "retest", { issueId, buildId: "nest-v2" }),
  );
  act(s, tester, "verdict", {
    attemptId: s.attempts[0].id,
    result: "still-failing",
    notes: "Still wrong",
  });
  assert.throws(() =>
    act(s, tester, "verdict", {
      attemptId: s.attempts[0].id,
      result: "fixed",
      notes: "overwrite",
    }),
  );
  act(s, developer, "retest", {
    issueId,
    label: "v3",
    url: "https://example.com/v3",
  });
  act(s, tester, "verdict", {
    attemptId: s.attempts[1].id,
    result: "fixed",
    notes: "Now correct",
  });
  assert.deepEqual(
    s.attempts.map((a) => a.result),
    ["still-failing", "fixed"],
  );
});
