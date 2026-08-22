import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { region } from "../../../config/regions";
import { markdownToHtml } from "../../../lib/markdown";
import { getPost } from "../../../lib/posts.server";
import { articlePath, canonicalArticleUrl } from "../../../lib/site-url";
import { Footer, Header } from "../../site-components";
import { ShareButtons } from "./share-buttons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const url = canonicalArticleUrl(post.slug);
  return {
    title: `${post.title} | ${region.siteName}`,
    description: post.excerpt,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: url || undefined,
      type: "article",
      images: [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [],
    },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") notFound();

  return (
    <main>
      <Header />
      <article className="article-page">
        <header>
          <p className="story-meta">
            {post.tag} ·{" "}
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString("en", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Draft"}
          </p>
          <h1>{post.title}</h1>
          <p className="article-deck">{post.excerpt}</p>
          <p className="article-author">By {post.author}</p>
          <ShareButtons
            title={post.title}
            articlePath={articlePath(post.slug)}
            canonicalUrl={canonicalArticleUrl(post.slug)}
          />
        </header>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(post.body) }}
        />
      </article>
      <Footer />
    </main>
  );
}
