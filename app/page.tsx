import Link from "next/link";
import { ArticleFeed } from "./components/article-feed";
import { RegionalShell } from "./components/regional-shell";
import { Contributors } from "./components/contributors";
import { SocialFeed } from "./components/social-feed";
import { getRegionalArticles } from "./lib/articles";
import { getRegionalConfig, getRegionalContributors, getRegionalModules, type RegionalContributor, type RegionalModule } from "./lib/content";
import { resolveRegion } from "./regional";

function OptionalModules({ modules }: { modules: RegionalModule[] }) {
  const optional = modules.filter((module) => module.enabled && !["journal", "stake", "contributors", "instagram", "twitter", "youtube"].includes(module.moduleKey));
  if (!optional.length) return null;
  return <section className="regional-modules v2-wrap"><div className="v2-section-head"><div><p className="v2-kicker">REGIONAL MODULES / LIVE CONNECTIONS</p><h2>Community pulse</h2></div><span>Managed by the regional team</span></div><div className="regional-module-grid">{optional.map((module) => <article key={module.moduleKey} className={`regional-module regional-module-${module.moduleKey}`}><header><span>{module.moduleKey.slice(0, 2).toUpperCase()}</span><div><h3>{module.title}</h3><p>{module.subtitle}</p></div><b>{module.source || "Connect feed"} ↗</b></header><div>{[1, 2, 3].map((item) => <i key={item}><span>{String(item).padStart(2, "0")}</span></i>)}</div></article>)}</div></section>;
}

