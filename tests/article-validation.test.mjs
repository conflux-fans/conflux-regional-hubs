import assert from "node:assert/strict";
import test from "node:test";
import { articleValidationError } from "../app/lib/article-validation.ts";

test("a filled title, summary, and article body can be published", () => {
  const error = articleValidationError({
    title: "Community update",
    excerpt: "A short summary",
    body: "Article body.",
  }, "published");

  assert.equal(error, null);
});

test("publishing still requires a non-empty article body", () => {
  const error = articleValidationError({
    title: "Community update",
    excerpt: "A short summary",
    body: "",
  }, "published");

  assert.equal(error, "Add a title, summary, and complete article body.");
});
