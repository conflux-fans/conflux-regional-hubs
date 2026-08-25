import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { markdownToHtml, safeExternalUrl, slugify, suggestedSlug } from "../lib/markdown.ts";
import { shareUrls } from "../lib/share.ts";
import { canonicalArticleUrl, articlePath, siteBaseUrl } from "../lib/site-url.ts";
import { normalizeInstagram, normalizeX, normalizeYouTube } from "../lib/social.ts";

test("Markdown renders headings, emphasis, lists, quotes and safe links", () => {
  const html = markdownToHtml(
    "# Title\n\n## Heading\n\n**Bold** and _italic_ and [Docs](https://example.com/guide)\n\n- One\n- Two\n\n> Quoted",
  );
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<blockquote>Quoted<\/blockquote>/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test("unsafe HTML and URL protocols are blocked", () => {
  const html = markdownToHtml("<script>x</script> [bad](javascript:x)");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(safeExternalUrl("javascript:x"), null);
  assert.equal(safeExternalUrl("data:text/html,bad"), null);
});

test("full article titles produce stable slugs", () => {
  assert.equal(slugify("Shanghai: Builders & Markets!"), "shanghai-builders-markets");
  assert.equal(
    suggestedSlug("A complete article title", "a", false),
    "a-complete-article-title",
  );
  assert.equal(suggestedSlug("Changed title", "custom-url", true), "custom-url");
});

test("canonical article URLs use the configured production origin", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://hub.example/";
  assert.equal(siteBaseUrl(), "https://hub.example");
  assert.equal(articlePath("hello world"), "/journal/hello%20world");
  assert.equal(canonicalArticleUrl("hello"), "https://hub.example/journal/hello");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous;
});

test("share URLs contain the exact encoded article URL and title", () => {
  const links = shareUrls("https://hub.example/journal/story?a=1", "A title & more");
  assert.equal(new URL(links.x).searchParams.get("url"), "https://hub.example/journal/story?a=1");
  assert.equal(new URL(links.x).searchParams.get("text"), "A title & more");
  assert.equal(new URL(links.telegram).searchParams.get("url"), "https://hub.example/journal/story?a=1");
  assert.equal(new URL(links.telegram).searchParams.get("text"), "A title & more");
  assert.equal(links.discord, "https://discord.com/channels/@me");
});

test("article share controls stay in one horizontal row", async () => {
  const [css, component] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/journal/[slug]/share-buttons.tsx", import.meta.url), "utf8"),
  ]);
  const row = css.match(/\.share-row\{([^}]*)\}/)?.[1] ?? "";
  const items = css.match(/\.share-row>\*\{([^}]*)\}/)?.[1] ?? "";
  const controls = css.match(/\.share-row a,\.share-row button\{([^}]*)\}/)?.[1] ?? "";

  assert.match(row, /align-items:center/);
  assert.match(row, /flex-wrap:nowrap/);
  assert.match(row, /overflow-x:auto/);
  assert.match(items, /flex:0 0 auto/);
  assert.match(items, /white-space:nowrap/);
  assert.match(controls, /min-height:44px/);
  assert.doesNotMatch(controls, /outline:(?:0|none)/);
  assert.match(component, /className="share-row"/);
  for (const label of ["Share", "X ↗", "Telegram ↗", "Discord ↗", "Copy link"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /Link copied — open Discord ↗/);
});

test("manager Journal exposes an authenticated article list and edit workflow", async () => {
  const [editor, collectionRoute, articleRoute, storage] = await Promise.all([
    readFile(new URL("../app/manager/journal-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/[slug]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/posts.server.ts", import.meta.url), "utf8"),
  ]);

  assert.match(editor, /includeDrafts=1/);
  assert.match(editor, /New article/);
  assert.match(editor, /Edit article/);
  assert.match(editor, /Back to articles/);
  assert.match(editor, /Unpublish article/);
  assert.match(editor, /Update article/);
  assert.match(editor, /method:\s*existingSlug\s*\?\s*"PUT"\s*:\s*"POST"/);
  assert.match(collectionRoute, /includeDrafts/);
  assert.match(articleRoute, /export async function PUT/);
  assert.match(articleRoute, /canManage/);
  assert.match(articleRoute, /updatePost/);
  assert.match(storage, /export async function updatePost/);
  assert.match(storage, /WHERE region_slug = \? AND slug = \?/);
});

test("Instagram, X and YouTube payloads normalize into clickable cards", () => {
  const instagram = normalizeInstagram({
    data: [{
      id: "i1",
      caption: "Shanghai update",
      permalink: "https://instagram.com/p/i1",
      timestamp: "2026-08-18T10:00:00Z",
      media_url: "https://cdn.example/i1.jpg",
    }],
  });
  const x = normalizeX(
    { data: [{ id: "x1", text: "Builder update", created_at: "2026-08-18T11:00:00Z" }] },
    "https://x.com/example/",
  );
  const youtube = normalizeYouTube({
    items: [{
      id: { videoId: "y1" },
      snippet: {
        title: "Community video",
        publishedAt: "2026-08-18T12:00:00Z",
        thumbnails: { medium: { url: "https://cdn.example/y1.jpg" } },
      },
    }],
  });
  assert.equal(instagram[0].url, "https://instagram.com/p/i1");
  assert.equal(x[0].url, "https://x.com/example/status/x1");
  assert.equal(youtube[0].url, "https://www.youtube.com/watch?v=y1");
  assert.equal(youtube[0].thumbnail, "https://cdn.example/y1.jpg");
});
