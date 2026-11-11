import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { authClient, checkOrigin } from "@/lib/auth";
import { demo } from "@/lib/store";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = await req.json();
    const jar = await cookies();
    const options = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: new URL(req.url).protocol === "https:",
      path: "/",
    };
    if (body.action === "logout") {
      jar.delete("peerprobe-access");
      jar.delete("peerprobe-refresh");
      return NextResponse.json({ ok: true });
    }
    if (demo) {
      const role = z.enum(["developer", "tester"]).parse(body.role);
      jar.set("peerprobe-demo", role, options);
      return NextResponse.json({ ok: true });
    }
    const client = authClient();
    if (body.action === "refresh") {
      const token = jar.get("peerprobe-refresh")?.value;
      if (!token) throw new Error("Please sign in again.");
      const { data, error } = await client.auth.refreshSession({
        refresh_token: token,
      });
      if (error || !data.session) throw new Error("Please sign in again.");
      jar.set("peerprobe-access", data.session.access_token, {
        ...options,
        maxAge: data.session.expires_in,
      });
      jar.set("peerprobe-refresh", data.session.refresh_token, {
        ...options,
        maxAge: 60 * 60 * 24 * 30,
      });
      return NextResponse.json({ ok: true });
    }
    const d = z
      .object({
        email: z.email(),
        password: z.string().min(8).max(100),
        name: z.string().max(100).optional(),
        action: z.enum(["login", "signup"]),
      })
      .parse(body);
    const { data, error } =
      d.action === "signup"
        ? await client.auth.signUp({
            email: d.email,
            password: d.password,
            options: { data: { name: d.name } },
          })
        : await client.auth.signInWithPassword(d);
    if (error) throw error;
    if (data.session) {
      jar.set("peerprobe-access", data.session.access_token, {
        ...options,
        maxAge: data.session.expires_in,
      });
      jar.set("peerprobe-refresh", data.session.refresh_token, {
        ...options,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return NextResponse.json({
      ok: true,
      message: data.session
        ? "Signed in."
        : "Check your email to confirm your account, then sign in.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sign in failed" },
      { status: 400 },
    );
  }
}
