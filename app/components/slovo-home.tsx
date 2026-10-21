import Link from "next/link";
import type { RegionalConfig } from "../regional";
import type { RegionalArticle } from "../lib/articles";
import type { RegionalContributor } from "../lib/content";
import { ArticleFeed } from "./article-feed";
import { Contributors } from "./contributors";
import { slovoCopy } from "../slovo-copy";

export function SlovoHome({region,articles,contributors}:{region:RegionalConfig;articles:RegionalArticle[];contributors:RegionalContributor[]}) {
  const uk = region.locale === "uk";
  const t = (key:string) => (region.uiCopy || slovoCopy)[(uk?"uk.":"ru.")+key];
  const suffix = `?region=${region.key}`;
  const team = uk ? contributors.map((contributor,index)=>({...contributor,name:t(`c${index+1}Name`),role:t(`c${index+1}Role`),shortBio:t(`c${index+1}Short`),fullBio:t(`c${index+1}Full`)})) : contributors;
  const communityHref = region.communityLinks[0]?.url ?? "https://t.me/ulianakob";
  return <main className="slovo-home">
    <section className="slovo-hero v2-wrap">
      <p className="slovo-eyebrow">{region.heroEyebrow}</p>
      <h1><span className="slovo-quote" aria-hidden="true">«</span> {region.headline} <span className="slovo-quote" aria-hidden="true">»</span></h1>
      <p className="slovo-hero-intro">{region.intro}</p>
      <div className="slovo-actions">
        <Link className="slovo-button" href={`/journal${suffix}`}>{t("newsCta")} <b aria-hidden="true">↗</b></Link>
        <a className="slovo-button slovo-button-ghost" href={communityHref} target="_blank" rel="noreferrer">{t("joinCta")}</a>
      </div>
      <p className="slovo-hero-meta"><span>CONFLUX ECOSYSTEM</span><i aria-hidden="true"/><span>RU / UA</span><i aria-hidden="true"/><span>WEB3 · CFX POS</span></p>
    </section>

    <section className="slovo-intro v2-wrap">
      <p className="slovo-eyebrow">{region.localModuleEyebrow}</p>
      <h2>{region.localModuleTitle}</h2>
      <p className="slovo-intro-text">{region.localModuleText}</p>
      <div className="slovo-paths">
        {[{href:`/journal${suffix}`,label:region.journalLabel,text:t("newsIntro")},{href:`/stake${suffix}`,label:region.stakeLabel,text:t("stakingDescription")},{href:"#community",label:region.communityLabel,text:t("communityIntro")}].map((card,index)=>(
          <Link href={card.href} key={card.href}>
            <span className="slovo-path-top"><span className="slovo-path-num">0{index+1}</span><span className="slovo-path-diamond" aria-hidden="true"/></span>
            <h3>{card.label}</h3><p>{card.text}</p><b aria-hidden="true">↗</b>
          </Link>
        ))}
      </div>
    </section>

    <section className="slovo-journal v2-wrap" id="journal">
      <div className="slovo-section-head"><div><p className="slovo-eyebrow">{region.journalEyebrow}</p><h2>{region.journalTitle}</h2></div><Link href={`/journal${suffix}`}>{t("allNews")} ↗</Link></div>
      <ArticleFeed articles={articles} region={region}/>
    </section>

    <section className="slovo-staking" id="stake">
      <div className="v2-wrap slovo-staking-grid">
        <div><p className="slovo-eyebrow">{region.stakeEyebrow}</p><h2>{region.stakeHeading}</h2></div>
        <div><p>{region.stakeIntro}</p><Link className="slovo-button slovo-button-mint" href={`/stake${suffix}`}>{region.stakeLabel} ↗</Link></div>
      </div>
    </section>

    <section className="slovo-community v2-wrap" id="community">
      <p className="slovo-eyebrow">{t("communityEyebrow")}</p>
      <h2>{t("communityTitle")}</h2>
      <div className="slovo-community-links">{region.communityLinks.map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer"><strong>{link.label}</strong><span>{t("joinConversation")} ↗</span></a>)}</div>
    </section>

    <Contributors contributors={team} title={t("teamTitle")} subtitle={t("teamIntro")} locale={uk?"uk":"ru"} />
  </main>;
}
