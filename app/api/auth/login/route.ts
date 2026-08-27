import { NextResponse } from "next/server";
import {
  AuthConfigurationError,
  authenticateEditor,
  createEditorSession,
  editorSessionCookie,
} from "../../../lib/editor-auth";
import { safeReturnTo } from "../../../lib/auth-crypto";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.slice(0, 254) : "";
  const password = typeof payload.password === "string" ? payload.password.slice(0, 1024) : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email address and password." }, { status: 400 });
  }

  try {
    const editor = await authenticateEditor(email, password);
    if (!editor) {
      return NextResponse.json({ error: "The email address or password is incorrect." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, returnTo: safeReturnTo(payload.returnTo) });
    response.cookies.set(editorSessionCookie(await createEditorSession(editor), new URL(request.url).protocol === "https:"));
    return response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json({ error: "Administrator login has not been configured." }, { status: 503 });
    }
    throw error;
  }
}
