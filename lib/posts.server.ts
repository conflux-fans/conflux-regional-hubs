import type Database from "better-sqlite3";
import { region } from "../config/regions.ts";
import { getDatabase } from "./database.server.ts";

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

export type PostInput = Partial<JournalPost> &
  Pick<JournalPost, "title" | "slug" | "body" | "status">;
type SqliteRow = Record<string, unknown>;

export class PostSlugConflictError extends Error {}

function fromRow(row: SqliteRow): JournalPost {
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

function getStoredPost(database: Database.Database, slug: string): JournalPost | null {
  const row = database
    .prepare("SELECT * FROM journal_posts WHERE region_slug = ? AND slug = ? LIMIT 1")
    .get(region.slug, slug) as SqliteRow | undefined;
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

export function createPostStore(database: Database.Database) {
  const listPosts = async (includeDrafts = false): Promise<JournalPost[]> => {
    const stored = database
      .prepare("SELECT * FROM journal_posts WHERE region_slug = ?")
      .all(region.slug) as SqliteRow[];
    const normalizedStored = stored.map(fromRow);
    const storedSlugs = new Set(normalizedStored.map((post) => post.slug));
    const posts = [
      ...normalizedStored,
      ...seededPosts().filter((post) => !storedSlugs.has(post.slug)),
    ];

    return posts
      .filter((post) => includeDrafts || post.status === "published")
      .sort((first, second) => {
        const firstDate = first.publishedAt || first.updatedAt;
        const secondDate = second.publishedAt || second.updatedAt;
        return secondDate.localeCompare(firstDate);
      });
  };

  const getPost = async (
    slug: string,
    includeDrafts = false,
  ): Promise<JournalPost | null> => {
    const stored = getStoredPost(database, slug);
    if (stored) return includeDrafts || stored.status === "published" ? stored : null;
    return seededPosts().find((post) => post.slug === slug) || null;
  };

  const savePost = async (input: PostInput): Promise<JournalPost> => {
    const now = new Date().toISOString();
    const id = input.id || crypto.randomUUID();
    const publishedAt = input.status === "published" ? input.publishedAt || now : null;

    database.prepare(
      "INSERT INTO journal_posts (id,region_slug,slug,title,excerpt,body,tag,author,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(region_slug,slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,tag=excluded.tag,author=excluded.author,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at",
    ).run(
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
    );
    return getStoredPost(database, input.slug)!;
  };

  const updatePost = async (
    originalSlug: string,
    input: PostInput,
  ): Promise<JournalPost | null> => {
    const stored = getStoredPost(database, originalSlug);
    const seeded = seededPosts().find((post) => post.slug === originalSlug);
    const existing = stored || seeded;
    if (!existing) return null;

    if (!stored) {
      if (input.slug !== originalSlug) {
        throw new PostSlugConflictError("Built-in article URLs cannot be changed.");
      }
      return savePost({ ...existing, ...input, id: crypto.randomUUID() });
    }

    if (seeded && input.slug !== originalSlug) {
      throw new PostSlugConflictError("Built-in article URLs cannot be changed.");
    }
    if (input.slug !== originalSlug) {
      const conflictingPost =
        getStoredPost(database, input.slug) ||
        seededPosts().find((post) => post.slug === input.slug);
      if (conflictingPost) throw new PostSlugConflictError("That article URL is already in use.");
    }

    const now = new Date().toISOString();
    const publishedAt = input.status === "published" ? existing.publishedAt || now : null;
    database.prepare(
      "UPDATE journal_posts SET slug = ?, title = ?, excerpt = ?, body = ?, tag = ?, author = ?, status = ?, published_at = ?, updated_at = ? WHERE region_slug = ? AND slug = ?",
    ).run(
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
    );
    return getStoredPost(database, input.slug);
  };

  return { listPosts, getPost, savePost, updatePost };
}

export async function listPosts(includeDrafts = false): Promise<JournalPost[]> {
  return createPostStore(getDatabase()).listPosts(includeDrafts);
}

export async function getPost(
  slug: string,
  includeDrafts = false,
): Promise<JournalPost | null> {
  return createPostStore(getDatabase()).getPost(slug, includeDrafts);
}

export async function savePost(input: PostInput): Promise<JournalPost> {
  return createPostStore(getDatabase()).savePost(input);
}

export async function updatePost(
  originalSlug: string,
  input: PostInput,
): Promise<JournalPost | null> {
  return createPostStore(getDatabase()).updatePost(originalSlug, input);
}
