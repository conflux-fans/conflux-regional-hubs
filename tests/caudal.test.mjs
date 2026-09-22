import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("LATAM is isolated in the shared regional registry", async () => {
  const { regions, resolveRegion } = await import("../app/regional.ts");
  assert.equal(resolveRegion("latam"), "latam");
  assert.equal(resolveRegion("africa"), "africa");
  assert.equal(regions.latam.wordmark, "Caudal");
  assert.equal(regions.latam.headline, "Conflux para Latinoamérica.");
  assert.equal(regions.latam.contributors.length, 2);
  assert.equal(regions.africa.wordmark, "Kudi Hub");
});

test("Caudal assets and handoff are present", async () => {
  for (const asset of ["logo-1.svg", "logo-2.svg", "logo-3.svg", "hero-reference.png", "moodboard.png", "logo-blue.png", "logo-alternate.png"]) {
    assert.ok((await readFile(new URL(`../public/brand/caudal/${asset}`, import.meta.url))).length > 100);
  }
  assert.match(await readFile(new URL("../app/caudal-handoff/page.tsx", import.meta.url), "utf8"), /Production connections/);
});

test("LATAM module defaults exclude events and newsletter and preserve social connection boundaries", async () => {
  const { regions } = await import("../app/regional.ts");
  const source = await readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  assert.match(source, /https:\/\/x\.com\/conflux_espanol/);
  assert.match(source, /key !== "latam" \|\| !\["events", "newsletter"\]/);
  assert.match(regions.latam.communityLinks[0].url, /Conflux_LATAM/);
});

test("Caudal language toggle is cookie-driven and latam-guarded", async () => {
  const source = await readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  assert.match(source, /caudal-locale/);
  assert.match(source, /key === "latam"/);
  assert.match(source, /loadCaudalCopy/);
});
