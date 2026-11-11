import { NextResponse } from "next/server";
import { currentUser, checkOrigin } from "@/lib/auth";
import { readState, transaction, demo } from "@/lib/store";
import { DomainError, mutate, view } from "@/lib/domain";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(view(await readState(), await currentUser(), demo), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    if (Number(req.headers.get("content-length") || 0) > 100000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const raw = await req.json();
    const result = await transaction((s) => mutate(s, user, raw));
    return NextResponse.json(result);
  } catch (e) {
    const message =
      e instanceof ZodError
        ? e.issues[0]?.message
        : e instanceof Error
          ? e.message
          : "Request failed";
    return NextResponse.json(
      { error: message },
      { status: e instanceof DomainError ? e.status : 400 },
    );
  }
}
