import Link from "next/link";
import { ArticleFeed } from "../components/article-feed";
import { RegionalShell } from "../components/regional-shell";
import { getRegionalArticles } from "../lib/articles";
import { getRegionalConfig } from "../lib/content";
import { regionalMetadata } from "../lib/page-metadata";
import { resolveRegion } from "../regional";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  return regionalMetadata(region, {
    title: `${region.journalTitle} — ${region.wordmark}`,
    description: `${region.journalLabel} from the ${region.name} regional team.`,
    path: `/journal?region=${region.key}`,
  });
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  const articles = await getRegionalArticles(region);

  return (
    <RegionalShell region={region}>
      <main className="v2-subpage v2-wrap">
        <header className="v2-subhead"><p className="v2-kicker">{region.code} / {region.journalLabel}</p><h1>{region.journalTitle}</h1><Link href={`/?region=${region.key}`}>← Home</Link></header>
        <ArticleFeed articles={articles} region={region} />
      </main>
    </RegionalShell>
  );
}
