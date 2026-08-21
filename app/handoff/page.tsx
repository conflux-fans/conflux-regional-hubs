import Link from "next/link";
import { region } from "../../config/regions";
import { Footer, Header } from "../site-components";

const sharedCore = [
  "Manager authentication and regional permissions",
  "Markdown editor, preview, drafts and durable publishing",
  "Stable article URLs, canonical metadata and social cards",
  "X and Telegram share links, copy link and Discord handoff",
  "Instagram, X and YouTube adapters with diagnostics",
  "Database migration and storage contracts",
  "Protected CFX staking integration boundary",
  "Responsive and accessibility primitives",
];

const regionalDesign = [
  "Logo, approved assets and local symbols",
  "Contrast-safe theme and surface pairs",
  "Body/display typography and spacing character",
  "Hero composition and artwork treatment",
  "Homepage section order and section variants",
  "Journal and Stake page variants",
  "Languages, visible copy, contributors and module states",
];

const onboarding = [
  "Send the shared questionnaire to the regional leader",
  "Collect the generated website prompt and logo prompt",
  "Prepend the repository guardrail in REGIONAL-ONBOARDING.md",
  "Create a short-lived regional branch in this repository",
  "Add a distinct typed presentation and approved assets",
  "Run tests plus desktop/mobile regional review",
  "Merge and deploy a separate target from the same repository",
];

const productionConnections = [
  "Final regional domain and NEXT_PUBLIC_SITE_URL",
  "Regional D1 database and shared migration",
  "Manager allowlist and production authentication policy",
  "Storage for logos, portraits and Journal media",
  "Instagram token/user ID, X bearer/user ID, YouTube key/channel ID",
  "Approved Conflux network, wallet provider and staking contracts",
];

const verification = [
  "Architecture guardrails and locality-free shared renderers",
  "WCAG AA contrast checks for every registered theme",
  "Safe Markdown, headings, emphasis, lists, quotes and links",
  "Full-title slugs and canonical article URLs",
  "X and Telegram URL encoding plus Discord copy handoff",
  "Instagram, X and YouTube response normalization",
  "Production Worker build and rendered HTML validation",
];

export default function Handoff() {
  return (
    <main>
      <Header />
      <section className="inner-hero">
        <p className="eyebrow">DEVELOPER HANDOFF / ONE REPOSITORY</p>
        <h1>One core.<br />Distinct hubs.</h1>
        <p>
          Shanghai Crypto and Kudi Hub are examples only. Each questionnaire must produce a
          genuinely new regional presentation while the tested product core remains shared.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/downloads/conflux-regional-hubs-source.zip">
            Download deploy-ready source ↘
          </Link>
          <a className="button quiet" href="https://conflux-community-hub.christian-oertel.chatgpt.site" target="_blank" rel="noopener noreferrer">
            Open regional questionnaire ↗
          </a>
          <Link className="button quiet" href="/downloads/conflux-regional-hubs-source.zip.sha256">
            Source checksum ↗
          </Link>
        </div>
      </section>
      <section className="content-narrow">
        <div className="handoff-grid">
          <article className="check-card required">
            <p className="story-meta">CRITICAL DISTINCTION</p>
            <h2>Do not clone an example</h2>
            <p>
              A new hub must not inherit the Shanghai or Kudi layout by default. The generated
              prompt controls composition, art direction, typography, ordering and local identity.
              Only the product behavior is standardized.
            </p>
          </article>
          <article className="check-card">
            <p className="story-meta">REPOSITORY MODEL</p>
            <h2>One repo, many targets</h2>
            <p>
              Build the same reviewed commit once per domain. Set <code>NEXT_PUBLIC_REGION_SLUG</code>{" "}
              to select <strong>{region.siteName}</strong> or another registered region. Each target
              keeps its own domain, database and secrets.
            </p>
          </article>
          <article className="check-card">
            <p className="story-meta">SHARED PRODUCT CORE</p>
            <h2>Maintain once</h2>
            <ul>{sharedCore.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="check-card">
            <p className="story-meta">REGION-GENERATED</p>
            <h2>Design from the prompt</h2>
            <ul>{regionalDesign.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="check-card">
            <p className="story-meta">QUESTIONNAIRE TO DEPLOYMENT</p>
            <h2>Developer workflow</h2>
            <ol>{onboarding.map((item) => <li key={item}>{item}</li>)}</ol>
            <p className="muted">
              Start with <code>README.md</code>, then follow <code>ARCHITECTURE.md</code>,{" "}
              <code>REGIONAL-ONBOARDING.md</code> and <code>DEPLOYMENT.md</code> in the ZIP.
            </p>
          </article>
          <article className="check-card required">
            <p className="story-meta">PRODUCTION CONNECTIONS</p>
            <h2>Developer must supply</h2>
            <ul>{productionConnections.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="check-card">
            <p className="story-meta">VERIFIED IN SOURCE</p>
            <h2>Automated checks</h2>
            <ul>{verification.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="check-card">
            <p className="story-meta">SOCIAL FEEDS</p>
            <h2>Links first, live feeds with keys</h2>
            <p>
              Profile links work without credentials. Automatic posts replace the clearly labeled
              review cards after provider credentials are added. Manager → Connections reports the
              live status for each provider.
            </p>
          </article>
        </div>
      </section>
      <Footer />
    </main>
  );
}
