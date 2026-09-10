import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

function luminance(color) {
  const channels = color.match(/\d+/g).slice(0, 3).map((value) => Number(value) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("the Journal publish button text remains readable when hovered", async () => {
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
  const document = new JSDOM(`<!doctype html><style>${css}</style><main class="studio-page region-africa"><div class="journal-editor-actions"><button class="v2-button v2-button-accent is-hovered">Publish to Crypto news</button></div></main>`).window.document;
  const style = document.defaultView.getComputedStyle(document.querySelector("button"));

  assert.ok(contrastRatio(style.color, style.backgroundColor) >= 4.5, `Unreadable hover colors: ${style.color} on ${style.backgroundColor}`);
});
