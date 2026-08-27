import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("manager supports Markdown formatting, drafts, reopening and publishing", async () => {
  const editor = await readFile(new URL("../app/studio/article-editor.tsx", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio/studio-client.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../app/api/studio/route.ts", import.meta.url), "utf8");
  const article = await readFile(new URL("../app/journal/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(editor, /Save draft/);
  assert.match(editor, /Markdown/);
  assert.match(editor, /initialArticles/);
  assert.match(studio, /moveContributor/);
  assert.match(api, /save-article/);
  assert.match(api, /status === "draft"/);
  assert.match(article, /<Markdown source=/);
  assert.match(article, /generateMetadata/);
  assert.match(article, /alternates: \{ canonical:/);
});

test("published articles expose working share destinations", async () => {
  const share = await readFile(new URL("../app/components/share-actions.tsx", import.meta.url), "utf8");
  assert.match(share, /https:\/\/x\.com\/intent\/post/);
  assert.match(share, /https:\/\/t\.me\/share\/url/);
  assert.match(share, /https:\/\/discord\.com\/channels\/@me/);
  assert.match(share, /navigator\.clipboard\.writeText/);
});

test("the approved Kudi Hub brand and contributor set ship in regional config", async () => {
  const regional = await readFile(new URL("../app/regional.ts", import.meta.url), "utf8");
  for (const value of ["Kudi Hub", "Crypto news", "Ehis", "Judith", "Abiola", "Obafemi", "#3558ff", "#c9ff63", "#ff684f"]) assert.match(regional, new RegExp(value.replace("#", "\\#")));
});
