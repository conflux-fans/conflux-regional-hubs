CREATE TABLE IF NOT EXISTS journal_posts (id TEXT PRIMARY KEY NOT NULL, region_slug TEXT NOT NULL, slug TEXT NOT NULL, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', tag TEXT NOT NULL DEFAULT 'COMMUNITY', author TEXT NOT NULL DEFAULT 'Regional Hub', status TEXT NOT NULL DEFAULT 'draft', published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS journal_posts_region_slug_unique ON journal_posts(region_slug, slug);
CREATE INDEX IF NOT EXISTS journal_posts_region_status_idx ON journal_posts(region_slug, status, published_at);
CREATE TABLE IF NOT EXISTS social_connections (id TEXT PRIMARY KEY NOT NULL, region_slug TEXT NOT NULL, provider TEXT NOT NULL, profile_url TEXT NOT NULL DEFAULT '', handle TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS social_connections_region_provider_unique ON social_connections(region_slug, provider);
