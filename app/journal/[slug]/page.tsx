import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "../../lib/markdown";
import { ShareActions } from "../../components/share-actions";
import { RegionalShell } from "../../components/regional-shell";
import { getLocalArticle, getRegionalConfig } from "../../lib/content";
import { resolveRegion } from "../../regional";

export const dynamic = "force-dynamic";

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://conflux-community-hub.christian-oertel.chatgpt.site").replace(/\/$/, "");
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const region = await getRegionalConfig(resolveRegion(query.region));
  const article = await getLocalArticle(region.key, slug);
  if (!article) return { title: `Article not found — ${region.wordmark}` };
  const url = `${siteOrigin()}/journal/${encodeURIComponent(slug)}?region=${region.key}`;
  return {
    title: `${article.title} — ${region.wordmark}`,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: { title: article.title, description: article.excerpt, url, type: "article", publishedTime: new Date(article.publishedAt).toISOString(), siteName: region.wordmark },
    twitter: { card: "summary_large_image", title: article.title, description: article.excerpt },
  };
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const region = await getRegionalConfig(resolveRegion(query.region));
  const article = await getLocalArticle(region.key, slug);

  if (!article) return <RegionalShell region={region}><main className="article-page v2-wrap"><p className="v2-kicker">JOURNAL / {region.code}</p><h1>Article not found.</h1><Link href={`/insights?region=${region.key}`}>← Back to Journal</Link></main></RegionalShell>;

  const canonicalUrl = `${siteOrigin()}/journal/${encodeURIComponent(slug)}?region=${region.key}`;
  return (
    <RegionalShell region={region}>
      <article className="article-page v2-wrap">
        <header><p className="v2-kicker">{region.journalLabel} / {new Date(article.publishedAt).toLocaleDateString(region.key === "korea" ? "ko-KR" : "en-GB")}</p><h1>{article.title}</h1><p>{article.excerpt}</p></header>
        <div className="article-body"><Markdown source={article.body} /></div>
        <ShareActions title={article.title} canonicalUrl={canonicalUrl} />
        <footer><span>Published by the {region.name} regional team</span><Link href={`/insights?region=${region.key}`}>← {region.journalLabel}</Link></footer>
      </article>
    </RegionalShell>
  );
}
