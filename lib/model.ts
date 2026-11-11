export type Mode = "guided" | "usability";
export type Step = { instruction: string; expected: string };
export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
};
export type Build = {
  id: string;
  projectId: string;
  label: string;
  url: string;
  createdAt: string;
};
export type Task = {
  id: string;
  projectId: string;
  buildId: string;
  feature: string;
  mode: Mode;
  goal: string;
  context: string;
  minutes: number;
  device: string;
  capacity: number;
  steps: Step[];
  createdAt: string;
};
export type Criteria = {
  id: string;
  taskId: string;
  ownerId: string;
  text: string;
};
export type Session = {
  id: string;
  taskId: string;
  buildId: string;
  testerId: string;
  status: "active" | "completed" | "blocked";
  progress: Record<string, "passed" | "failed" | "blocked">;
  response: { tried: string; result: string; confusion: string };
  createdAt: string;
  updatedAt: string;
};
export type Issue = {
  id: string;
  projectId: string;
  taskId: string;
  buildId: string;
  sessionId: string;
  testerId: string;
  step: number | null;
  title: string;
  reproduce: string;
  expected: string;
  actual: string;
  browser: string;
  status:
    | "reported"
    | "confirmed"
    | "duplicate"
    | "retest"
    | "fixed"
    | "still-failing";
  screenshotId?: string;
  createdAt: string;
};
export type Attempt = {
  id: string;
  issueId: string;
  buildId: string;
  testerId: string;
  result: "pending" | "fixed" | "still-failing";
  notes: string;
  createdAt: string;
  completedAt?: string;
};
export type Comment = {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};
export type Upload = {
  id: string;
  issueId: string;
  path: string;
  mime: string;
};
export type State = {
  revision: number;
  projects: Project[];
  builds: Build[];
  tasks: Task[];
  criteria: Criteria[];
  sessions: Session[];
  issues: Issue[];
  attempts: Attempt[];
  comments: Comment[];
  uploads: Upload[];
};
export type User = { id: string; name: string };
export const DEVELOPER = "11111111-1111-4111-8111-111111111111";
export const TESTER = "22222222-2222-4222-8222-222222222222";
export type View = Omit<State, "revision" | "uploads"> & {
  user: User | null;
  demo: boolean;
  claimed: Record<string, number>;
};
