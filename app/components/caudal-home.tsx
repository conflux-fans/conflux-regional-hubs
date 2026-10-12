import Link from "next/link";
import type { RegionalConfig } from "../regional";
import type { RegionalArticle } from "../lib/articles";
import type { RegionalContributor, RegionalModule } from "../lib/content";
import { ArticleFeed } from "./article-feed";
import { Contributors } from "./contributors";
import { SocialFeed } from "./social-feed";
import { caudalCopy } from "../caudal-copy";

const pathIcons = [
  <svg key="articles" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12c1-1.3 2-1.3 3 0s2 1.3 3 0"/><path d="M10 16c1-1.3 2-1.3 3 0s2 1.3 3 0"/></svg>,
  <svg key="staking" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12a7.5 7.5 0 0 1 13-5.2"/><path d="M17.5 3.2v3.9h-3.9"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.2"/><path d="M6.5 20.8v-3.9h3.9"/></svg>,
  <svg key="community" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.2-.5-4.5-1.3L3 20l1.3-4.9A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 11.5c1.2-1.4 2.3-1.4 3.5 0s2.3 1.4 3.5 0"/></svg>,
];

const currentLine = <svg className="caudal-current" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 12 q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0"/></svg>;

export function CaudalHome({region,articles,modules,contributors}:{region:RegionalConfig;articles:RegionalArticle[];modules:RegionalModule[];contributors:RegionalContributor[]}) {
  const en = region.locale === "en";
  const suffix = "?region=latam";
  const t = (key:string) => (region.uiCopy || caudalCopy)[(en?"en":"es")+"."+key];
  return <main className="caudal-home">
    <section className="caudal-hero"><div className="caudal-hero-copy"><p className="caudal-eyebrow">{region.heroEyebrow}</p><h1>{region.headline}</h1><p>{region.intro}</p><div className="caudal-actions"><Link className="caudal-primary" href={`/journal${suffix}`}>{t("newsCta")} <span>↗</span></Link><a className="caudal-secondary" href="https://t.me/Conflux_LATAM" target="_blank" rel="noreferrer">{t("joinCta")}</a></div></div><div className="caudal-hero-art" role="img" aria-label={en?"Caudal: people, ideas and connections across Latin America":"Caudal: personas, ideas y conexiones en Latinoamérica"}/></section>
    <section className="caudal-intro"><p className="caudal-eyebrow">CONFLUX / LATAM</p><h2>{t("flowTitle")}</h2><p>{t("flowIntro")}</p><div className="caudal-paths">{[{ href: `/journal${suffix}`, label: region.journalLabel, text: t("newsIntro") }, { href: `/stake${suffix}`, label: region.stakeLabel, text: t("stakeIntro") }, { href: "#community", label: region.communityLabel, text: t("communityIntro") }].map((card, index) => <Link href={card.href} key={card.href}><span className="caudal-path-top"><span className="caudal-path-icon">{pathIcons[index]}</span><span className="caudal-path-num">0{index + 1}</span></span><h3>{card.label}</h3><p>{card.text}</p><b aria-hidden="true">↗</b>{currentLine}</Link>)}</div></section>
    <section className="caudal-news" id="journal"><div className="caudal-section-title"><div><p className="caudal-eyebrow">{region.journalEyebrow}</p><h2>{region.journalTitle}</h2></div><Link href={`/journal${suffix}`}>{t("allNews")} ↗</Link></div><ArticleFeed articles={articles} region={region}/></section>
    <section className="caudal-staking"><div><p className="caudal-eyebrow">{region.stakeEyebrow}</p><h2>{region.stakeHeading}</h2></div><div><p>{region.stakeIntro}</p><Link className="caudal-secondary" href={`/stake${suffix}`}>{region.stakeLabel} ↗</Link></div></section>
    <section className="caudal-community" id="community"><div><p className="caudal-eyebrow">{t("communityEyebrow")}</p><h2>{t("communityTitle")}</h2></div><div className="caudal-community-links">{region.communityLinks.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><strong>{link.label}</strong><span>{t("joinConversation")} ↗</span></a>)}</div></section>
    <SocialFeed modules={modules} locale={en?"en":"es"} siteName={region.wordmark}/>
    {modules.find(m=>m.moduleKey==="contributors")?.enabled && <Contributors contributors={contributors} title={t("teamTitle")} subtitle={t("teamIntro")} locale={en?"en":"es"}/>} 
  </main>;
}
