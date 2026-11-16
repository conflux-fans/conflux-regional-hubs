import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AFRICA_MEASUREMENT_ID, createAfricaPageTracker } from "../app/lib/africa-analytics.ts";

function browser(url = "https://kudihub.xyz/") {
  const dom = new JSDOM("<!doctype html><title>Kudi Hub</title>", {
    url,
    referrer: "https://example.com/story?email=private@example.com#private",
  });
  return { dom, window: dom.window, track: createAfricaPageTracker(dom.window) };
}

function pageViews(window) {
  return (window.dataLayer ?? []).map(command => Array.from(command)).filter(command => command[0] === "event" && command[1] === "page_view");
}

test("Africa page views initialize one asynchronous Google tag and count each navigation once", () => {
  const { dom, window, track } = browser();
  try {
    track();
    track();
    assert.equal(window.document.querySelectorAll("script").length, 1);
    const script = window.document.querySelector("script");
    assert.equal(script.src, `https://www.googletagmanager.com/gtag/js?id=${AFRICA_MEASUREMENT_ID}`);
    assert.equal(script.async, true);
    const config = Array.from(window.dataLayer[1]);
    assert.equal(config[1], AFRICA_MEASUREMENT_ID);
    assert.equal(config[2].send_page_view, false);
    assert.equal(config[2].allow_google_signals, false);
    assert.equal(config[2].allow_ad_personalization_signals, false);
    assert.equal(pageViews(window).length, 1);

    window.history.pushState({}, "", "/journal?region=africa&page=2");
    window.document.title = "Journal | Kudi Hub";
    track();
    track();
    const views = pageViews(window);
    assert.equal(views.length, 2);
    assert.equal(views[1][2].page_location, "https://kudihub.xyz/journal?region=africa&page=2");
    assert.equal(views[1][2].page_referrer, "https://kudihub.xyz/");
    assert.equal(views[1][2].page_title, "Journal | Kudi Hub");
    assert.equal(views[1][2].send_to, AFRICA_MEASUREMENT_ID);

    window.history.pushState({}, "", "/");
    track();
    assert.equal(pageViews(window).length, 3, "returning to a previous page counts as a new visit");
  } finally { dom.window.close(); }
});

test("other regional domains, lookalike hosts, local and preview domains never load this tag", () => {
  for (const url of ["https://caudal.hub/", "https://slovohub.xyz/", "https://confluxhk.hk/", "https://confluxkorea.kr/", "http://localhost:3000/", "https://preview.example.com/", "https://kudihub.xyz.example.com/", "http://kudihub.xyz/", "https://kudihub.xyz:8443/"]) {
    const { dom, window, track } = browser(url);
    try {
      track();
      assert.equal(window.document.querySelector("script"), null, url);
      assert.equal(window.dataLayer, undefined, url);
    } finally { dom.window.close(); }
  }
});

test("other region previews on the Africa domain never load the tag", () => {
  for (const region of ["latam", "slovo", "hk", "korea"]) {
    const { dom, window, track } = browser(`https://kudihub.xyz/?region=${region}`);
    try {
      track();
      assert.equal(window.document.querySelector("script"), null, region);
      assert.equal(pageViews(window).length, 0, region);
    } finally { dom.window.close(); }
  }
});

test("switching out of Africa disables collection and returning resumes it", () => {
  const { dom, window, track } = browser();
  try {
    track();
    window.history.pushState({}, "", "/?region=latam");
    track();
    assert.equal(window["ga-disable-G-1CYWE8YPL2"], true);
    assert.equal(pageViews(window).length, 1);
    window.history.pushState({}, "", "/?region=africa");
    track();
    assert.equal(window["ga-disable-G-1CYWE8YPL2"], false);
    assert.equal(pageViews(window).length, 2);
    assert.equal(window.document.querySelectorAll("script").length, 1);
  } finally { dom.window.close(); }
});

test("private and internal routes never initialize analytics", () => {
  for (const path of ["/login", "/studio", "/studio/submissions", "/demo", "/questionnaire", "/handoff", "/caudal-handoff", "/api/auth/login", "/missing"]) {
    const { dom, window, track } = browser(`https://kudihub.xyz${path}`);
    try {
      track();
      assert.equal(window.document.querySelector("script"), null, path);
      assert.equal(pageViews(window).length, 0, path);
    } finally { dom.window.close(); }
  }
});

test("page views keep campaign attribution while stripping arbitrary query data, fragments and referrer queries", () => {
  const { dom, window, track } = browser("https://kudihub.xyz/journal/welcome?utm_source=newsletter&utm_medium=email&email=private@example.com&wallet=0x123#secret");
  try {
    track();
    const event = pageViews(window)[0][2];
    assert.equal(event.page_location, "https://kudihub.xyz/journal/welcome?utm_source=newsletter&utm_medium=email");
    assert.equal(event.page_referrer, "https://example.com/story");
    assert.equal(JSON.stringify(window.dataLayer).includes("private@example.com"), false);
    assert.equal(JSON.stringify(window.dataLayer).includes("0x123"), false);
  } finally { dom.window.close(); }
});
