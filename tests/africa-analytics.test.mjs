import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { AFRICA_MEASUREMENT_ID, initializeAfricaAnalytics } from "../app/lib/africa-analytics.ts";

test("Africa's domain loads one standard Google tag and leaves automatic page views enabled", () => {
  const dom = new JSDOM("<!doctype html><title>Kudi Hub</title>", { url: "https://kudihub.xyz/" });
  const { window } = dom;
  try {
    initializeAfricaAnalytics(window);
    initializeAfricaAnalytics(window);
    window.history.pushState({}, "", "/journal?region=africa&page=2");
    initializeAfricaAnalytics(window);
    assert.equal(window.document.querySelectorAll("script").length, 1);
    const script = window.document.querySelector("script");
    assert.equal(script.src, `https://www.googletagmanager.com/gtag/js?id=${AFRICA_MEASUREMENT_ID}`);
    assert.equal(script.async, true);
    const commands = window.dataLayer.map(command => Array.from(command));
    assert.equal(commands.length, 2, "initialization is idempotent and navigation adds no manual page view");
    assert.equal(commands[0][0], "js");
    assert.equal(commands[1][0], "config");
    assert.equal(commands[1][1], AFRICA_MEASUREMENT_ID);
    assert.notEqual(commands[1][2].send_page_view, false);
    assert.equal(commands[1][2].allow_google_signals, false);
    assert.equal(commands[1][2].allow_ad_personalization_signals, false);
  } finally { window.close(); }
});

test("other regional domains, lookalike hosts, local and preview domains never load this tag", () => {
  for (const url of ["https://caudal.hub/", "https://slovohub.xyz/", "https://confluxhk.hk/", "https://confluxkorea.kr/", "http://localhost:3000/", "https://preview.example.com/", "https://kudihub.xyz.example.com/", "http://kudihub.xyz/", "https://kudihub.xyz:8443/"]) {
    const dom = new JSDOM("<!doctype html>", { url });
    try {
      initializeAfricaAnalytics(dom.window);
      assert.equal(dom.window.document.querySelector("script"), null, url);
      assert.equal(dom.window.dataLayer, undefined, url);
    } finally { dom.window.close(); }
  }
});
