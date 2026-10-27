import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("SLOVO is registered in the shared regional registry", async () => {
  const { regions, resolveRegion } = await import("../app/regional.ts");
  assert.equal(resolveRegion("slovo"), "slovo");
  assert.equal(resolveRegion("latam"), "latam");
  assert.equal(resolveRegion("africa"), "africa");
  assert.equal(regions.slovo.wordmark, "Slovo");
  assert.equal(regions.slovo.domain, "slovohub.xyz");
  assert.equal(regions.slovo.locale, "ru");
  assert.equal(regions.slovo.headline, "Слово, которое держат");
  assert.equal(regions.slovo.journalLabel, "Истории");
  assert.equal(regions.slovo.stakeLabel, "Стейкинг CFX");
  assert.equal(regions.slovo.contributors.length, 2);
  assert.equal(regions.slovo.communityLinks.length, 2);
  assert.ok(regions.slovo.communityLinks.every((link) => link.url.startsWith("https://t.me/")));
});

test("SLOVO copy carries Ukrainian as an equal language", async () => {
  const { slovoCopy } = await import("../app/slovo-copy.ts");
  assert.equal(slovoCopy["uk.headline"], "Слово, яке тримають");
  assert.equal(slovoCopy["uk.journalLabel"], "Історії");
  assert.equal(slovoCopy["uk.stakeLabel"], "Стейкінг CFX");
  for (const field of ["headline", "intro", "footerText", "communityLabel", "c1Name", "c1Full", "c2Name", "c2Full"]) {
    assert.ok(slovoCopy[`uk.${field}`], `missing uk.${field}`);
    assert.ok(slovoCopy[`ru.newsCta`]);
  }
  // Ukrainian-only letters confirm real Ukrainian copy, not transliterated Russian.
  assert.match(slovoCopy["uk.intro"], /і/);
  assert.match(slovoCopy["uk.c1Full"], /ї|є|ґ/);
});

test("SLOVO presentation stays country-neutral: no flags or country names in copy", async () => {
  const { regions } = await import("../app/regional.ts");
  const { slovoCopy } = await import("../app/slovo-copy.ts");
  const slovoValues = [
    ...Object.values(regions.slovo).flatMap((value) => (typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap((item) => Object.values(item)) : [])),
    ...Object.values(slovoCopy),
  ].join("\n");
  // Regional-indicator flag emoji pairs, and standalone country names
  // (language adjectives such as "украинском" / "українською" are allowed).
  assert.doesNotMatch(slovoValues, /[\u{1F1E6}-\u{1F1FF}]{2}/u);
  assert.doesNotMatch(slovoValues, /Россия|Россії|Украина|Україна/);
});

test("SLOVO locale switching is wired through config, shell, and fonts", async () => {
  const content = await readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  assert.match(content, /slovo-locale/);
  assert.match(content, /loadSlovoCopy/);
  const shell = await readFile(new URL("../app/components/regional-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /SlovoLocale/);
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /Literata/);
  assert.match(layout, /Manrope/);
  assert.match(layout, /JetBrains_Mono/);
  assert.match(layout, /cyrillic-ext/);
});

test("SLOVO assets and deployment registry are present", async () => {
  for (const asset of ["mark-32.png", "mark-128.png", "mark-256.png", "mark-white-256.png", "logo-og.png"]) {
    assert.ok((await readFile(new URL(`../public/brand/slovo/${asset}`, import.meta.url))).length > 100);
  }
  const mark = await readFile(new URL("../app/components/slovo-mark.tsx", import.meta.url), "utf8");
  assert.match(mark, /mark-128\.png/);
  // favicon switching must be per-request region, not deployment-wide: root layout stays global
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(!layout.includes("/brand/slovo/"));
  const meta = await readFile(new URL("../app/lib/page-metadata.ts", import.meta.url), "utf8");
  assert.match(meta, /region\.key === "slovo"[\s\S]*?mark-32\.png/);
  assert.match(meta, /icon: "\/favicon\.svg", shortcut: "\/favicon\.svg"/);
  const { deploymentRegions } = await import("../config/regions.ts");
  assert.equal(deploymentRegions.slovo.siteName, "Slovo");
  assert.equal(deploymentRegions.slovo.intendedDomain, "slovohub.xyz");
  assert.equal(deploymentRegions.slovo.defaultLocale, "ru");
});
