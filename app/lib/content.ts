import { getDatabase } from "../../db/index.ts";
import { regions, type RegionKey, type RegionalConfig } from "../regional.ts";

type SettingRow = {
  wordmark: string;
  logoStyle: RegionalConfig["logoStyle"];
  domain: string;
  headline: string;
  intro: string;
  accent: string;
  secondary: string;
  layout: RegionalConfig["layout"];
};

export type LocalArticle = {
  id: number;
  slug: string;
  region: RegionKey;
  title: string;
  excerpt: string;
  body: string;
  authorEmail: string;
  status: "draft" | "published";
  publishedAt: number;
};

export type EditableRegionalContent = Pick<RegionalConfig,
  "wordmark" | "headline" | "intro" | "heroEyebrow" | "journalLabel" | "journalTitle" |
  "journalEyebrow" | "stakeLabel" | "stakeEyebrow" | "stakeHeading" | "stakeIntro" | "footerText"
>;

export type RegionalModule = {
  moduleKey: "journal" | "stake" | "contributors" | "instagram" | "twitter" | "youtube" | "events" | "newsletter";
  enabled: boolean;
  position: number;
  title: string;
  subtitle: string;
  source: string;
  layout: "grid" | "carousel" | "list";
};
type RegionalModuleRow = Omit<RegionalModule, "enabled"> & { enabled: number };

export type RegionalContributor = {
  id: number;
  name: string;
  role: string;
  shortBio: string;
  fullBio: string;
  photoUrl: string;
  isVisible: boolean;
};
type RegionalContributorRow = Omit<RegionalContributor, "isVisible"> & { isVisible: number };

async function database() {
  return getDatabase();
}

function defaultContent(key: RegionKey): EditableRegionalContent {
  const region = regions[key];
  return {
    wordmark: region.wordmark, headline: region.headline, intro: region.intro, heroEyebrow: region.heroEyebrow,
    journalLabel: region.journalLabel, journalTitle: region.journalTitle, journalEyebrow: region.journalEyebrow,
    stakeLabel: region.stakeLabel, stakeEyebrow: region.stakeEyebrow, stakeHeading: region.stakeHeading,
    stakeIntro: region.stakeIntro, footerText: region.footerText,
  };
}

export async function getRegionalContent(key: RegionKey): Promise<EditableRegionalContent> {
  const fallback = defaultContent(key);
  try {
    const db = await database();
    const row = await db.prepare("SELECT content_json AS contentJson FROM regional_content WHERE region = ?").bind(key).first<{ contentJson: string }>();
    if (!row?.contentJson) return fallback;
    const saved = JSON.parse(row.contentJson) as Partial<EditableRegionalContent>;
    return Object.fromEntries(Object.entries(fallback).map(([field, value]) => [field, typeof saved[field as keyof EditableRegionalContent] === "string" ? saved[field as keyof EditableRegionalContent] : value])) as EditableRegionalContent;
  } catch { return fallback; }
}

export async function getRegionalConfig(key: RegionKey): Promise<RegionalConfig> {
  return { ...regions[key], ...(await getRegionalContent(key)) };
}

function defaultModules(key: RegionKey): RegionalModule[] {
  const region = regions[key];
  return [
    { moduleKey: "journal", enabled: true, position: 0, title: region.journalTitle, subtitle: "Regional publishing", source: "", layout: "grid" },
    { moduleKey: "stake", enabled: true, position: 1, title: region.stakeHeading, subtitle: region.stakeIntro, source: "", layout: "grid" },
    { moduleKey: "contributors", enabled: true, position: 2, title: "Meet the contributors", subtitle: "The people building this regional hub", source: "", layout: "grid" },
    { moduleKey: "instagram", enabled: key === "africa", position: 3, title: "Instagram", subtitle: "From the wider Conflux community", source: key === "africa" ? "https://www.instagram.com/confluxnetwork" : "", layout: "grid" },
    { moduleKey: "twitter", enabled: key === "africa", position: 4, title: "X / Twitter", subtitle: "Latest Conflux Africa updates", source: key === "africa" ? "https://x.com/confluxafrica" : "", layout: "list" },
    { moduleKey: "youtube", enabled: false, position: 5, title: "YouTube", subtitle: "Latest regional videos", source: "", layout: "grid" },
    { moduleKey: "events", enabled: false, position: 6, title: "Events", subtitle: "Meet the community", source: "", layout: "list" },
    { moduleKey: "newsletter", enabled: false, position: 7, title: "Newsletter", subtitle: "Get regional updates", source: "", layout: "list" },
  ];
}

