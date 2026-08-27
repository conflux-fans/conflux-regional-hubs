import Link from "next/link";
import { EditorLoginScreen } from "../components/editor-login-screen";
import { SignOutButton } from "../components/sign-out-button";
import { getAuthorizedEditor } from "../lib/editor-auth";
import { getManagedArticles, getRegionalConfig, getRegionalContent, getRegionalContributors, getRegionalModules } from "../lib/content";
import { resolveRegion, type RegionKey } from "../regional";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

async function ProtectedStudio({ regionKey }: { regionKey: RegionKey }) {
  const returnTo = `/studio?region=${regionKey}`;
  const user = await getAuthorizedEditor();
  if (!user) return <EditorLoginScreen returnTo={returnTo} />;
  const region = await getRegionalConfig(regionKey);
  const [content, modules, contributors, articles] = await Promise.all([getRegionalContent(regionKey), getRegionalModules(regionKey), getRegionalContributors(regionKey), getManagedArticles(regionKey)]);

  return (
    <main className={`studio-page region-${region.key}`} style={{ "--region-accent": region.accent, "--region-secondary": region.secondary, "--region-tertiary": region.tertiary, "--region-on-accent": region.onAccent, "--region-surface": region.surface } as React.CSSProperties}>
      <header className="studio-header"><div><p className="v2-kicker">REGIONAL WEBSITE STUDIO / {region.code}</p><h1>Create once.<br />Manage easily.</h1><p>Signed in as {user.displayName}</p></div><nav><Link href="/studio/submissions">Questionnaire submissions</Link><Link href={`/?region=${region.key}`}>View current website ↗</Link><Link href={`/studio?region=${region.key === "africa" ? "korea" : "africa"}`}>Switch region</Link><SignOutButton /></nav></header>
      <section className="studio-scope"><span>BEFORE LAUNCH</span><strong>Regional leader creates the identity · developer builds and connects</strong><span>AFTER LAUNCH</span><strong>Managers publish · edit text · add modules · manage feeds</strong></section>
      <StudioClient region={region} initialContent={content} initialModules={modules} initialContributors={contributors} initialArticles={articles} />
    </main>
  );
}

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <ProtectedStudio regionKey={resolveRegion(params.region)} />;
}
