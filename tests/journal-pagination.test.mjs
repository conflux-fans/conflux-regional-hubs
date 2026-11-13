import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("journalPagination clamps ?page= into range and slices one page", async () => {
  const { journalPagination, JOURNAL_PAGE_SIZE } = await import("../app/lib/articles.ts");
  const items = Array.from({ length: 25 }, (_, index) => index);
  assert.equal(JOURNAL_PAGE_SIZE, 9);

  assert.deepEqual(journalPagination(items, undefined), { page: 1, pageCount: 3, articles: items.slice(0, 9) });
  assert.deepEqual(journalPagination(items, "2"), { page: 2, pageCount: 3, articles: items.slice(9, 18) });
  assert.deepEqual(journalPagination(items, ["3"]), { page: 3, pageCount: 3, articles: items.slice(18) });

  // Out-of-range and garbage input falls back to a valid page, never an empty or negative slice.
  assert.equal(journalPagination(items, "99").page, 3);
  assert.equal(journalPagination(items, "0").page, 1);
  assert.equal(journalPagination(items, "-4").page, 1);
  assert.equal(journalPagination(items, "nonsense").page, 1);
  assert.equal(journalPagination(items, undefined).articles.length, 9);

  // Regions with fewer articles than one page still render page 1 of 1 with everything.
  assert.deepEqual(journalPagination([1, 2], undefined), { page: 1, pageCount: 1, articles: [1, 2] });
  assert.deepEqual(journalPagination([], undefined), { page: 1, pageCount: 1, articles: [] });
});

test("pageNumbers lists all pages while few, otherwise windows around the current page", async () => {
  const { pageNumbers } = await import("../app/lib/articles.ts");
  assert.deepEqual(pageNumbers(1, 1), [1]);
  assert.deepEqual(pageNumbers(2, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pageNumbers(5, 12), [1, "gap", 4, 5, 6, "gap", 12]);
  assert.deepEqual(pageNumbers(1, 12), [1, 2, "gap", 12]);
  assert.deepEqual(pageNumbers(12, 12), [1, "gap", 11, 12]);
});

test("journal route pages the feed and only shows the pager when there is more than one page", async () => {
  const page = await readFile(new URL("../app/journal/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("journalPagination("), "journal page must paginate the fetched articles");
  assert.match(page, /pageCount > 1 &&/, "pager must stay hidden for single-page regions");
  assert.match(page, /rawPage >= 2 \? `&page=\$\{rawPage\}` : ""/, "canonical URL must carry the page number from page 2 on");

  const feed = await readFile(new URL("../app/components/article-feed.tsx", import.meta.url), "utf8");
  assert.ok(feed.includes("ArticlePager"));
  assert.match(feed, /\/journal\?region=\$\{region\.key\}/, "pager links must preserve the region param");
});

test("home pages keep their fixed article preview count instead of the full feed", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /getRegionalArticles\(region, 6\)/);
  assert.ok(!page.includes("journalPagination"), "home must not paginate");
});
