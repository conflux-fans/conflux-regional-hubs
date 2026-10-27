import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HK is registered in the shared regional registry", async () => {
  const { regions, resolveRegion } = await import("../app/regional.ts");
  assert.equal(resolveRegion("hk"), "hk");
  assert.equal(regions.hk.wordmark, "Conflux HongKong Community");
  assert.equal(regions.hk.locale, "zh-Hant");
  assert.equal(regions.hk.accent, "#087e8b");
  assert.equal(regions.hk.secondary, "#b8f2e6");
  assert.equal(regions.hk.tertiary, "#ff9f68");
  assert.equal(regions.hk.surface, "#eef7f4");
  assert.equal(regions.hk.contributors.length, 0);
  assert.equal(regions.hk.communityLinks.length, 0);
  // The wordmark spelling is contractual: always "HongKong" as one word.
  assert.ok(Object.values(regions.hk).join(" ").includes("Conflux HongKong Community"));
});

test("HK uses the shared generic v2 home: no presentation branch was added for it", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(!page.includes('"hk"'));
  const { regions } = await import("../app/regional.ts");
  assert.equal(regions.hk.layout, "editorial");
});

test("HK metadata, favicon, share image, and studio prompt are wired", async () => {
  const { regionShareImage, regionHtmlLang } = await import("../app/lib/page-metadata.ts");
  const { regions } = await import("../app/regional.ts");
  assert.equal(regionShareImage(regions.hk), "/brand/hk/hk-logo-og.png");
  assert.equal(regionHtmlLang(regions.hk), "zh-Hant");
  const meta = await readFile(new URL("../app/lib/page-metadata.ts", import.meta.url), "utf8");
  assert.match(meta, /region\.key === "hk"[\s\S]*?hk-mark-180\.png/);
  const studio = await readFile(new URL("../app/api/studio/route.ts", import.meta.url), "utf8");
  assert.match(studio, /region === "hk" \? "Hong Kong"/);
  for (const asset of ["hk-symbol.svg", "hk-horizontal-light.svg", "hk-horizontal-dark.svg", "hk-mark-32.png", "hk-mark-180.png", "hk-logo-og.png", "hk-symbol-1024.png", "hk-symbol-512.png"]) {
    assert.ok((await readFile(new URL(`../public/brand/hk/${asset}`, import.meta.url))).length > 100, `missing ${asset}`);
  }
  const { deploymentRegions } = await import("../config/regions.ts");
  assert.equal(deploymentRegions.hk.siteName, "Conflux HongKong Community");
  assert.equal(deploymentRegions.hk.defaultLocale, "zh-Hant");
});

test("HK does not inherit Korea-only decorations", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const seoul = css.split("\n").find((line) => line.includes("서울"));
  assert.ok(seoul && seoul.trim().startsWith(".region-korea"), "the Seoul stamp must stay scoped to .region-korea");
});

test("HK stays isolated: africa, latam, and slovo configs are untouched", async () => {
  const { regions, resolveRegion } = await import("../app/regional.ts");
  assert.equal(resolveRegion("africa"), "africa");
  assert.equal(resolveRegion("latam"), "latam");
  assert.equal(resolveRegion("slovo"), "slovo");
  assert.equal(resolveRegion("nonsense"), "africa");
  assert.equal(regions.africa.wordmark, "Kudi Hub");
  assert.equal(regions.africa.accent, "#3558ff");
  assert.equal(regions.latam.wordmark, "Caudal");
  assert.equal(regions.latam.headline, "Tu punto de encuentro con Conflux en Latinoamérica.");
  assert.equal(regions.latam.contributors.length, 2);
  assert.equal(regions.slovo.contributors.length, 2);
  assert.equal(regions.slovo.contributors[0].role, "Руководитель сообщества Conflux");
});
