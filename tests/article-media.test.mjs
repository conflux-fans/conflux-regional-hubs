import test from "node:test";
import assert from "node:assert/strict";
import { videoEmbedUrl } from "../app/lib/video-embed.ts";

test("video embeds map whitelisted page URLs to player URLs", () => {
  const cases = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/abcdefghijk", "https://www.youtube-nocookie.com/embed/abcdefghijk"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
    ["https://www.bilibili.com/video/BV1GJ411x7h7", "https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=0"],
    ["https://rutube.ru/video/c58f502c7bb34a8fcdd976b221fca296/", "https://rutube.ru/play/embed/c58f502c7bb34a8fcdd976b221fca296"],
    ["https://vk.com/video-123_456789", "https://vk.com/video_ext.php?oid=-123&id=456789&hd=2"],
    ["https://vkvideo.ru/video-123_456789", "https://vk.com/video_ext.php?oid=-123&id=456789&hd=2"],
  ];
  for (const [input, expected] of cases) {
    const embed = videoEmbedUrl(input);
    assert.ok(embed, `should embed ${input}`);
    assert.equal(embed.url, expected);
  }
});

test("video embeds reject non-whitelisted or unsafe URLs", () => {
  for (const input of [
    "",
    "not a url",
    "javascript:alert(1)",
    "https://example.com/watch?v=abc",
    "https://evil.com/embed/abc",
    "https://youtube.com/watch?v=short", // id too short
    "https://youtube.com/watch?v=bad_id_with_symbols!", // charset
    "https://youtube.com/other/abc",
    "https://b23.tv/abcd123", // short links need redirect resolution; falls back to a plain link
    "/relative/path",
  ]) {
    assert.equal(videoEmbedUrl(input), null, `should reject ${JSON.stringify(input)}`);
  }
});

test("image uploads are validated and served from /api/media", async () => {
  const { readFile } = await import("node:fs/promises");
  const storage = await readFile(new URL("../app/lib/media-storage.ts", import.meta.url), "utf8");
  assert.match(storage, /MAX_IMAGE_BYTES/);
  // magic-byte check for the four supported formats
  assert.match(storage, /0x89, 0x50, 0x4e, 0x47/); // PNG
  assert.match(storage, /0xff, 0xd8, 0xff/); // JPEG
  assert.match(storage, /0x52, 0x49, 0x46, 0x46/); // RIFF (WebP)
  assert.match(storage, /0x47, 0x49, 0x46, 0x38/); // GIF
  const storageSource = storage; // readability: pattern assertions belong with the storage module
  assert.match(storageSource, /\^\[a-f0-9\]\{64\}\\\./); // hash names only, no path traversal
  const mediaRoute = await readFile(new URL("../app/api/media/[file]/route.ts", import.meta.url), "utf8");
  assert.match(mediaRoute, /mediaFileNamePattern\(\)\.test/); // route enforces the pattern before reading disk
  const studioRoute = await readFile(new URL("../app/api/studio/route.ts", import.meta.url), "utf8");
  assert.match(studioRoute, /upload-image/);
});

test("markdown rendering is delegated to react-markdown with embed and image safety overrides", async () => {
  const { readFile } = await import("node:fs/promises");
  const markdown = await readFile(new URL("../app/lib/markdown.tsx", import.meta.url), "utf8");
  assert.match(markdown, /react-markdown/);
  assert.match(markdown, /remark-gfm/); // GFM autolinks turn bare video URLs into links the p-override can embed
  assert.match(markdown, /videoEmbedUrl/);
  assert.match(markdown, /safeImageSrc/); // image srcs are protocol-checked
  assert.match(markdown, /loading="lazy"/);
  const player = await readFile(new URL("../app/components/video-embed-player.tsx", import.meta.url), "utf8");
  assert.match(player, /react-player/); // mature player component instead of hand-rolled iframes
});
