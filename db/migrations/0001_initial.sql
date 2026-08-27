CREATE TABLE region_settings (
  region TEXT PRIMARY KEY NOT NULL,
  wordmark TEXT NOT NULL,
  logo_style TEXT NOT NULL,
  domain TEXT NOT NULL,
  headline TEXT NOT NULL,
  intro TEXT NOT NULL,
  accent TEXT NOT NULL,
  secondary TEXT NOT NULL,
  layout TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  region TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  author_email TEXT NOT NULL,
  status TEXT DEFAULT 'published' NOT NULL,
  published_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX articles_region_slug_unique ON articles (region, slug);
CREATE INDEX articles_region_published_idx ON articles (region, published_at);

CREATE TABLE regional_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  region TEXT NOT NULL,
  project_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  primary_language TEXT NOT NULL,
  secondary_languages TEXT NOT NULL,
  logo_direction TEXT NOT NULL,
  asset_links TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  colors_to_avoid TEXT NOT NULL,
  personality TEXT NOT NULL,
  background_concept TEXT NOT NULL,
  local_symbols TEXT NOT NULL,
  reference_sites TEXT NOT NULL,
  audience TEXT NOT NULL,
  homepage_priority TEXT NOT NULL,
  journal_name TEXT NOT NULL,
  staking_name TEXT NOT NULL,
  local_sections TEXT NOT NULL,
  mobile_notes TEXT NOT NULL,
  final_notes TEXT NOT NULL,
  generated_prompt TEXT NOT NULL,
  submitter_name TEXT DEFAULT '' NOT NULL,
  submitter_email TEXT DEFAULT '' NOT NULL,
  submitter_contact TEXT DEFAULT '' NOT NULL,
  status TEXT DEFAULT 'submitted' NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX regional_briefs_region_created_idx ON regional_briefs (region, created_at);

CREATE TABLE regional_content (
  region TEXT PRIMARY KEY NOT NULL,
  content_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE regional_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  region TEXT NOT NULL,
  module_key TEXT NOT NULL,
  enabled INTEGER DEFAULT 0 NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  source TEXT NOT NULL,
  layout TEXT DEFAULT 'grid' NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX regional_modules_region_key_unique ON regional_modules (region, module_key);
CREATE INDEX regional_modules_region_position_idx ON regional_modules (region, position);

CREATE TABLE regional_contributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  region TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  short_bio TEXT NOT NULL,
  full_bio TEXT NOT NULL,
  photo_url TEXT DEFAULT '' NOT NULL,
  display_order INTEGER NOT NULL,
  is_visible INTEGER DEFAULT 1 NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX regional_contributors_region_order_idx ON regional_contributors (region, display_order);
