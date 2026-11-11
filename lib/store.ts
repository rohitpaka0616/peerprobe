import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import { createClient } from "@supabase/supabase-js";
import type { State } from "./model";
import { seed } from "./seed";
export const remote = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const demo =
  !remote &&
  (process.env.NODE_ENV !== "production" ||
    process.env.PEERPROBE_LOCAL_DEMO === "true");
export const dataDir =
  process.env.PEERPROBE_DATA_DIR || path.join(process.cwd(), ".data");
export function admin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
async function localRead() {
  try {
    return JSON.parse(
      await readFile(path.join(dataDir, "state.json"), "utf8"),
    ) as State;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return seed();
    throw e;
  }
}
export async function readState(): Promise<State> {
  if (remote) {
    const { data, error } = await admin().rpc("peerprobe_snapshot");
    if (error) throw error;
    return data as State;
  }
  if (!demo)
    throw new Error(
      "Configure Supabase or explicitly enable PEERPROBE_LOCAL_DEMO for local use.",
    );
  return localRead();
}
export async function transaction<T>(fn: (s: State) => T): Promise<T> {
  if (remote) {
    for (let i = 0; i < 12; i++) {
      const s = await readState();
      const revision = s.revision;
      const result = fn(s);
      const { data, error } = await admin().rpc("peerprobe_commit", {
        expected_revision: revision,
        next_state: s,
      });
      if (error) throw error;
      if (data) return result;
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));
    }
    throw new Error("Busy right now. Please retry.");
  }
  if (!demo) throw new Error("Database not configured.");
  await mkdir(dataDir, { recursive: true });
  const release = await lockfile.lock(dataDir, {
    retries: { retries: 30, minTimeout: 20, maxTimeout: 100 },
  });
  try {
    const s = await localRead();
    const result = fn(s);
    s.revision++;
    const tmp = path.join(dataDir, "state.tmp");
    await writeFile(tmp, JSON.stringify(s, null, 2));
    await rename(tmp, path.join(dataDir, "state.json"));
    return result;
  } finally {
    await release();
  }
}
