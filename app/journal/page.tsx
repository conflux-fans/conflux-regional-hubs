import Link from "next/link";
import { ArticleFeed, ArticlePager } from "../components/article-feed";
import { RegionalShell } from "../components/regional-shell";
import { getRegionalArticles, journalPagination } from "../lib/articles";
import { getRegionalConfig } from "../lib/content";
import { regionalMetadata } from "../lib/page-metadata";
import { resolveRegion } from "../regional";

export const dynamic = "force-dynamic";

function requestedPageValue(params: Record<string, string | string[] | undefined>) {
  const raw = Number.parseInt(Array.isArray(params.page) ? params.page[0] ?? "" : params.page ?? "", 10);
  return Number.isNaN(raw) ? 1 : raw;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  const rawPage = requestedPageValue(params);
  return regionalMetadata(region, {
    title: `${region.journalTitle} — ${region.wordmark}`,
    description: `${region.journalLabel} from the ${region.name} regional team.`,
    path: `/journal?region=${region.key}${rawPage >= 2 ? `&page=${rawPage}` : ""}`,
  });
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  const { page, pageCount, articles } = journalPagination(await getRegionalArticles(region), params.page);

  return (
    <RegionalShell region={region}>
      <main className="v2-subpage v2-wrap">
        <header className="v2-subhead"><p className="v2-kicker">{region.code} / {region.journalLabel}</p><h1>{region.journalTitle}</h1><Link href={`/?region=${region.key}`}>← Home</Link></header>
        <ArticleFeed articles={articles} region={region} />
        {pageCount > 1 && <ArticlePager region={region} page={page} pageCount={pageCount} />}
      </main>
    </RegionalShell>
  );
}
