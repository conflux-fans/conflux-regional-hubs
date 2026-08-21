import Link from "next/link";
import { region } from "../config/regions";
import { HomeSections } from "./home-sections";
import { Footer, Header } from "./site-components";

function HeroVisual() {
  const visual = region.presentation.hero;

  if (visual.visual === "none") return null;
  if (visual.visual === "asset" && visual.assetPath) {
    return (
      <div className="hero-asset">
        {/* eslint-disable-next-line @next/next/no-img-element -- regional assets may be served by deployment storage */}
        <img src={visual.assetPath} alt={visual.visualLabel} />
      </div>
    );
  }
  if (visual.visual === "monogram-grid") {
    return (
      <div className="monogram-card" aria-label={`${region.siteName} graphic`}>
        <span className="monogram-label">{visual.visualLabel}</span>
        <strong>{region.identity.localMark}</strong>
        <div className="monogram-coordinates">
          <span>{region.identity.coordinateLeft}</span>
          <span>{region.identity.coordinateRight}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="skyline-card"
      aria-label={`Abstract ${region.region} skyline illustration`}
      data-label={visual.visualLabel}
    >
      <div className="sun" />
      <div className="tower tower-a" />
      <div className="tower tower-b" />
      <div className="tower tower-c" />
      <div className="tower tower-d" />
      <div className="river-line">
        <span>{region.identity.coordinateLeft}</span>
        <span>{region.identity.coordinateRight}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const hero = region.presentation.hero;
  return (
    <main className={`regional-home region-${region.slug}`}>
      <Header />
      <section className={`hero hero-${hero.layout}`} id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{region.identity.eyebrow}</p>
            <h1><span>{region.identity.localMark}</span>{region.hero.headline}</h1>
            <p className="hero-lede">{region.hero.introduction}</p>
            <div className="hero-actions">
              <Link className="button primary" href="/journal">Read the {region.journal.name} <span>↗</span></Link>
              <Link className="button quiet" href="/stake">{region.stake.name} <span>→</span></Link>
            </div>
          </div>
          <HeroVisual />
        </div>
        <div className="hero-strip">{region.hero.strip.map((item) => <span key={item}>{item}</span>)}</div>
      </section>
      <HomeSections />
      <Footer />
    </main>
  );
}
