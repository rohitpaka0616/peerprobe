import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { demo } from "./store";
import { DEVELOPER, TESTER, type User } from "./model";
export function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  if (demo)
    return jar.get("peerprobe-demo")?.value === "developer"
      ? { id: DEVELOPER, name: "Alex Morgan" }
      : { id: TESTER, name: "Jamie Chen" };
  const token = jar.get("peerprobe-access")?.value;
  if (!token) return null;
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    name:
      data.user.user_metadata.name ||
      data.user.email?.split("@")[0] ||
      "Student",
  };
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const allowed = process.env.APP_ORIGIN || expected;
  if (
    !origin ||
    (origin !== allowed &&
      !(
        forwardedHost &&
        origin === `${new URL(request.url).protocol}//${forwardedHost}`
      ))
  )
    throw new Error("Invalid request origin.");
}
