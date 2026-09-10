import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

function luminance(color) {
  const channels = color.match(/\d+/g).slice(0, 3).map((value) => Number(value) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const foregroundChannels = foreground.match(/[\d.]+/g).map(Number);
  const backgroundChannels = background.match(/[\d.]+/g).map(Number);
  const alpha = foregroundChannels[3] ?? 1;
  const composited = `rgb(${foregroundChannels.slice(0, 3).map((channel, index) => Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha))).join(", ")})`;
  const values = [luminance(composited), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertMinimumContrast(window, elements, background, minimum, message) {
  for (const element of elements) {
    assert.ok(contrastRatio(window.getComputedStyle(element).color, background) >= minimum, message);
  }
}

async function styledDocument(markup) {
  const source = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const css = source
    .replace(/^@import[^;]+;/gm, "")
    .replaceAll(":hover", ".is-hovered")
    .replaceAll("var(--region-accent)", "#3558ff")
    .replaceAll("var(--region-secondary)", "#c9ff63")
    .replaceAll("var(--region-on-accent)", "#ffffff")
    .replaceAll("var(--ink)", "#111617")
    .replaceAll("var(--white)", "#fffef8")
    .replaceAll("var(--paper)", "#f3f1e9");
  return new JSDOM(`<!doctype html><style>${css}</style>${markup}`).window.document;
}

test("the Journal publish button text remains readable when hovered", async () => {
  const document = await styledDocument(`<main class="studio-page region-africa"><div class="journal-editor-actions"><button class="v2-button v2-button-accent is-hovered">Publish to Crypto news</button></div></main>`);
  const style = document.defaultView.getComputedStyle(document.querySelector("button"));

  assert.ok(contrastRatio(style.color, style.backgroundColor) >= 4.5, `Unreadable hover colors: ${style.color} on ${style.backgroundColor}`);
});

test("homepage Journal cards use compact titles and prominent metadata", async () => {
  const document = await styledDocument(`<main class="region-africa"><section class="pupu-journal"><div class="feed-grid"><a class="feed-card feed-card-featured"><span>10 SEP 2026</span><h3>Featured article</h3><p>Featured summary</p></a><a class="feed-card"><span>09 SEP 2026</span><h3>Standard article</h3><p>Standard summary</p></a></div></section></main>`);
  const window = document.defaultView;
  const featuredCard = document.querySelector(".feed-card-featured");
  const standardCard = document.querySelector(".feed-card:not(.feed-card-featured)");
  const featuredBackground = window.getComputedStyle(featuredCard).backgroundColor;
  const standardBackground = window.getComputedStyle(standardCard).backgroundColor;
  const featuredMetadata = [featuredCard.querySelector("span"), featuredCard.querySelector("p")];

  assert.ok(parseFloat(window.getComputedStyle(featuredCard.querySelector("h3")).fontSize) <= 42, "Featured article title is too large");
  assert.ok(parseFloat(window.getComputedStyle(standardCard.querySelector("h3")).fontSize) <= 26, "Standard article title is too large");
  for (const element of featuredMetadata) {
    assert.equal(window.getComputedStyle(element).color, "rgb(233, 237, 255)", "Featured article metadata should be light gray on blue");
  }
  assertMinimumContrast(window, featuredMetadata, featuredBackground, 4.5, "Featured article metadata is too faint");
  assertMinimumContrast(window, [standardCard.querySelector("span"), standardCard.querySelector("p")], standardBackground, 7, "Standard article metadata is too faint");
});
