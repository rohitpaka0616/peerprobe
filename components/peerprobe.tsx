"use client";
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Compass,
  FlaskConical,
  FolderKanban,
  ChevronRight,
  Clock3,
  Monitor,
  Users,
  Check,
  Bug,
  ExternalLink,
  X,
  CheckCircle2,
  Circle,
  MessageSquare,
  Layers3,
  Sparkles,
  Menu,
  Flag,
  Copy,
  LogOut,
} from "lucide-react";
import type { View, Task, Session, Step } from "@/lib/model";
const modeName = (m: string) =>
  m === "guided" ? "Guided functional" : "Usability";
const date = (d: string) =>
  new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <FlaskConical size={30} />
      <h3>A fresh start</h3>
      <p>{children}</p>
    </div>
  );
}
export default function App({
  initial,
  screen,
  id,
}: {
  initial: View;
  screen: string;
  id?: string;
}) {
  const [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [auth, setAuth] = useState(false),
    [menu, setMenu] = useState(false);
  const lock = useRef(false);
  async function refresh() {
    const r = await fetch("/api/actions", { cache: "no-store" });
    if (!r.ok) throw new Error("Could not refresh. Please reload.");
    setData(await r.json());
  }
  async function action(type: string, payload: unknown) {
    setError("");
    const r = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const result = await r.json();
    if (!r.ok) {
      if (r.status === 401) setAuth(true);
      throw new Error(result.error);
    }
    await refresh();
    return result;
  }
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Your saved progress is safe.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (data.demo) return;
    const refreshAuth = () =>
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      })
        .then((r) => {
          if (r.ok) return refresh();
        })
        .catch(() => {});
    void refreshAuth();
    const timer = setInterval(refreshAuth, 40 * 60 * 1000);
    return () => clearInterval(timer);
  }, [data.demo]); // Refresh tokens stay in HttpOnly cookies.
  const mySessions = data.sessions.filter((s) => s.testerId === data.user?.id);
  const myProjects = data.projects.filter((p) => p.ownerId === data.user?.id);
  const pending = data.attempts.filter(
    (a) => a.testerId === data.user?.id && a.result === "pending",
  );
  async function role(value: string) {
    await run(async () => {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: value }),
      });
      if (!r.ok) throw new Error("Could not switch student.");
      window.location.href = "/";
    });
  }
  const context = {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  };
  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <Link className="brand" href="/">
            <span className="brand-symbol">
              <FlaskConical size={21} />
            </span>
            peerprobe<span className="brand-dot">.</span>
          </Link>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <nav>
            {[
              ["/", "Discover tests", Compass, "discover"],
              ["/sessions", "My testing sessions", FlaskConical, "sessions"],
              ["/projects", "My projects", FolderKanban, "projects"],
            ].map(([href, label, Icon, key]) => {
              const I = Icon as typeof Compass;
              return (
                <Link
                  className={screen === key ? "active" : ""}
                  href={href as string}
                  key={href as string}
                >
                  <I size={19} />
                  {label as string}
                  {key === "sessions" && pending.length > 0 && (
                    <span className="nav-count">{pending.length}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-tip">
            <div className="tip-art">
              <Sparkles size={23} />
              <span>↗</span>
            </div>
            <h3>
              Good software takes
              <br />a second pair of eyes.
            </h3>
            <p>
              Get real feedback on
              <br />
              what you’re building.
            </p>
            <Link href="/publish">
              Publish your first test
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="sidebar-bottom">
            {data.demo && (
              <div className="demo-switch">
                <label htmlFor="demo-role">
                  <span className="dot" /> LOCAL DEMO
                </label>
                <select
                  id="demo-role"
                  aria-label="Demo student"
                  value={
                    data.user?.name === "Alex Morgan" ? "developer" : "tester"
                  }
                  onChange={(e) => void role(e.target.value)}
                >
                  <option value="tester">Jamie · Tester</option>
                  <option value="developer">Alex · Developer</option>
                </select>
              </div>
            )}
            <div className="user-row">
              <div className="avatar">
                {data.user?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2) || "?"}
              </div>
              <div>
                <b>{data.user?.name || "Your next contribution"}</b>
                <small>
                  {data.user ? "Student member" : "Join the community"}
                </small>
              </div>
              {!data.user ? (
                <button
                  className="icon-button"
                  aria-label="Sign in"
                  onClick={() => setAuth(true)}
                >
                  <ArrowRight size={17} />
                </button>
              ) : (
                !data.demo && (
                  <button
                    className="icon-button"
                    aria-label="Sign out"
                    onClick={() =>
                      void run(async () => {
                        await fetch("/api/auth", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "logout" }),
                        });
                        window.location.href = "/";
                      })
                    }
                  >
                    <LogOut size={16} />
                  </button>
                )
              )}
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <div className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <b>
                {
                  {
                    discover: "Discover tests",
                    sessions: "My testing sessions",
                    projects: "My projects",
                    publish: "Publish a test",
                    workspace: "Testing workspace",
                    issue: "Issue detail",
                  }[screen]
                }
              </b>
            </div>
            <div className="topbar-right">
              <span className="live-dot" /> A little feedback goes a long way{" "}
              <span className="top-avatar">{data.user?.name[0] || "P"}</span>
            </div>
          </header>
          <main
            className={screen === "workspace" ? "main workspace-main" : "main"}
          >
            {error && !auth && (
              <div className="banner error" role="alert">
                {error}
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {notice && (
              <div className="banner success" role="status">
                {notice}
                <button
                  aria-label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {screen === "discover" ? (
              <Discover />
            ) : screen === "sessions" ? (
              <Sessions />
            ) : screen === "projects" ? (
              <Projects />
            ) : screen === "publish" ? (
              <Publish />
            ) : screen === "workspace" ? (
              <Workspace />
            ) : (
              <IssuePage />
            )}
            <footer className="app-footer">
              <span>
                peerprobe. <span>Built together, tested together.</span>
              </span>
              <span>A fresh perspective starts here.</span>
            </footer>
          </main>
        </div>
        {auth && <AuthModal />}
      </div>
    </AppContext.Provider>
  );
}

type AppContextValue = {
  data: View;
  screen: string;
  id?: string;
  mySessions: Session[];
  myProjects: View["projects"];
  pending: View["attempts"];
  busy: boolean;
  error: string;
  run: (fn: () => Promise<void>) => Promise<void>;
  action: (type: string, payload: unknown) => Promise<Record<string, string>>;
  refresh: () => Promise<void>;
  setNotice: (value: string) => void;
  setAuth: (value: boolean) => void;
  setError: (value: string) => void;
};
const AppContext = createContext<AppContextValue | null>(null);
function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("App context missing");
  return ctx;
}
function TaskCard({ task }: { task: Task }) {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const project = data.projects.find((p) => p.id === task.projectId)!;
  const session = mySessions.find((s) => s.taskId === task.id);
  const remaining = task.capacity - (data.claimed[task.id] || 0);
  return (
    <article className="task-card">
      <div className="card-top">
        <div className="project-icon">
          n<span>•</span>
        </div>
        <div>
          <b>{project.name.split(" • ")[0]}</b>
          <small>Student project</small>
        </div>
        <Badge tone={task.mode === "guided" ? "violet" : "orange"}>
          {task.mode === "guided" ? (
            <FlaskConical size={12} />
          ) : (
            <Sparkles size={12} />
          )}{" "}
          {modeName(task.mode)}
        </Badge>
      </div>
      <h3>
        <Link href={`/task/${task.id}`}>{task.feature}</Link>
      </h3>
      <p className="card-goal">{task.goal}</p>
      <div className="meta">
        <span>
          <Monitor size={14} />
          {task.device}
        </span>
        <span>
          <Clock3 size={14} />
          {task.minutes} min
        </span>
      </div>
      <div className="card-bottom">
        <div className="spots">
          <span className="dot" />
          {remaining > 0
            ? `${remaining} tester spots left`
            : "All spots claimed"}
        </div>
        <Link className="text-link" href={`/task/${task.id}`}>
          {session ? "Resume test" : "Start test"}
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
function Discover() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const tasks = data.tasks.filter(
    (t) =>
      (filter === "all" || t.mode === filter) &&
      `${t.feature} ${data.projects.find((p) => p.id === t.projectId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="eyebrow">THE STUDENT TESTING COMMUNITY</div>
      <div className="page-heading">
        <div>
          <h1>
            Fresh eyes. Better builds<span>.</span>
          </h1>
          <p>Try something new. Find what’s broken. Help a fellow builder.</p>
        </div>
        <Link className="button primary" href="/publish">
          <Plus size={17} />
          Publish a test
        </Link>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="glass">
            <span className="dot" /> SMALL TESTS. REAL IMPACT.
          </Badge>
          <h2>
            Your next five minutes
            <br />
            could make someone’s project.
          </h2>
          <p>
            No repos. No setup. Just open an app, give it a try,
            <br className="desktop-break" /> and share what you find.
          </p>
          <a href="#tests" className="button white">
            Find a test
            <ArrowRight size={16} />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-window">
            <div className="window-dots">
              <i />
              <i />
              <i />
            </div>
            <div className="art-line wide" />
            <div className="art-line" />
            <div className="art-check">
              <Check size={26} />
              <div>
                <b>Fresh perspective</b>
                <small>Better together.</small>
              </div>
            </div>
          </div>
          <div className="floating-bug">
            <Bug size={25} />
          </div>
          <div className="floating-check">
            <Check size={22} />
          </div>
          <span className="art-star">✳</span>
        </div>
      </section>
      <div className="section-heading" id="tests">
        <div>
          <h2>
            Find your next test{" "}
            <span className="count">{data.tasks.length}</span>
          </h2>
          <p>Real student projects. Ready for your perspective.</p>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search tests"
            placeholder="Search projects or features…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="filters">
        {[
          ["all", "All tests"],
          ["guided", "Guided functional"],
          ["usability", "Usability"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
        <span>
          <span className="dot" /> Open for testing
        </span>
      </div>
      <div className="task-grid">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      {!tasks.length && <Empty>No matching tests yet.</Empty>}
      <div className="community-note">
        <div className="note-icon">
          <Users size={23} />
        </div>
        <div>
          <b>Built by students. Made better by you.</b>
          <p>
            Every thoughtful report helps someone ship with a little more
            confidence.
          </p>
        </div>
        <span>Give feedback. Get better.</span>
      </div>
    </>
  );
}
function Sessions() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CONTRIBUTIONS</div>
          <h1>My testing sessions</h1>
          <p>Pick up where you left off, or check a fresh fix.</p>
        </div>
      </div>
      {pending.length > 0 && (
        <section className="panel">
          <h2>Ready for your retest</h2>
          {pending.map((a) => (
            <Link className="list-row" key={a.id} href={`/issues/${a.issueId}`}>
              <Bug size={20} />
              <div>
                <b>{data.issues.find((i) => i.id === a.issueId)?.title}</b>
                <small>
                  New build:{" "}
                  {data.builds.find((b) => b.id === a.buildId)?.label}
                </small>
              </div>
              <Badge tone="orange">Retest requested</Badge>
              <ArrowRight size={18} />
            </Link>
          ))}
        </section>
      )}
      <section className="panel">
        <h2>Your tests</h2>
        {mySessions.map((s) => (
          <Link className="list-row" key={s.id} href={`/task/${s.taskId}`}>
            <FlaskConical size={22} />
            <div>
              <b>{data.tasks.find((t) => t.id === s.taskId)?.feature}</b>
              <small>
                {data.builds.find((b) => b.id === s.buildId)?.label} · Saved{" "}
                {date(s.updatedAt)}
              </small>
            </div>
            <Badge tone={s.status === "completed" ? "green" : "violet"}>
              {s.status}
            </Badge>
            <ArrowRight size={18} />
          </Link>
        ))}
        {!mySessions.length && (
          <Empty>Your first contribution starts on Discover tests.</Empty>
        )}
      </section>
    </>
  );
}
function Projects() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const owned = new Set(myProjects.map((p) => p.id));
  const tasks = data.tasks.filter((t) => owned.has(t.projectId));
  const sessions = data.sessions.filter((s) =>
    tasks.some((t) => t.id === s.taskId),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUILDER WORKSPACE</div>
          <h1>My projects</h1>
          <p>Turn fresh perspectives into your next improvement.</p>
        </div>
        <Link className="button primary" href="/publish">
          <Plus size={17} />
          Publish a test
        </Link>
      </div>
      <div className="stats">
        {[
          ["Active tasks", tasks.length],
          [
            "Completed sessions",
            sessions.filter((s) => s.status === "completed").length,
          ],
          [
            "Blocked sessions",
            sessions.filter((s) => s.status === "blocked").length,
          ],
          [
            "Reported issues",
            data.issues.filter((i) => owned.has(i.projectId)).length,
          ],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {!myProjects.length && (
        <Empty>Publish your first feature to invite fresh eyes.</Empty>
      )}
      {myProjects.map((p) => (
        <section className="panel" key={p.id}>
          <div className="section-heading">
            <div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
            </div>
            <Link className="button" href={`/publish?project=${p.id}`}>
              <Plus size={16} />
              Add task
            </Link>
          </div>
          {tasks
            .filter((t) => t.projectId === p.id)
            .map((t) => (
              <div className="project-task" key={t.id}>
                <div className="list-row">
                  <div>
                    <Link href={`/task/${t.id}`}>
                      <b>{t.feature}</b>
                    </Link>
                    <small>
                      {modeName(t.mode)} · {data.claimed[t.id] || 0}/
                      {t.capacity} testers ·{" "}
                      {data.builds.find((b) => b.id === t.buildId)?.label}
                    </small>
                  </div>
                  <Link className="text-link" href={`/task/${t.id}`}>
                    View task
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
                {data.criteria
                  .filter((c) => c.taskId === t.id)
                  .map((c) => (
                    <div className="private-note" key={c.id}>
                      <b>Owner-only success criteria</b>
                      <p>{c.text || "No private criteria added."}</p>
                    </div>
                  ))}
                {sessions
                  .filter((s) => s.taskId === t.id)
                  .map((s) => (
                    <details className="session-detail" key={s.id}>
                      <summary>
                        Student {s.testerId.slice(0, 8)} · {s.status} ·{" "}
                        {date(s.updatedAt)}
                      </summary>
                      {t.mode === "guided" ? (
                        t.steps.map((step, i) => (
                          <p key={i}>
                            {i + 1}. {step.instruction} —{" "}
                            <b>{s.progress[i] || "Not attempted"}</b>
                          </p>
                        ))
                      ) : (
                        <>
                          <p>
                            <b>Tried:</b>{" "}
                            {s.response.tried || "No response yet"}
                          </p>
                          <p>
                            <b>Result:</b>{" "}
                            {s.response.result || "No response yet"}
                          </p>
                          <p>
                            <b>Confusion:</b>{" "}
                            {s.response.confusion || "None recorded"}
                          </p>
                        </>
                      )}
                    </details>
                  ))}
              </div>
            ))}
          <h3 className="subheading">Issue inbox</h3>
          {data.issues
            .filter((i) => i.projectId === p.id)
            .map((i) => (
              <Link className="list-row" key={i.id} href={`/issues/${i.id}`}>
                <Bug size={18} />
                <div>
                  <b>{i.title}</b>
                  <small>
                    {data.builds.find((b) => b.id === i.buildId)?.label} ·{" "}
                    {date(i.createdAt)}
                  </small>
                </div>
                <Badge tone={i.status === "fixed" ? "green" : "orange"}>
                  {i.status}
                </Badge>
                <ChevronRight size={17} />
              </Link>
            ))}
          {!data.issues.some((i) => i.projectId === p.id) && (
            <p className="muted">No issues reported yet.</p>
          )}
        </section>
      ))}
    </>
  );
}
function Publish() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const [preview, setPreview] = useState(false),
    [mode, setMode] = useState<"guided" | "usability">("guided"),
    [steps, setSteps] = useState<Step[]>([{ instruction: "", expected: "" }]),
    [draft, setDraft] = useState<Record<string, string>>({
      minutes: "5",
      capacity: "5",
      device: "Desktop or mobile",
    });
  const projectId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("project") || ""
      : "";
  const project = myProjects.find((p) => p.id === projectId);
  const change = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  function field(
    key: string,
    label: string,
    multiline = false,
    placeholder = "",
  ) {
    return (
      <Field label={label}>
        {multiline ? (
          <textarea
            required
            value={draft[key] || ""}
            onChange={(e) => change(key, e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            required
            value={draft[key] || ""}
            onChange={(e) => change(key, e.target.value)}
            placeholder={placeholder}
          />
        )}
      </Field>
    );
  }
  return (
    <>
      <Link className="back" href="/projects">
        ← My projects
      </Link>
      <div className="page-heading">
        <div>
          <h1>Invite a fresh perspective</h1>
          <p>One feature. A clear goal. Feedback you can use.</p>
        </div>
        <Badge tone="violet">
          {preview ? "Tester preview" : "New testing task"}
        </Badge>
      </div>
      <form
        className="publish-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!preview) {
            setPreview(true);
            return;
          }
          void run(async () => {
            const result = await action("publish", {
              ...draft,
              projectId: project?.id,
              name: project?.name || draft.name,
              description: project?.description || draft.description,
              mode,
              steps: mode === "guided" ? steps : [],
              minutes: Number(draft.minutes),
              capacity: Number(draft.capacity),
              criteria: draft.criteria || "",
            });
            window.location.href = `/task/${result.taskId}`;
          });
        }}
      >
        {preview ? (
          <>
            <section className="panel tester-preview">
              <Badge tone={mode === "guided" ? "violet" : "orange"}>
                {modeName(mode)}
              </Badge>
              <h2>{draft.feature}</h2>
              <div className="meta">
                <span>{draft.device}</span>
                <span>{draft.minutes} minutes</span>
                <span>Build {draft.label}</span>
              </div>
              <h3>Your goal</h3>
              <p>{draft.goal}</p>
              <h3>Before you start</h3>
              <p>{draft.context}</p>
              {mode === "guided" ? (
                steps.map((s, i) => (
                  <div className="step-preview" key={i}>
                    <b>
                      {i + 1}. {s.instruction}
                    </b>
                    <p>Expected: {s.expected}</p>
                  </div>
                ))
              ) : (
                <div className="private-note">
                  You’ll be asked what you tried, what result you got, and where
                  you were confused.
                </div>
              )}
              <a
                className="button"
                href={
                  /^https?:\/\//.test(draft.url || "") ||
                  /^\/demo\/v[12]$/.test(draft.url || "")
                    ? draft.url
                    : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Open app in new tab
                <ExternalLink size={15} />
              </a>
            </section>
            <p className="muted">
              This is the tester’s task panel. Private success criteria are
              never included.
            </p>
            <div className="form-actions">
              <button
                className="button"
                type="button"
                onClick={() => setPreview(false)}
              >
                Back to editing
              </button>
              <button disabled={busy} className="button primary">
                Publish testing task
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="panel">
              <h2>
                01 <span>Project & build</span>
              </h2>
              {project ? (
                <p>
                  Adding a feature to <b>{project.name}</b>
                </p>
              ) : (
                <>
                  {field(
                    "name",
                    "Project name",
                    false,
                    "e.g. Nest — Student living",
                  )}
                  {field(
                    "description",
                    "Project description",
                    true,
                    "What are you building?",
                  )}
                </>
              )}
              <div className="form-grid">
                {field("label", "Build version", false, "e.g. v1.0.0")}
                {field(
                  "url",
                  "Preview URL",
                  false,
                  "https://your-version.example.com",
                )}
              </div>
              <p className="hint">
                Use a version-specific deployment URL so findings can be traced
                to the exact software tested.
              </p>
            </section>
            <section className="panel">
              <h2>
                02 <span>Choose a testing mode</span>
              </h2>
              <div className="mode-options">
                <button
                  type="button"
                  className={mode === "guided" ? "chosen" : ""}
                  onClick={() => setMode("guided")}
                >
                  <FlaskConical />
                  <b>Guided functional test</b>
                  <span>Does this feature work correctly?</span>
                  <small>Give testers steps and expected behavior.</small>
                </button>
                <button
                  type="button"
                  className={mode === "usability" ? "chosen" : ""}
                  onClick={() => setMode("usability")}
                >
                  <Sparkles />
                  <b>Usability test</b>
                  <span>Can someone figure out how to use this?</span>
                  <small>Give them a goal. Let them find their own way.</small>
                </button>
              </div>
            </section>
            <section className="panel">
              <h2>
                03 <span>The tester’s brief</span>
              </h2>
              {field(
                "feature",
                "Feature name",
                false,
                "What would you like tested?",
              )}
              {field(
                "goal",
                "User goal",
                true,
                "What should the tester accomplish?",
              )}
              {field(
                "context",
                "Starting conditions",
                true,
                "Starting screen, demo login, and anything needed before testing.",
              )}
              <div className="form-grid three">
                <Field label="Estimated minutes">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={draft.minutes}
                    onChange={(e) => change("minutes", e.target.value)}
                  />
                </Field>
                <Field label="Tester spots">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={draft.capacity}
                    onChange={(e) => change("capacity", e.target.value)}
                  />
                </Field>
                {field("device", "Target device")}
              </div>
              {mode === "guided" ? (
                <>
                  <h3>Steps & observable expectations</h3>
                  {steps.map((s, i) => (
                    <div className="step-editor" key={i}>
                      <b>Step {i + 1}</b>
                      <Field label="Instruction">
                        <textarea
                          required
                          value={s.instruction}
                          onChange={(e) =>
                            setSteps(
                              steps.map((v, n) =>
                                n === i
                                  ? { ...v, instruction: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Expected behavior">
                        <textarea
                          required
                          value={s.expected}
                          onChange={(e) =>
                            setSteps(
                              steps.map((v, n) =>
                                n === i
                                  ? { ...v, expected: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={() =>
                            setSteps(steps.filter((_, n) => n !== i))
                          }
                        >
                          Remove step
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      setSteps([...steps, { instruction: "", expected: "" }])
                    }
                  >
                    <Plus size={16} />
                    Add step
                  </button>
                </>
              ) : (
                <Field label="Private success criteria (optional · only you can see this)">
                  <textarea
                    value={draft.criteria || ""}
                    onChange={(e) => change("criteria", e.target.value)}
                    placeholder="How will you evaluate the response? Keep solutions here, out of the goal and starting conditions."
                  />
                </Field>
              )}
            </section>
            <div className="form-actions">
              <button className="button primary">
                Preview as a tester
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </form>
    </>
  );
}
function Workspace() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const task = data.tasks.find((t) => t.id === id);
  const [report, setReport] = useState<number | null | undefined>(undefined),
    [reportId, setReportId] = useState(""),
    [response, setResponse] = useState({
      tried: "",
      result: "",
      confusion: "",
    }),
    [saved, setSaved] = useState(""),
    [tab, setTab] = useState("brief");
  const session = mySessions.find((s) => s.taskId === id);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const responseVersion = useRef(0);
  useEffect(() => {
    if (session) setResponse(session.response);
  }, [session?.id]);
  useEffect(() => {
    if (
      !session ||
      session.status === "completed" ||
      saved !== "Unsaved changes"
    )
      return;
    const timer = setTimeout(() => {
      void saveResponse().catch((e) => setError(e.message));
    }, 600);
    return () => clearTimeout(timer);
  }, [response, session?.id, session?.status, saved]);
  useEffect(() => {
    if (saved !== "Unsaved changes") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);
  if (!task) return <Empty>This test isn’t available.</Empty>;
  const project = data.projects.find((p) => p.id === task.projectId)!;
  const build = data.builds.find(
    (b) => b.id === (session?.buildId || task.buildId),
  )!;
  const isOwner = project.ownerId === data.user?.id;
  function openReport(step: number | null) {
    setReportId(crypto.randomUUID());
    setReport(step);
  }
  async function saveResponse() {
    if (!session) return;
    const version = responseVersion.current;
    const payload = { sessionId: session.id, ...response };
    const work = saveQueue.current
      .catch(() => {})
      .then(() => action("response", payload));
    saveQueue.current = work;
    await work;
    if (version === responseVersion.current) setSaved("All changes saved");
  }
  return (
    <>
      <div className="workspace-heading">
        <div>
          <Link className="back" href="/">
            Discover tests / {project.name.split(" • ")[0]}
          </Link>
          <h1>{task.feature}</h1>
          <div className="meta">
            <Badge tone={task.mode === "guided" ? "violet" : "orange"}>
              {modeName(task.mode)}
            </Badge>
            <span>
              <Layers3 size={14} />
              Build {build.label}
            </span>
            <span>
              <Clock3 size={14} />
              {task.minutes} min
            </span>
            {session && (
              <span className="saved">
                <CheckCircle2 size={14} />
                {busy ? "Saving…" : "Progress saved"}
              </span>
            )}
          </div>
        </div>
        <button
          className="button"
          onClick={() =>
            void run(async () => {
              await navigator.clipboard.writeText(window.location.href);
              setNotice("Task link copied.");
            })
          }
        >
          <Copy size={15} />
          Share task
        </button>
      </div>
      {!session ? (
        <section className="panel start-panel">
          <Badge tone="violet">
            {isOwner ? "Developer preview" : "Before you begin"}
          </Badge>
          <h2>Your goal</h2>
          <p>{task.goal}</p>
          <h3>Starting conditions</h3>
          <p>{task.context}</p>
          {task.mode === "guided" &&
            task.steps.map((s, i) => (
              <div className="step-preview" key={i}>
                <b>
                  {i + 1}. {s.instruction}
                </b>
                <p>Expected: {s.expected}</p>
              </div>
            ))}
          <div className="meta">
            <span>
              <Monitor size={16} />
              {task.device}
            </span>
            <span>
              <Users size={16} />
              {Math.max(0, task.capacity - (data.claimed[task.id] || 0))} spots
              left
            </span>
          </div>
          {isOwner ? (
            <p className="private-note">
              You’re viewing your task as a tester would.{" "}
              {data.demo
                ? "Switch to Jamie (tester) in the sidebar to start a test."
                : "Share this link with another student to start a test."}
            </p>
          ) : (
            <button
              disabled={busy}
              className="button primary"
              onClick={() =>
                void run(async () => {
                  if (!data.user) {
                    setAuth(true);
                    return;
                  }
                  await action("claim", { taskId: task.id });
                })
              }
            >
              Start testing
              <ArrowRight size={17} />
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="mobile-tabs">
            <button
              className={tab === "brief" ? "selected" : ""}
              onClick={() => setTab("brief")}
            >
              Test brief
            </button>
            <button
              className={tab === "app" ? "selected" : ""}
              onClick={() => setTab("app")}
            >
              Running app
            </button>
          </div>
          <div className="workspace">
            <section
              className={`task-panel ${tab === "brief" ? "mobile-visible" : ""}`}
            >
              <div className="task-panel-head">
                <h2>Your testing brief</h2>
                <Badge
                  tone={session.status === "completed" ? "green" : "neutral"}
                >
                  {session.status}
                </Badge>
              </div>
              <div className="task-panel-body">
                <h3>Your goal</h3>
                <p>{task.goal}</p>
                <div className="context">
                  <b>Before you start</b>
                  <p>{task.context}</p>
                </div>
                {task.mode === "guided" ? (
                  <>
                    <div className="section-heading">
                      <h3>Test steps</h3>
                      <span className="muted">
                        {Object.keys(session.progress).length}/
                        {task.steps.length} recorded
                      </span>
                    </div>
                    {task.steps.map((step, i) => (
                      <div
                        className={`test-step ${session.progress[i] || ""}`}
                        key={i}
                      >
                        <div className="step-number">
                          {session.progress[i] === "passed" ? (
                            <Check size={14} />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <div className="step-content">
                          <b>{step.instruction}</b>
                          <p>
                            <span className="expected-label">EXPECTED</span>
                            {step.expected}
                          </p>
                          <div className="outcomes">
                            {(["passed", "failed", "blocked"] as const).map(
                              (status) => (
                                <button
                                  disabled={
                                    busy || session.status === "completed"
                                  }
                                  className={
                                    session.progress[i] === status
                                      ? "active " + status
                                      : ""
                                  }
                                  key={status}
                                  onClick={() =>
                                    void run(async () => {
                                      await action("progress", {
                                        sessionId: session.id,
                                        step: i,
                                        status,
                                      });
                                      if (status === "failed") openReport(i);
                                    })
                                  }
                                >
                                  {status === "passed" ? (
                                    <Check size={12} />
                                  ) : status === "failed" ? (
                                    <X size={12} />
                                  ) : (
                                    <Circle size={12} />
                                  )}{" "}
                                  {status[0].toUpperCase() + status.slice(1)}
                                </button>
                              ),
                            )}
                          </div>
                          {session.progress[i] === "failed" && (
                            <button
                              className="text-link danger"
                              onClick={() => openReport(i)}
                            >
                              Report this failure
                              <ArrowUpRight size={13} />
                            </button>
                          )}
                          {session.progress[i] === "blocked" && (
                            <p className="hint">
                              Couldn’t complete this step? Report what stopped
                              you.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h3>Your experience</h3>
                    <p className="hint">
                      Explore first, then tell us in your own words. There’s no
                      wrong path.
                    </p>
                    {[
                      ["tried", "What did you try?"],
                      ["result", "What result did you get?"],
                      ["confusion", "Where were you confused? (optional)"],
                    ].map(([key, label]) => (
                      <Field key={key} label={label}>
                        <textarea
                          disabled={session.status === "completed"}
                          value={response[key as keyof typeof response]}
                          onChange={(e) => {
                            responseVersion.current++;
                            setResponse({ ...response, [key]: e.target.value });
                            setSaved("Unsaved changes");
                          }}
                        />
                      </Field>
                    ))}
                    {session.status !== "completed" && (
                      <button
                        disabled={busy}
                        className="button"
                        onClick={() => void run(saveResponse)}
                      >
                        Save response
                      </button>
                    )}
                    <small className="muted" aria-live="polite">
                      {saved}
                    </small>
                  </>
                )}
                {session.status !== "completed" && (
                  <button
                    className="button primary full"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        if (task.mode === "usability") await saveResponse();
                        await action("complete", { sessionId: session.id });
                        setNotice(
                          Object.values(session.progress).includes("blocked")
                            ? "Session recorded as blocked. You can return when the blocker is resolved."
                            : "Thanks! Your test is complete.",
                        );
                      })
                    }
                  >
                    Finish test
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {session.status === "completed" && (
                  <div className="success-box">
                    <CheckCircle2 size={21} />
                    <b>You made this build a little better.</b>
                    <p>Your results are ready for the developer.</p>
                  </div>
                )}
                <button
                  className="button full"
                  onClick={() => openReport(null)}
                >
                  <Bug size={17} />
                  Report an issue
                </button>
                <p className="hint center">
                  Found something outside the steps? Report it here.
                </p>
                {data.issues
                  .filter((i) => i.sessionId === session.id)
                  .map((i) => (
                    <Link
                      className="small-issue"
                      key={i.id}
                      href={`/issues/${i.id}`}
                    >
                      <Bug size={14} />
                      {i.title}
                      <Badge>{i.status}</Badge>
                    </Link>
                  ))}
              </div>
            </section>
            <section
              className={`preview-panel ${tab === "app" ? "mobile-visible" : ""}`}
            >
              <div className="preview-toolbar">
                <div>
                  <span className="dot" />
                  <b>{project.name.split(" • ")[0]}</b>
                  <Badge>{build.label}</Badge>
                </div>
                <a
                  className="text-link"
                  href={build.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open app in new tab
                  <ExternalLink size={15} />
                </a>
              </div>
              <iframe
                title={`${project.name} — ${build.label}`}
                src={build.url}
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                referrerPolicy="no-referrer"
              />
              <div className="preview-footer">
                <Monitor size={14} /> Preview not loading? Some apps block
                embedding. Use “Open app in new tab”; your session stays here.
              </div>
            </section>
          </div>
        </>
      )}
      {report !== undefined && session && (
        <ReportModal
          session={session}
          task={task}
          step={report}
          requestId={reportId}
          close={() => setReport(undefined)}
        />
      )}
    </>
  );
}
function ReportModal({
  session,
  task,
  step,
  requestId,
  close,
}: {
  session: Session;
  task: Task;
  step: number | null;
  requestId: string;
  close: () => void;
}) {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const [file, setFile] = useState<File | null>(null),
    [created, setCreated] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Report an issue"
      >
        <div className="section-heading">
          <div>
            <Badge tone="orange">
              <Bug size={12} />
              MAKE IT BETTER
            </Badge>
            <h2>Report an issue</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close report"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <p className="muted">
          Your test progress stays right where you left it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              let issueId = created;
              if (!issueId) {
                const r = await action("report", {
                  sessionId: session.id,
                  title: form.get("title"),
                  reproduce: form.get("reproduce"),
                  expected: form.get("expected"),
                  actual: form.get("actual"),
                  step,
                  browser:
                    navigator.userAgent +
                    ` | ${window.innerWidth}×${window.innerHeight} | ${navigator.language}`,
                  requestId,
                });
                issueId = r.issueId;
                setCreated(issueId);
              }
              if (file) {
                const upload = new FormData();
                upload.set("file", file);
                upload.set("issueId", issueId);
                const r = await fetch("/api/screenshot", {
                  method: "POST",
                  body: upload,
                });
                if (!r.ok)
                  throw new Error(
                    `Report saved; screenshot upload failed: ${(await r.json()).error}. Retry or close this dialog.`,
                  );
                await refresh();
              }
              close();
              setNotice("Issue reported. The developer can now review it.");
            });
          }}
        >
          <Field label="Title">
            <input
              name="title"
              autoFocus
              required
              disabled={!!created}
              placeholder="What went wrong?"
            />
          </Field>
          <Field label="Steps to reproduce">
            <textarea
              name="reproduce"
              required
              disabled={!!created}
              defaultValue={
                step !== null
                  ? task.steps
                      .slice(0, step + 1)
                      .map((s, i) => `${i + 1}. ${s.instruction}`)
                      .join("\n")
                  : ""
              }
            />
          </Field>
          <Field label="Expected behavior">
            <textarea
              name="expected"
              required
              disabled={!!created}
              defaultValue={step !== null ? task.steps[step].expected : ""}
            />
          </Field>
          <Field label="Actual behavior">
            <textarea
              name="actual"
              required
              disabled={!!created}
              placeholder="What happened instead?"
            />
          </Field>
          <Field label="Screenshot (optional · PNG, JPEG, WebP · up to 5 MB)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <p className="hint">
            Build, task, step, time, and browser information are attached
            automatically. Visible only to you and the project owner.
          </p>
          {error && (
            <div role="alert" className="error-inline">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="button" onClick={close}>
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : created ? "Retry screenshot" : "Submit issue"}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function IssuePage() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const issue = data.issues.find((i) => i.id === id);
  const [verdict, setVerdict] = useState<"fixed" | "still-failing">("fixed"),
    [newBuild, setNewBuild] = useState(false);
  if (!issue)
    return (
      <Empty>
        This issue is private or doesn’t exist. Sign in as the reporter or
        project owner.
      </Empty>
    );
  const project = data.projects.find((p) => p.id === issue.projectId)!;
  const isOwner = project.ownerId === data.user?.id;
  const original = data.builds.find((b) => b.id === issue.buildId)!;
  const attempts = data.attempts.filter((a) => a.issueId === issue.id);
  const pendingAttempt = attempts.find((a) => a.result === "pending");
  const retestBuild = data.builds.find((b) => b.id === pendingAttempt?.buildId);
  return (
    <>
      <Link
        className="back"
        href={isOwner ? "/projects" : `/task/${issue.taskId}`}
      >
        ← {isOwner ? "My projects" : "Testing workspace"}
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{project.name} / ISSUE</div>
          <h1>{issue.title}</h1>
          <p>
            Reported on {original.label} · {date(issue.createdAt)}
            {issue.step !== null ? ` · Step ${issue.step + 1}` : ""}
          </p>
        </div>
        <Badge tone={issue.status === "fixed" ? "green" : "orange"}>
          {issue.status}
        </Badge>
      </div>
      <div className="issue-grid">
        <div>
          <section className="panel">
            <h2>Original finding</h2>
            {[
              ["Steps to reproduce", issue.reproduce],
              ["Expected behavior", issue.expected],
              ["Actual behavior", issue.actual],
            ].map(([label, text]) => (
              <div className="finding" key={label}>
                <h3>{label}</h3>
                <p>{text}</p>
              </div>
            ))}
            <a
              className="text-link"
              href={original.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original build {original.label}
              <ExternalLink size={14} />
            </a>
            {issue.screenshotId && (
              <a
                href={`/api/screenshot?id=${issue.screenshotId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  className="screenshot"
                  src={`/api/screenshot?id=${issue.screenshotId}`}
                  alt="Screenshot attached to this issue"
                />
              </a>
            )}
            <details className="browser-info">
              <summary>Captured browser information</summary>
              <p>{issue.browser}</p>
              <small>
                Session {issue.sessionId}
                <br />
                Task {issue.taskId}
                <br />
                Build {issue.buildId}
              </small>
            </details>
          </section>
          {pendingAttempt && retestBuild && (
            <section className="panel retest-panel">
              <Badge tone="violet">RETEST REQUESTED</Badge>
              <h2>Try the original scenario on {retestBuild.label}</h2>
              <p>
                Repeat the steps above. Check whether the expected behavior now
                matches what you see.
              </p>
              <a
                className="button primary"
                href={retestBuild.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open app in new tab
                <ExternalLink size={16} />
              </a>
              <iframe
                className="retest-frame"
                title={`Retest build ${retestBuild.label}`}
                src={retestBuild.url}
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                referrerPolicy="no-referrer"
              />
              {issue.testerId === data.user?.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(async () => {
                      await action("verdict", {
                        attemptId: pendingAttempt.id,
                        result: verdict,
                        notes: f.get("notes"),
                      });
                      setNotice(
                        "Retest recorded. Both build attempts are preserved.",
                      );
                    });
                  }}
                >
                  <Field label="Retest result">
                    <select
                      value={verdict}
                      onChange={(e) =>
                        setVerdict(e.target.value as typeof verdict)
                      }
                    >
                      <option value="fixed">Fixed</option>
                      <option value="still-failing">Still failing</option>
                    </select>
                  </Field>
                  <Field label="What did you observe?">
                    <textarea
                      name="notes"
                      required
                      placeholder="Describe the result on this build."
                    />
                  </Field>
                  <button className="button primary" disabled={busy}>
                    Submit verification
                    <Check size={17} />
                  </button>
                </form>
              ) : (
                <p className="hint">
                  Waiting for the original tester to verify this build.
                </p>
              )}
            </section>
          )}
          <section className="panel">
            <h2>
              <MessageSquare size={19} /> Discussion
            </h2>
            {data.comments
              .filter((c) => c.issueId === issue.id)
              .map((c) => (
                <div className="comment" key={c.id}>
                  <div className="avatar">{c.authorName[0]}</div>
                  <div>
                    <b>{c.authorName}</b>
                    <small>{date(c.createdAt)}</small>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}
            {!data.comments.some((c) => c.issueId === issue.id) && (
              <p className="muted">
                Ask a question or share a little more context.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                void run(async () => {
                  await action("comment", {
                    issueId: issue.id,
                    text: f.get("text"),
                  });
                  form.reset();
                });
              }}
            >
              <Field label="Add to the conversation">
                <textarea required name="text" placeholder="Write a reply…" />
              </Field>
              <button className="button" disabled={busy}>
                Post reply
                <ArrowRight size={15} />
              </button>
            </form>
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>Build history</h2>
            <div className="history-item">
              <span className="history-dot orange" />
              <div>
                <b>{original.label} · Original report</b>
                <p>{date(issue.createdAt)}</p>
                <Badge tone="orange">Reported</Badge>
              </div>
            </div>
            {attempts.map((a) => (
              <div className="history-item" key={a.id}>
                <span
                  className={`history-dot ${a.result === "fixed" ? "green" : "violet"}`}
                />
                <div>
                  <b>{data.builds.find((b) => b.id === a.buildId)?.label}</b>
                  <p>{date(a.createdAt)}</p>
                  <Badge tone={a.result === "fixed" ? "green" : "violet"}>
                    {a.result}
                  </Badge>
                  {a.notes && <p>{a.notes}</p>}
                </div>
              </div>
            ))}
          </section>
          {isOwner && (
            <section className="panel">
              <h2>Developer actions</h2>
              <div className="stack">
                <button
                  className="button"
                  disabled={busy || !!pendingAttempt}
                  onClick={() =>
                    void run(async () => {
                      await action("triage", {
                        issueId: issue.id,
                        status: "confirmed",
                      });
                    })
                  }
                >
                  <CheckCircle2 size={16} />
                  Confirm issue
                </button>
                <button
                  className="button"
                  disabled={busy || !!pendingAttempt}
                  onClick={() =>
                    void run(async () => {
                      await action("triage", {
                        issueId: issue.id,
                        status: "duplicate",
                      });
                    })
                  }
                >
                  <Copy size={16} />
                  Mark duplicate
                </button>
              </div>
              <hr />
              <h3>Request a retest</h3>
              <p className="hint">
                Attach a new build. The original tester will find it in My
                testing sessions.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(async () => {
                    await action("retest", {
                      issueId: issue.id,
                      ...(newBuild
                        ? { label: f.get("label"), url: f.get("url") }
                        : { buildId: f.get("buildId") }),
                    });
                    setNotice("Retest requested.");
                  });
                }}
              >
                <Field label="Build source">
                  <select
                    value={newBuild ? "new" : "existing"}
                    onChange={(e) => setNewBuild(e.target.value === "new")}
                  >
                    <option value="existing">Use an existing build</option>
                    <option value="new">Attach a new build</option>
                  </select>
                </Field>
                {newBuild ? (
                  <>
                    <Field label="Version label">
                      <input required name="label" placeholder="v1.1.0" />
                    </Field>
                    <Field label="Version-specific preview URL">
                      <input
                        required
                        name="url"
                        type="url"
                        placeholder="https://…"
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Build to verify">
                    <select name="buildId" required>
                      {data.builds
                        .filter(
                          (b) =>
                            b.projectId === project.id &&
                            b.id !==
                              (attempts.at(-1)?.buildId || issue.buildId),
                        )
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label} — {b.url}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
                <button
                  className="button primary full"
                  disabled={busy || !!pendingAttempt}
                >
                  Request retest
                  <ArrowRight size={16} />
                </button>
              </form>
            </section>
          )}
          <p className="privacy-caption">
            Private to the project owner and reporting tester.
          </p>
        </aside>
      </div>
    </>
  );
}
function AuthModal() {
  const {
    data,
    screen,
    id,
    mySessions,
    myProjects,
    pending,
    busy,
    error,
    run,
    action,
    refresh,
    setNotice,
    setAuth,
    setError,
  } = useApp();
  const [signup, setSignup] = useState(false);
  return (
    <div className="modal-backdrop">
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Student sign in"
      >
        <div className="section-heading">
          <h2>{signup ? "Join the community" : "Welcome back"}</h2>
          <button
            className="icon-button"
            aria-label="Close sign in"
            onClick={() => setAuth(false)}
          >
            <X />
          </button>
        </div>
        <p>One student account. Build, test, and help each other improve.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void run(async () => {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: signup ? "signup" : "login",
                  email: f.get("email"),
                  password: f.get("password"),
                  name: f.get("name") || undefined,
                }),
              });
              const result = await r.json();
              if (!r.ok) throw new Error(result.error);
              await refresh();
              setNotice(result.message);
              setAuth(false);
            });
          }}
        >
          {signup && (
            <Field label="Your name">
              <input name="name" required autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </Field>
          {error && (
            <p role="alert" className="error-inline">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
        <button className="text-link" onClick={() => setSignup(!signup)}>
          {signup ? "Already a member? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </div>
  );
}
