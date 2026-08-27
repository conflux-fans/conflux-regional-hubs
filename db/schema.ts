import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const regionSettings = sqliteTable("region_settings", {
  region: text("region").primaryKey(),
  wordmark: text("wordmark").notNull(),
  logoStyle: text("logo_style").notNull(),
  domain: text("domain").notNull(),
  headline: text("headline").notNull(),
  intro: text("intro").notNull(),
  accent: text("accent").notNull(),
  secondary: text("secondary").notNull(),
  layout: text("layout").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  region: text("region").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  authorEmail: text("author_email").notNull(),
  status: text("status").notNull().default("published"),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("articles_region_slug_unique").on(table.region, table.slug),
  index("articles_region_published_idx").on(table.region, table.publishedAt),
]);

export const regionalBriefs = sqliteTable("regional_briefs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  region: text("region").notNull(),
  projectName: text("project_name").notNull(),
  domain: text("domain").notNull(),
  primaryLanguage: text("primary_language").notNull(),
  secondaryLanguages: text("secondary_languages").notNull(),
  logoDirection: text("logo_direction").notNull(),
  assetLinks: text("asset_links").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  colorsToAvoid: text("colors_to_avoid").notNull(),
  personality: text("personality").notNull(),
  backgroundConcept: text("background_concept").notNull(),
  localSymbols: text("local_symbols").notNull(),
  referenceSites: text("reference_sites").notNull(),
  audience: text("audience").notNull(),
  homepagePriority: text("homepage_priority").notNull(),
  journalName: text("journal_name").notNull(),
  stakingName: text("staking_name").notNull(),
  localSections: text("local_sections").notNull(),
  mobileNotes: text("mobile_notes").notNull(),
  finalNotes: text("final_notes").notNull(),
  generatedPrompt: text("generated_prompt").notNull(),
  submitterName: text("submitter_name").notNull().default(""),
  submitterEmail: text("submitter_email").notNull().default(""),
  submitterContact: text("submitter_contact").notNull().default(""),
  status: text("status").notNull().default("submitted"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("regional_briefs_region_created_idx").on(table.region, table.createdAt)]);

export const regionalContent = sqliteTable("regional_content", {
  region: text("region").primaryKey(),
  contentJson: text("content_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const regionalModules = sqliteTable("regional_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  region: text("region").notNull(),
  moduleKey: text("module_key").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  source: text("source").notNull(),
  layout: text("layout").notNull().default("grid"),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("regional_modules_region_key_unique").on(table.region, table.moduleKey),
  index("regional_modules_region_position_idx").on(table.region, table.position),
]);

export const regionalContributors = sqliteTable("regional_contributors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  region: text("region").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  shortBio: text("short_bio").notNull(),
  fullBio: text("full_bio").notNull(),
  photoUrl: text("photo_url").notNull().default(""),
  displayOrder: integer("display_order").notNull(),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("regional_contributors_region_order_idx").on(table.region, table.displayOrder)]);
