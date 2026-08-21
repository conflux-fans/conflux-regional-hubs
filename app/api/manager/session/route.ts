import { NextResponse } from "next/server";
import {
  authenticateManager,
  issueManagerSession,
  MANAGER_SESSION_COOKIE,
} from "../../../../lib/auth.server";
import {
  MANAGER_SESSION_MAX_AGE_SECONDS,
  safeManagerReturnPath,
} from "../../../../lib/manager-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin manager requests are not allowed." }, { status: 403 });
  }

  const form = await request.formData();
  const action = formValue(form, "action");
  const returnTo = safeManagerReturnPath(formValue(form, "return_to") || "/manager");

  if (action === "logout") {
    const response = NextResponse.redirect(new URL("/", request.url), 303);
    response.cookies.set(MANAGER_SESSION_COOKIE, "", {
      ...managerCookiePolicy(),
      maxAge: 0,
    });
    return response;
  }

  const email = await authenticateManager(
    formValue(form, "email"),
    formValue(form, "password"),
  );
  if (!email) {
    const loginUrl = new URL("/manager/login", request.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("return_to", returnTo);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(MANAGER_SESSION_COOKIE, await issueManagerSession(email), {
    ...managerCookiePolicy(),
    maxAge: MANAGER_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

function formValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function managerCookiePolicy() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