export async function getRegionalModules(key: RegionKey): Promise<RegionalModule[]> {
  const defaults = defaultModules(key);
  try {
    const db = await database();
    const result = await db.prepare("SELECT module_key AS moduleKey, enabled, position, title, subtitle, source, layout FROM regional_modules WHERE region = ? ORDER BY position ASC").bind(key).all<RegionalModuleRow>();
    const saved = new Map((result.results ?? []).map((item) => [item.moduleKey, item]));
    return defaults.map((item) => {
      const row = saved.get(item.moduleKey);
      if (!row) return item;
      return { ...item, ...row, enabled: ["journal", "stake"].includes(item.moduleKey) ? true : Boolean(row.enabled), layout: ["grid", "carousel", "list"].includes(row.layout) ? row.layout : item.layout } as RegionalModule;
    }).sort((a, b) => a.position - b.position);
  } catch { return defaults; }
}

export async function saveRegionalContent(region: RegionKey, input: EditableRegionalContent, email: string) {
  const db = await database();
  await db.prepare(`INSERT INTO regional_content (region, content_json, updated_by, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(region) DO UPDATE SET content_json = excluded.content_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(region, JSON.stringify(input), email, Date.now()).run();
}

export async function saveRegionalModules(region: RegionKey, modules: RegionalModule[], email: string) {
  const db = await database();
  const now = Date.now();
  await db.batch(modules.map((module, index) => db.prepare(`INSERT INTO regional_modules
    (region, module_key, enabled, position, title, subtitle, source, layout, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(region, module_key) DO UPDATE SET enabled = excluded.enabled, position = excluded.position,
    title = excluded.title, subtitle = excluded.subtitle, source = excluded.source, layout = excluded.layout,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(region, module.moduleKey, ["journal", "stake"].includes(module.moduleKey) ? 1 : module.enabled ? 1 : 0, index, module.title, module.subtitle, module.source, module.layout, email, now)));
}

export async function getRegionalContributors(region: RegionKey): Promise<RegionalContributor[]> {
  const fallback = regions[region].contributors.map((item, index) => ({ id: -(index + 1), ...item, isVisible: true }));
  try {
    const db = await database();
    const result = await db.prepare(`SELECT id, name, role, short_bio AS shortBio, full_bio AS fullBio,
      photo_url AS photoUrl, is_visible AS isVisible FROM regional_contributors
      WHERE region = ? ORDER BY display_order ASC`).bind(region).all<RegionalContributorRow>();
    if (!result.results?.length) return fallback;
    return result.results.map((item) => ({ ...item, isVisible: Boolean(item.isVisible) }));
  } catch { return fallback; }
}

