import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { newRegionTemplate } from "../config/region-template.ts";
import { regions } from "../config/regions.ts";

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) => channel(Number.parseInt(value.slice(offset, offset + 2), 16)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first, second) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

test("every registered region has readable semantic color pairs", () => {
  for (const region of Object.values(regions)) {
    const pairs = [
      ["main", region.theme.background, region.theme.text],
      ["main muted", region.theme.background, region.theme.muted],
      ["surface", region.theme.surface, region.theme.surfaceText],
      ["surface muted", region.theme.surface, region.theme.surfaceMuted],
      ["primary action", region.theme.primary, region.theme.primaryText],
      ["secondary", region.theme.secondary, region.theme.secondaryText],
      ["accent", region.theme.accent, region.theme.accentText],
      ["dark", region.theme.dark, region.theme.darkText],
      ["dark muted", region.theme.dark, region.theme.darkMuted],
    ];
    for (const [label, background, foreground] of pairs) {
      assert.ok(
        contrast(background, foreground) >= 4.5,
        `${region.slug} ${label} pair must meet WCAG AA`,
      );
    }
  }
});

test("regional presentations own their composition and do not duplicate sections", () => {
  for (const region of Object.values(regions)) {
    const sections = region.presentation.home.sectionOrder;
    assert.equal(new Set(sections).size, sections.length, `${region.slug} repeats a homepage section`);
    assert.ok(region.presentation.hero.visualLabel !== undefined);
  }
  assert.notDeepEqual(regions.china.presentation.home, regions.africa.presentation.home);
  assert.notEqual(regions.china.presentation.hero.visual, regions.africa.presentation.hero.visual);
});

test("stake page headings omit trailing punctuation", () => {
  for (const region of Object.values(regions)) {
    assert.equal(region.stake.headline, "Stake CFX");
  }
  assert.equal(newRegionTemplate.stake.headline, "Stake CFX");
});

test("shared homepage renderers contain no example-locality copy", async () => {
  const sharedFiles = [
    "app/page.tsx",
    "app/home-sections.tsx",
    "app/site-components.tsx",
    "app/social-feed.tsx",
  ];
  const contents = await Promise.all(
    sharedFiles.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")),
  );
  for (const [index, source] of contents.entries()) {
    assert.doesNotMatch(source, /Shanghai|Kudi|上海|Africa/i, `${sharedFiles[index]} contains regional copy`);
  }
});

test("the new-region schema example is visually neutral", async () => {
  const source = await readFile(new URL("../config/region-template.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Shanghai|Kudi|上海|skyline/i);
  assert.match(source, /do not use this object as a visual design/i);
});
