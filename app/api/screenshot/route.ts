import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { currentUser, checkOrigin } from "@/lib/auth";
import { admin, dataDir, readState, remote, transaction } from "@/lib/store";
import { issueAccess } from "@/lib/domain";
export async function POST(req: Request) {
  let storedPath: string | undefined;
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (Number(req.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new Error("Screenshot must be under 5 MB.");
    const form = await req.formData();
    const issueId = String(form.get("issueId"));
    const { issue } = issueAccess(await readState(), issueId, user);
    if (issue.testerId !== user.id)
      throw new Error("Only the reporting tester can upload.");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      throw new Error("Choose a screenshot under 5 MB.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const png = buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    const webp =
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
    if (!png && !jpeg && !webp)
      throw new Error("Use a PNG, JPEG, or WebP image.");
    const mime = png ? "image/png" : jpeg ? "image/jpeg" : "image/webp";
    const id = randomUUID();
    storedPath = `${issueId}/${id}`;
    if (remote) {
      const { error } = await admin()
        .storage.from("screenshots")
        .upload(storedPath, buffer, { contentType: mime });
      if (error) throw error;
    } else {
      await mkdir(path.join(dataDir, "screenshots", issueId), {
        recursive: true,
      });
      await writeFile(path.join(dataDir, "screenshots", storedPath), buffer);
    }
    await transaction((s) => {
      const { issue } = issueAccess(s, issueId, user);
      s.uploads.push({ id, issueId, path: storedPath!, mime });
      issue.screenshotId = id;
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (storedPath) {
      if (remote)
        await admin().storage.from("screenshots").remove([storedPath]);
      else
        await unlink(path.join(dataDir, "screenshots", storedPath)).catch(
          () => {},
        );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    const s = await readState();
    const id = new URL(req.url).searchParams.get("id");
    const upload = s.uploads.find((x) => x.id === id);
    if (!upload) return new NextResponse(null, { status: 404 });
    issueAccess(s, upload.issueId, user);
    let bytes: Uint8Array;
    if (remote) {
      const { data, error } = await admin()
        .storage.from("screenshots")
        .download(upload.path);
      if (error || !data) throw new Error("Screenshot unavailable");
      bytes = new Uint8Array(await data.arrayBuffer());
    } else
      bytes = new Uint8Array(
        await readFile(path.join(dataDir, "screenshots", upload.path)),
      );
    return new NextResponse(new Uint8Array(bytes).buffer, {
      headers: {
        "Content-Type": upload.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
}
