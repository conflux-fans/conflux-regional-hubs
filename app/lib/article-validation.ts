export type ArticleInput = {
  title: string;
  excerpt: string;
  body: string;
};

export function articleValidationError(input: ArticleInput, status: "draft" | "published") {
  if (!input.title || !input.excerpt || (status === "published" && !input.body)) {
    return status === "draft"
      ? "Add a title and summary before saving the draft."
      : "Add a title, summary, and complete article body.";
  }

  return null;
}
