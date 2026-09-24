import Link from "next/link";
import type { RegionalConfig } from "../regional";
import type { RegionalArticle } from "../lib/articles";
import type { RegionalContributor, RegionalModule } from "../lib/content";
import { ArticleFeed } from "./article-feed";
import { Contributors } from "./contributors";
import { SocialFeed } from "./social-feed";
import { caudalCopy } from "../caudal-copy";

export function CaudalHome({region,articles,modules,contributors}:{region:RegionalConfig;articles:RegionalArticle[];modules:RegionalModule[];contributors:RegionalContributor[]}) {
  const en = region.locale === "en";
  const suffix = "?region=latam";
  const t = (key:string) => (region.uiCopy || caudalCopy)[(en?"en":"es")+"."+key];
  return <main className="caudal-home">
    <section className="caudal-hero"><div className="caudal-hero-copy"><p className="caudal-eyebrow">{region.heroEyebrow}</p><h1>{region.headline}</h1><p>{region.intro}</p><div className="caudal-actions"><Link className="caudal-primary" href={`/journal${suffix}`}>{t("newsCta")} <span>↗</span></Link><a className="caudal-secondary" href="https://t.me/Conflux_LATAM" target="_blank" rel="noreferrer">{t("joinCta")}</a></div></div><div className="caudal-hero-art" role="img" aria-label={en?"Caudal: people, ideas and connections across Latin America":"Caudal: personas, ideas y conexiones en Latinoamérica"}/></section>
    <section className="caudal-intro"><p className="caudal-eyebrow">CONFLUX / LATAM</p><h2>{t("flowTitle")}</h2><p>{t("flowIntro")}</p><div className="caudal-paths"><Link href={`/journal${suffix}`}><span>01</span><h3>{region.journalLabel}</h3><p>{t("newsIntro")}</p><b>↗</b></Link><Link href={`/stake${suffix}`}><span>02</span><h3>{region.stakeLabel}</h3><p>{t("stakeIntro")}</p><b>↗</b></Link><a href="#community"><span>03</span><h3>{region.communityLabel}</h3><p>{t("communityIntro")}</p><b>↗</b></a></div></section>
    <section className="caudal-news" id="journal"><div className="caudal-section-title"><div><p className="caudal-eyebrow">{region.journalEyebrow}</p><h2>{region.journalTitle}</h2></div><Link href={`/journal${suffix}`}>{t("allNews")} ↗</Link></div><ArticleFeed articles={articles} region={region}/></section>
    <section className="caudal-staking"><div><p className="caudal-eyebrow">{region.stakeEyebrow}</p><h2>{region.stakeHeading}</h2></div><div><p>{region.stakeIntro}</p><Link className="caudal-secondary" href={`/stake${suffix}`}>{region.stakeLabel} ↗</Link></div></section>
    <section className="caudal-community" id="community"><div><p className="caudal-eyebrow">{t("communityEyebrow")}</p><h2>{t("communityTitle")}</h2></div><div className="caudal-community-links">{region.communityLinks.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><strong>{link.label}</strong><span>{t("joinConversation")} ↗</span></a>)}</div></section>
    <SocialFeed modules={modules} locale={en?"en":"es"}/>
    {modules.find(m=>m.moduleKey==="contributors")?.enabled && <Contributors contributors={contributors} title={t("teamTitle")} subtitle={t("teamIntro")} locale={en?"en":"es"}/>} 
  </main>;
}
