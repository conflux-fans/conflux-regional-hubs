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

test("Every region carries its own SEO metadata", async () => {
  const { regions } = await import("../app/regional.ts");
  const { siteMetadata, regionShareImage, regionHtmlLang, deploymentRegion } = await import("../app/lib/page-metadata.ts");
  for (const [key, region] of Object.entries(regions)) {
    assert.ok(region.seo.title.toLowerCase().includes(region.wordmark.toLowerCase()), `${key} title should reference its own wordmark`);
    assert.ok(region.seo.description.length > 20, `${key} needs a description`);
  }
  assert.match(siteMetadata(regions.latam).title, /Caudal/);
  assert.doesNotMatch(siteMetadata(regions.latam).title, /Kudi/);
  assert.equal(siteMetadata(regions.africa).title, "Kudi Hub — Africa Onchain");
  assert.equal(regionShareImage(regions.latam), "/brand/caudal/logo-blue.png");
  assert.equal(regionHtmlLang(regions.latam), "es");
  assert.ok(deploymentRegion().key in regions);
});

test("Root layout metadata is derived from the deployment region", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /Kudi Hub/);
  assert.match(layout, /siteMetadata\(region\)/);
  assert.match(layout, /lang=\{regionHtmlLang\(region\)\}/);
});

test("Journal and stake routes generate region-aware metadata", async () => {
  for (const file of ["../app/journal/page.tsx", "../app/stake/page.tsx", "../app/page.tsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /export async function generateMetadata/, `${file} should generate metadata`);
    assert.match(source, /regionalMetadata\(|siteMetadata\(/, `${file} should use the regional metadata helper`);
  }
});

test("Caudal language toggle is cookie-driven and latam-guarded", async () => {
  const source = await readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  assert.match(source, /caudal-locale/);
  assert.match(source, /key === "latam"/);
  assert.match(source, /loadCaudalCopy/);
});

test("LATAM staking reuses the shared StakeClient with bilingual copy", async () => {
  const page = await readFile(new URL("../app/stake/page.tsx", import.meta.url), "utf8");
  assert.match(page, /region\.key === "latam"[\s\S]*?<StakeClient/);
  assert.match(page, /copy\.disabledTitle/);
  const client = await readFile(new URL("../app/stake/stake-client.tsx", import.meta.url), "utf8");
  assert.match(client, /locale = "en"/);
  assert.match(client, /stakeCopy\(locale\)/);
  const { stakeCopy, translateStakingMessage } = await import("../app/lib/staking/copy.ts");
  assert.equal(stakeCopy("es").position.heading, "TU POSICIÓN");
  assert.equal(stakeCopy("en").position.heading, "YOUR POSITION");
  assert.equal(translateStakingMessage("es", "Action cancelled"), "Acción cancelada");
  assert.equal(translateStakingMessage("en", "Action cancelled"), "Action cancelled");
  for (const section of Object.keys(stakeCopy("en"))) {
    assert.ok(stakeCopy("es")[section], `missing es copy section: ${section}`);
  }
});
