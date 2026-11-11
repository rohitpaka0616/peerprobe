import { createClient } from "@supabase/supabase-js";
import { seed } from "../lib/seed";
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Run with Node --env-file=.env.local if needed.",
    );
  const owner = process.env.SEED_OWNER_ID;
  if (!owner)
    throw new Error(
      "Set SEED_OWNER_ID to the UUID of your developer student in Supabase Auth.",
    );
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: user, error: userError } =
    await client.auth.admin.getUserById(owner);
  if (userError || !user.user)
    throw new Error(
      "SEED_OWNER_ID must identify a real Supabase Auth student.",
    );
  const { data: current, error } = await client.rpc("peerprobe_snapshot");
  if (error) throw error;
  if (current.projects.length)
    throw new Error(
      "Refusing to overwrite existing projects. Seed an empty database.",
    );
  const { data, error: commitError } = await client.rpc("peerprobe_commit", {
    expected_revision: current.revision,
    next_state: seed(owner),
  });
  if (commitError) throw commitError;
  if (!data) throw new Error("Database changed while seeding. Retry.");
  console.log(
    "Seeded Nest, two immutable builds, and both testing modes. Sign in as another student to start testing.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