export async function saveRegionalContributors(region: RegionKey, contributors: RegionalContributor[], email: string) {
  const db = await database();
  const now = Date.now();
  await db.prepare("DELETE FROM regional_contributors WHERE region = ?").bind(region).run();
  if (!contributors.length) return;
  await db.batch(contributors.map((item, index) => db.prepare(`INSERT INTO regional_contributors
    (region, name, role, short_bio, full_bio, photo_url, display_order, is_visible, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(region, item.name, item.role, item.shortBio, item.fullBio, item.photoUrl, index, item.isVisible ? 1 : 0, email, now)));
}

export async function getLocalArticles(region: RegionKey, limit = 12): Promise<LocalArticle[]> {
  try {
    const db = await database();
    const result = await db.prepare(
      "SELECT id, slug, region, title, excerpt, body, author_email AS authorEmail, status, published_at AS publishedAt FROM articles WHERE region = ? AND status = 'published' ORDER BY published_at DESC LIMIT ?",
    ).bind(region, limit).all<LocalArticle>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

export async function getLocalArticle(region: RegionKey, slug: string): Promise<LocalArticle | null> {
  try {
    const db = await database();
    return await db.prepare(
      "SELECT id, slug, region, title, excerpt, body, author_email AS authorEmail, status, published_at AS publishedAt FROM articles WHERE region = ? AND slug = ? AND status = 'published'",
    ).bind(region, slug).first<LocalArticle>();
  } catch {
    return null;
  }
}

export async function saveRegionalSettings(region: RegionKey, input: SettingRow, email: string) {
  const db = await database();
  await db.prepare(`
    INSERT INTO region_settings (region, wordmark, logo_style, domain, headline, intro, accent, secondary, layout, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(region) DO UPDATE SET
      wordmark = excluded.wordmark,
      logo_style = excluded.logo_style,
      domain = excluded.domain,
      headline = excluded.headline,
      intro = excluded.intro,
      accent = excluded.accent,
      secondary = excluded.secondary,
      layout = excluded.layout,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).bind(region, input.wordmark, input.logoStyle, input.domain, input.headline, input.intro, input.accent, input.secondary, input.layout, email, Date.now()).run();
}

function slugify(value: string) {
  const base = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return base || `article-${Date.now()}`;
}

export async function publishLocalArticle(region: RegionKey, input: { title: string; excerpt: string; body: string }, email: string) {
  const slug = `${slugify(input.title)}-${Date.now().toString(36)}`;
  const db = await database();
  await db.prepare(
    "INSERT INTO articles (region, slug, title, excerpt, body, author_email, status, published_at) VALUES (?, ?, ?, ?, ?, ?, 'published', ?)",
  ).bind(region, slug, input.title, input.excerpt, input.body, email, Date.now()).run();
  return slug;
}

export async function getManagedArticles(region: RegionKey): Promise<LocalArticle[]> {
  try {
    const db = await database();
    const result = await db.prepare(
      "SELECT id, slug, region, title, excerpt, body, author_email AS authorEmail, status, published_at AS publishedAt FROM articles WHERE region = ? ORDER BY published_at DESC LIMIT 100",
    ).bind(region).all<LocalArticle>();
    return (result.results ?? []).map((article) => ({ ...article, status: article.status === "published" ? "published" : "draft" }));
  } catch {
    return [];
  }
}

export async function saveLocalArticle(region: RegionKey, input: { id?: number; title: string; excerpt: string; body: string; status: "draft" | "published" }, email: string) {
  const db = await database();
  const timestamp = Date.now();
  if (input.id && Number.isInteger(input.id)) {
    const existing = await db.prepare("SELECT id, slug FROM articles WHERE id = ? AND region = ?").bind(input.id, region).first<{ id: number; slug: string }>();
    if (existing) {
      await db.prepare("UPDATE articles SET title = ?, excerpt = ?, body = ?, status = ?, author_email = ?, published_at = ? WHERE id = ? AND region = ?")
        .bind(input.title, input.excerpt, input.body, input.status, email, timestamp, existing.id, region).run();
      return { id: existing.id, slug: existing.slug, publishedAt: timestamp };
    }
  }
  const slug = `${slugify(input.title)}-${timestamp.toString(36)}`;
  const result = await db.prepare(
    "INSERT INTO articles (region, slug, title, excerpt, body, author_email, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(region, slug, input.title, input.excerpt, input.body, email, input.status, timestamp).run();
  return { id: Number(result.meta.last_row_id ?? 0), slug, publishedAt: timestamp };
}

export type RegionalBriefInput = {
  submitterName: string;
  submitterEmail: string;
  submitterContact: string;
  projectName: string;
  domain: string;
  primaryLanguage: string;
  secondaryLanguages: string;
  logoDirection: string;
  assetLinks: string;
  primaryColor: string;
  secondaryColor: string;
  colorsToAvoid: string;
  personality: string;
  backgroundConcept: string;
  localSymbols: string;
  referenceSites: string;
  audience: string;
  homepagePriority: string;
  heroHeadline: string;
  heroIntro: string;
  journalName: string;
  stakingName: string;
  localSections: string;
  mobileNotes: string;
  finalNotes: string;
};

export type RegionalBriefSubmission = {
  id: number;
  region: RegionKey;
  projectName: string;
  domain: string;
  primaryLanguage: string;
  submitterName: string;
  submitterEmail: string;
  submitterContact: string;
  generatedPrompt: string;
  status: string;
  createdAt: number;
};

export function createVibePrompt(regionName: string, input: RegionalBriefInput) {
  return `IMPLEMENTATION TARGET — READ FIRST
Implement this region inside the existing Conflux Regional Hubs repository. Do not create a second repository, fork the product core, or rebuild shared features. Start from the deploy-ready source and follow README.md, ARCHITECTURE.md, REGIONAL-ONBOARDING.md, DEPLOYMENT.md, and DEVELOPER-HANDOFF.md.

Shared source and handoff: https://conflux-community-hub.christian-oertel.chatgpt.site/handoff
Deploy-ready ZIP: https://conflux-community-hub.christian-oertel.chatgpt.site/downloads/kudi-hub-deploy-ready.zip

Use the attached Conflux Community Hub website as the functional foundation and create a distinct ${regionName} regional presentation. Preserve the shared Journal publishing, manager login, social connections, mobile responsiveness, accessibility, database schema, and protected CFX staking architecture. Do not merely recolor an example and do not copy Shanghai Crypto or Kudihub unless the brief explicitly names one as an approved reference.

REFERENCE FIDELITY
- If an approved reference URL or screenshot is supplied, reproduce its composition, typography, spacing, color system, imagery treatment, and responsive behavior—not only its copy.
- For the existing Africa/Kudihub example, https://conflux-community-hub.christian-oertel.chatgpt.site/?region=africa is the approved reference.
- Keep all shared behavior in shared modules; add only the region configuration, presentation preset, and approved assets needed for this identity.
- Do not change another region while implementing this one.

IDENTITY
- Website name: ${input.projectName}
- Intended domain: ${input.domain}
- Primary language: ${input.primaryLanguage}
- Secondary languages: ${input.secondaryLanguages || "None"}
- Logo direction: ${input.logoDirection}
- Logo, moodboard, or asset links: ${input.assetLinks || "Assets will be attached separately"}

VISUAL DIRECTION
- Primary color: ${input.primaryColor}
- Secondary color: ${input.secondaryColor}
- Colors to avoid: ${input.colorsToAvoid || "None specified"}
- Desired personality: ${input.personality}
- Background / hero concept: ${input.backgroundConcept}
- Local symbols, landmarks, or cultural details: ${input.localSymbols}
- Reference websites or visual examples: ${input.referenceSites || "None supplied"}

AUDIENCE AND CONTENT
- Primary audience: ${input.audience}
- The first thing visitors should notice: ${input.homepagePriority}
- Initial homepage headline: ${input.heroHeadline}
- Initial homepage introduction: ${input.heroIntro}
- Local name for Journal: ${input.journalName}
- Local name for Stake: ${input.stakingName}
- Optional local sections: ${input.localSections || "None"}

RESPONSIVE EXPERIENCE
- Mobile priorities or constraints: ${input.mobileNotes || "Preserve the primary Journal and Stake actions above the fold"}

ADDITIONAL DIRECTION
${input.finalNotes || "No additional notes."}

DELIVERABLE
1. First propose the visual direction and identify missing assets or decisions.
2. Add a typed region entry in config/regions.ts and any modular presentation preset/assets required by this brief.
3. Keep visible copy, contributor profiles, Journal posts, social profile links, and curated social cards manager-editable.
4. Preserve the shared Markdown editor, stable published URLs, canonical/Open Graph metadata, X and Telegram share URLs, Discord copy handoff, and Instagram/X/YouTube feed adapters.
5. Run npm test and review the exact region at desktop and mobile widths.
6. Deploy a separate persistent Node.js target from the same repository with NEXT_PUBLIC_REGION_SLUG set to the new slug. Give the target its own NEXT_PUBLIC_SITE_URL, SQLite file/volume, domain, and secrets.
7. Record every missing production connection: authentication allowlist, database/storage, provider API credentials, final domain, wallet provider, network, and staking contracts.

ACCEPTANCE CHECKLIST
- The deployed home, Journal, article, Stake, Manager, and Connections pages use readable contrast.
- The deployed presentation visibly follows supplied references and is not an unrequested example layout.
- A manager can save a Markdown draft, reopen it, publish it, and open the stable article URL.
- Published articles expose clickable X and Telegram links, Discord copy/open, and copy-link actions.
- Instagram, X, and YouTube profile links work; curated feed cards work without credentials; official feeds work when credentials are supplied.
- Existing registered regions still pass their tests and retain their approved presentations.

Return the region config/presentation changes, required environment variables, database migration status, test evidence, deployment URL, and any remaining connection work.`;
}

export async function saveRegionalBrief(region: RegionKey, input: RegionalBriefInput, generatedPrompt: string) {
  const db = await database();
  const result = await db.prepare(`
    INSERT INTO regional_briefs (
      region, project_name, domain, primary_language, secondary_languages, logo_direction, asset_links,
      primary_color, secondary_color, colors_to_avoid, personality, background_concept, local_symbols,
      reference_sites, audience, homepage_priority, journal_name, staking_name, local_sections,
      mobile_notes, final_notes, generated_prompt, submitter_name, submitter_email, submitter_contact,
      status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
  `).bind(
    region, input.projectName, input.domain, input.primaryLanguage, input.secondaryLanguages, input.logoDirection, input.assetLinks,
    input.primaryColor, input.secondaryColor, input.colorsToAvoid, input.personality, input.backgroundConcept, input.localSymbols,
    input.referenceSites, input.audience, input.homepagePriority, input.journalName, input.stakingName, input.localSections,
    input.mobileNotes, input.finalNotes, generatedPrompt, input.submitterName, input.submitterEmail,
    input.submitterContact, input.submitterEmail, Date.now(),
  ).run();
  return Number(result.meta.last_row_id ?? 0);
}

export async function getRegionalBriefSubmissions(): Promise<RegionalBriefSubmission[]> {
  const db = await database();
  const result = await db.prepare(`SELECT id, region, project_name AS projectName, domain,
    primary_language AS primaryLanguage, submitter_name AS submitterName,
    submitter_email AS submitterEmail, submitter_contact AS submitterContact,
    generated_prompt AS generatedPrompt, status, created_at AS createdAt
    FROM regional_briefs ORDER BY created_at DESC LIMIT 200`).all<RegionalBriefSubmission>();
  return result.results ?? [];
}