function AfricaHome({ region, articles, suffix, modules, contributors }: { region: Awaited<ReturnType<typeof getRegionalConfig>>; articles: Awaited<ReturnType<typeof getRegionalArticles>>; suffix: string; modules: RegionalModule[]; contributors: RegionalContributor[] }) {
  return (
    <main className="pupu-home">
      <section className="pupu-hero">
        <div className="pupu-hero-art" aria-hidden="true" />
        <div className="pupu-hero-grid v2-wrap">
          <div className="pupu-copy">
            <p className="v2-kicker">{region.heroEyebrow}</p>
            <h1>{region.headline}</h1>
            <p>{region.intro}</p>
            <div className="pupu-signal"><i /><span>ENGLISH</span><span>KUDI = MONEY IN HAUSA</span></div>
          </div>
          <div className="pupu-portals" aria-label="Primary site areas">
            <Link href={`/stake${suffix}`} className="pupu-portal pupu-stake"><small>01 / PARTICIPATE</small><strong>{region.stakeLabel}</strong><span>Support the network ↗</span></Link>
            <Link href={`/insights${suffix}`} className="pupu-portal pupu-stories"><small>02 / DISCOVER</small><strong>{region.journalLabel}</strong><span>Read the latest ↗</span></Link>
          </div>
        </div>
        <div className="pupu-ticker" aria-label="Community themes"><span>KUDI</span><i>✦</i><span>STORIES</span><i>✦</i><span>STAKING</span><i>✦</i><span>AFRICA ONCHAIN</span></div>
      </section>

      <section className="pupu-manifesto v2-wrap">
        <div><p className="v2-kicker">{region.localModuleEyebrow}</p><h2>{region.localModuleTitle}</h2></div>
        <div><span className="pupu-index">54°</span><p>{region.localModuleText}</p><p>From Lagos to Nairobi, Accra to Cape Town—the network grows wherever people build.</p></div>
      </section>

      <section className="v2-journal pupu-journal v2-wrap" id="journal">
        <div className="v2-section-head"><div><p className="v2-kicker">{region.journalEyebrow}</p><h2>{region.journalTitle}</h2></div><Link href={`/insights${suffix}`}>All stories <span>↗</span></Link></div>
        <ArticleFeed articles={articles} region={region} />
      </section>
      <OptionalModules modules={modules} />
      <SocialFeed modules={modules} />

      <section className="v2-stake pupu-stake-panel v2-wrap" id="stake">
        <div><p className="v2-kicker v2-kicker-light">{region.stakeEyebrow}</p><h2>{region.stakeHeading}</h2></div>
        <div><p>{region.stakeIntro}</p><Link href={`/stake${suffix}`} className="v2-button v2-button-accent">{region.stakeLabel} <span>↗</span></Link></div>
        <span className="v2-stake-ring" aria-hidden="true" />
      </section>
      {modules.find((module) => module.moduleKey === "contributors")?.enabled && contributors.length > 0 && <Contributors contributors={contributors} title="Meet the people moving Kudi Hub forward." subtitle="Regional leaders, community builders, and contributors making blockchain useful across Africa." />}
    </main>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  const articles = await getRegionalArticles(region);
  const modules = await getRegionalModules(region.key);
  const contributors = await getRegionalContributors(region.key);
  const suffix = `?region=${region.key}`;

  return (
    <RegionalShell region={region}>
      {region.key === "africa" ? <AfricaHome region={region} articles={articles} suffix={suffix} modules={modules} contributors={contributors} /> :
      <main>
        <section className="v2-hero v2-wrap">
          <div className="v2-hero-copy">
            <p className="v2-kicker">{region.heroEyebrow}</p>
            <h1>{region.headline}</h1>
            <p>{region.intro}</p>
            <div className="v2-hero-meta"><span>{region.language}</span><i /><span>CONFLUX COMMUNITY</span></div>
          </div>
          <div className="v2-pillar-nav" aria-label="Primary site areas">
            <Link href={`/insights${suffix}`} className="v2-pillar v2-pillar-journal">
              <span className="v2-pillar-top"><small>01 / READ</small><small>AUTO FEED</small></span>
              <strong>{region.journalLabel}</strong>
              <p>{region.journalTitle}</p>
              <b aria-hidden="true">↗</b>
              <i className="v2-pillar-orbit" aria-hidden="true" />
            </Link>
            <Link href={`/stake${suffix}`} className="v2-pillar v2-pillar-stake">
              <span className="v2-pillar-top"><small>02 / PARTICIPATE</small><small>CFX POS</small></span>
              <strong>{region.stakeLabel}</strong>
              <p>Community-led network participation.</p>
              <b aria-hidden="true">↗</b>
              <i className="v2-pillar-orbit" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={`regional-signature regional-signature-${region.motif} v2-wrap`}>
          <div><p className="v2-kicker">{region.localModuleEyebrow}</p><h2>{region.localModuleTitle}</h2></div>
          <p>{region.localModuleText}</p>
          <span aria-hidden="true">{region.code}</span>
        </section>

        <section className="v2-journal v2-wrap" id="journal">
          <div className="v2-section-head"><div><p className="v2-kicker">{region.journalEyebrow}</p><h2>{region.journalTitle}</h2></div><Link href={`/insights${suffix}`}>View all <span>↗</span></Link></div>
          <ArticleFeed articles={articles} region={region} />
        </section>

        <OptionalModules modules={modules} />

        <section className="v2-stake v2-wrap" id="stake">
          <div><p className="v2-kicker v2-kicker-light">{region.stakeEyebrow}</p><h2>{region.stakeHeading}</h2></div>
          <div><p>{region.stakeIntro}</p><Link href={`/stake${suffix}`} className="v2-button v2-button-accent">{region.stakeLabel} <span>↗</span></Link></div>
          <span className="v2-stake-ring" aria-hidden="true" />
        </section>

        {modules.find((module) => module.moduleKey === "contributors")?.enabled && contributors.length > 0 && <Contributors contributors={contributors} title="Meet the people behind this regional hub." subtitle="The contributors helping the local Conflux community learn, build, and grow." />}

        {region.communityLinks.length > 0 && <section className="v2-community v2-wrap" id="community"><p className="v2-kicker">{region.communityLabel}</p><div>{region.communityLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}<span>↗</span></a>)}</div></section>}
      </main>}
    </RegionalShell>
  );
}
