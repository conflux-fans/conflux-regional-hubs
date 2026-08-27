import Link from "next/link";
import { getRegionalConfig, getRegionalContent, getRegionalContributors, getRegionalModules } from "../lib/content";
import { resolveRegion } from "../regional";
import { StudioClient } from "../studio/studio-client";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const regionKey = resolveRegion(params.region);
  const region = await getRegionalConfig(regionKey);
  const [content, modules, contributors] = await Promise.all([getRegionalContent(regionKey), getRegionalModules(regionKey), getRegionalContributors(regionKey)]);

  return <main className={`studio-page region-${region.key}`} style={{ "--region-accent": region.accent, "--region-secondary": region.secondary, "--region-tertiary": region.tertiary, "--region-on-accent": region.onAccent, "--region-surface": region.surface } as React.CSSProperties}>
    <header className="studio-header"><div><p className="v2-kicker">PUBLIC REGIONAL WEBSITE CREATOR</p><h1>Design your<br />regional hub.</h1><p>Complete and submit the questionnaire. The hub coordinator will review the saved prompt and forward it to the developer.</p></div><nav><Link href={`/?region=${region.key}`}>View Kudihub reference ↗</Link><Link href={`/questionnaire?region=${region.key === "africa" ? "korea" : "africa"}`}>Switch example</Link><Link href="/demo">Try manager demo</Link></nav></header>
    <section className="studio-scope"><span>STEP 01</span><strong>Regional lead submits the questionnaire</strong><span>STEP 02</span><strong>Coordinator reviews and forwards the saved developer prompt</strong></section>
    <StudioClient region={region} initialContent={content} initialModules={modules} initialContributors={contributors} setupOnly />
  </main>;
}
