import assert from "node:assert/strict";
import test from "node:test";

test("renders site-specific social metadata without development markers", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview/i);
  assert.match(html, /og:image/i);
  assert.match(html, /\/og\.png/i);
});

test("keeps the developer handoff page out of public navigation", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("handoff-navigation-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  };

  const homeResponse = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    environment,
    context,
  );
  assert.equal(homeResponse.status, 200);
  assert.doesNotMatch(await homeResponse.text(), /href="\/handoff"/i);

  const handoffResponse = await worker.fetch(
    new Request("http://localhost/handoff", { headers: { accept: "text/html" } }),
    environment,
    context,
  );
  assert.equal(handoffResponse.status, 200);
  assert.match(await handoffResponse.text(), /DEVELOPER HANDOFF/);
});

test("manager signs in with an approved email and password session", async (testContext) => {
  process.env.MANAGER_CREDENTIALS = JSON.stringify({
    "admin@example.com": "test-manager-password",
  });
  process.env.MANAGER_SESSION_SECRET = "test-manager-session-signing-secret";
  testContext.after(() => {
    delete process.env.MANAGER_CREDENTIALS;
    delete process.env.MANAGER_SESSION_SECRET;
  });
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("manager-auth-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = {
    MANAGER_CREDENTIALS: JSON.stringify({
      "admin@example.com": "test-manager-password",
    }),
    MANAGER_SESSION_SECRET: "test-manager-session-signing-secret",
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  };

  const anonymousResponse = await worker.fetch(
    new Request("http://localhost/manager", { headers: { accept: "text/html" } }),
    environment,
    context,
  );
  assert.equal(anonymousResponse.status, 307);
  assert.equal(
    new URL(anonymousResponse.headers.get("location")).pathname,
    "/manager/login",
  );

  const loginPage = await worker.fetch(
    new Request("http://localhost/manager/login", { headers: { accept: "text/html" } }),
    environment,
    context,
  );
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /Administrator email/);

  const loginResponse = await worker.fetch(
    new Request("http://localhost/api/manager/session", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "http://localhost",
      },
      body: new URLSearchParams({
        action: "login",
        email: "admin@example.com",
        password: "test-manager-password",
        return_to: "/manager",
      }),
    }),
    environment,
    context,
  );
  assert.equal(loginResponse.status, 303);
  assert.equal(new URL(loginResponse.headers.get("location")).pathname, "/manager");
  const sessionCookie = loginResponse.headers.get("set-cookie");
  assert.match(sessionCookie ?? "", /manager_session=/);
  assert.match(sessionCookie ?? "", /HttpOnly/i);
  assert.match(sessionCookie ?? "", /SameSite=Lax/i);

  const managerResponse = await worker.fetch(
    new Request("http://localhost/manager", {
      headers: {
        accept: "text/html",
        cookie: sessionCookie.split(";", 1)[0],
      },
    }),
    environment,
    context,
  );
  assert.equal(managerResponse.status, 200);
  assert.match(await managerResponse.text(), /admin@example\.com/);

});
