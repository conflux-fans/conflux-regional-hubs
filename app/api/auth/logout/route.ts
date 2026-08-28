import { NextResponse } from "next/server";
import { expiredEditorSessionCookie } from "../../../lib/editor-auth";
import { isSameOriginRequest } from "../../../lib/request-origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(expiredEditorSessionCookie(new URL(request.url).protocol === "https:"));
  return response;
}
