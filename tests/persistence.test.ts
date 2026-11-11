import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mutate } from "../lib/domain";
test("persistent concurrent claims are atomic, retry-safe and survive independent reads", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "peerprobe-test-"));
  process.env.PEERPROBE_DATA_DIR = dir;
  process.env.PEERPROBE_LOCAL_DEMO = "true";
  const { transaction, readState } = await import("../lib/store");
  try {
    await transaction((s) => {
      s.tasks[0].capacity = 3;
    });
    const users = Array.from({ length: 12 }, (_, i) => ({
      id: randomUUID(),
      name: `Tester ${i}`,
    }));
    const results = await Promise.allSettled(
      users.map((user) =>
        transaction((s) =>
          mutate(s, user, { type: "claim", payload: { taskId: "rent-split" } }),
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
    const s = await readState();
    assert.equal(s.sessions.length, 3);
    const winner = users.find((u) => u.id === s.sessions[0].testerId)!;
    await Promise.all(
      Array.from({ length: 8 }, () =>
        transaction((s) =>
          mutate(s, winner, {
            type: "claim",
            payload: { taskId: "rent-split" },
          }),
        ),
      ),
    );
    assert.equal((await readState()).sessions.length, 3);
    await transaction((s) =>
      mutate(s, winner, {
        type: "progress",
        payload: { sessionId: s.sessions[0].id, step: 1, status: "failed" },
      }),
    );
    const reloaded = await readState();
    assert.equal(reloaded.sessions[0].progress[1], "failed");
    assert.equal(reloaded.sessions[0].buildId, "nest-v1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
