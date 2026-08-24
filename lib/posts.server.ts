import { region } from "../config/regions.ts";

export type JournalPost = {
  id: string;
  regionSlug: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  author: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PostInput = Partial<JournalPost> &
  Pick<JournalPost, "title" | "slug" | "body" | "status">;
type D1Row = Record<string, unknown>;

export class PostSlugConflictError extends Error {}

async function database() {
  const { env } = await import("cloudflare:workers");
  return (env as unknown as { DB?: D1Database }).DB;
}

function fromRow(row: D1Row): JournalPost {
  return {
    id: String(row.id),
    regionSlug: String(row.region_slug),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt || ""),
    body: String(row.body || ""),
    tag: String(row.tag || "COMMUNITY"),
    author: String(row.author || "Regional Hub"),
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

async function getStoredPost(
  slug: string,
  databaseOverride?: D1Database,
): Promise<JournalPost | null> {
  const db = databaseOverride || (await database());
  if (!db) return null;
  const row = await db
    .prepare("SELECT * FROM journal_posts WHERE region_slug = ? AND slug = ? LIMIT 1")
    .bind(region.slug, slug)
    .first<D1Row>();
  return row ? fromRow(row) : null;
}

export function seededPosts(): JournalPost[] {
  return region.journal.stories.map((story, index) => ({
    id: `seed-${index + 1}`,
    regionSlug: region.slug,
    slug: story.slug,
    title: story.title,
    excerpt: story.deck,
    body: story.body,
    tag: story.tag,
    author: story.author,
    status: "published",
    publishedAt: new Date(story.date).toISOString(),
    createdAt: new Date(story.date).toISOString(),
    updatedAt: new Date(story.date).toISOString(),
  }));
}

export async function listPosts(includeDrafts = false): Promise<JournalPost[]> {
  const db = await database();
  if (!db) return seededPosts();

  const result = await db
    .prepare("SELECT * FROM journal_posts WHERE region_slug = ?")
    .bind(region.slug)
    .all<D1Row>();
  const stored = (result.results || []).map(fromRow);
  const storedSlugs = new Set(stored.map((post) => post.slug));
  const posts = [...stored, ...seededPosts().filter((post) => !storedSlugs.has(post.slug))];

  return posts
    .filter((post) => includeDrafts || post.status === "published")
    .sort((first, second) => {
      const firstDate = first.publishedAt || first.updatedAt;
      const secondDate = second.publishedAt || second.updatedAt;
      return secondDate.localeCompare(firstDate);
    });
}

export async function getPost(slug: string, includeDrafts = false): Promise<JournalPost | null> {
  const stored = await getStoredPost(slug);
  if (stored) return includeDrafts || stored.status === "published" ? stored : null;
  return seededPosts().find((post) => post.slug === slug) || null;
}

export async function savePost(input: PostInput): Promise<JournalPost> {
  const db = await database();
  if (!db) throw new Error("Database binding DB is not configured.");
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const publishedAt = input.status === "published" ? input.publishedAt || now : null;

  await db
    .prepare(
      "INSERT INTO journal_posts (id,region_slug,slug,title,excerpt,body,tag,author,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(region_slug,slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,tag=excluded.tag,author=excluded.author,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at",
    )
    .bind(
      id,
      region.slug,
      input.slug,
      input.title,
      input.excerpt || "",
      input.body,
      input.tag || "COMMUNITY",
      input.author || region.siteName,
      input.status,
      publishedAt,
      input.createdAt || now,
      now,
    )
    .run();
  return (await getStoredPost(input.slug))!;
}

export async function updatePost(originalSlug: string, input: PostInput): Promise<JournalPost | null> {
  const db = await database();
  if (!db) throw new Error("Database binding DB is not configured.");

  const stored = await getStoredPost(originalSlug);
  const seeded = seededPosts().find((post) => post.slug === originalSlug);
  const existing = stored || seeded;
  if (!existing) return null;

  if (!stored) {
    if (input.slug !== originalSlug) {
      throw new PostSlugConflictError("Built-in article URLs cannot be changed.");
    }
    return savePost({ ...existing, ...input, id: crypto.randomUUID() });
  }

  return updateStoredPost(db, originalSlug, input);
}

export async function updateStoredPost(
  db: D1Database,
  originalSlug: string,
  input: PostInput,
): Promise<JournalPost | null> {
  const existing = await getStoredPost(originalSlug, db);
  if (!existing) return null;

  const seeded = seededPosts().find((post) => post.slug === originalSlug);
  if (seeded && input.slug !== originalSlug) {
    throw new PostSlugConflictError("Built-in article URLs cannot be changed.");
  }

  if (input.slug !== originalSlug) {
    const conflictingPost =
      (await getStoredPost(input.slug, db)) || seededPosts().find((post) => post.slug === input.slug);
    if (conflictingPost) throw new PostSlugConflictError("That article URL is already in use.");
  }

  const now = new Date().toISOString();
  const publishedAt = input.status === "published" ? existing.publishedAt || now : null;
  await db
    .prepare(
      "UPDATE journal_posts SET slug = ?, title = ?, excerpt = ?, body = ?, tag = ?, author = ?, status = ?, published_at = ?, updated_at = ? WHERE region_slug = ? AND slug = ?",
    )
    .bind(
      input.slug,
      input.title,
      input.excerpt || "",
      input.body,
      input.tag || "COMMUNITY",
      input.author || region.siteName,
      input.status,
      publishedAt,
      now,
      region.slug,
      originalSlug,
    )
    .run();
  return getStoredPost(input.slug, db);
}
