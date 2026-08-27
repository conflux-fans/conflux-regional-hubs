import assert from "node:assert/strict";
import test from "node:test";
import { parseInstagramFeed, parseXFeed, parseYouTubeFeed, socialProfileUrl } from "../app/lib/social.ts";

test("normalizes the supplied Instagram and X profiles", () => {
  assert.equal(socialProfileUrl("instagram", "@confluxnetwork"), "https://www.instagram.com/confluxnetwork/");
  assert.equal(socialProfileUrl("twitter", "https://x.com/confluxafrica?s=11"), "https://x.com/confluxafrica?s=11");
});

test("parses the official YouTube Atom feed", () => {
  const items = parseYouTubeFeed(`<feed><entry><yt:videoId>abc123</yt:videoId><title>Conflux Africa update</title><published>2026-08-27T00:00:00Z</published></entry></feed>`);
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://www.youtube.com/watch?v=abc123");
  assert.match(items[0].imageUrl, /abc123/);
});

test("parses official X and Instagram API responses", () => {
  const x = parseXFeed({ data: [{ id: "42", text: "Kudi Hub is live", created_at: "2026-08-27T00:00:00Z" }] }, "confluxafrica");
  const instagram = parseInstagramFeed({ data: [{ id: "84", caption: "Builder update", permalink: "https://www.instagram.com/p/example/", media_url: "https://images.example/post.jpg" }] });
  assert.equal(x[0].url, "https://x.com/confluxafrica/status/42");
  assert.equal(instagram[0].title, "Builder update");
  assert.equal(instagram[0].url, "https://www.instagram.com/p/example/");
});
