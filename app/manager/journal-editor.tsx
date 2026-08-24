"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { region } from "../../config/regions";
import { markdownToHtml, slugify, suggestedSlug } from "../../lib/markdown";
import type { JournalPost } from "../../lib/posts.server";

const STARTER_BODY =
  "## Start writing\n\nUse **bold text**, headings, lists and [links](https://example.com).\n\n- First point\n- Second point";

function updatedLabel(post: JournalPost): string {
  const date = new Date(post.updatedAt || post.createdAt);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function fetchPosts(): Promise<JournalPost[]> {
  const response = await fetch("/api/posts?includeDrafts=1");
  const payload = (await response.json()) as { posts?: JournalPost[]; error?: string };
  if (!response.ok) throw new Error(payload.error || "Could not load articles.");
  return payload.posts || [];
}

function isBuiltInPost(post: JournalPost): boolean {
  return region.journal.stories.some((story) => story.slug === post.slug);
}

export function JournalEditor() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [view, setView] = useState<"list" | "editor">("list");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [existingSlug, setExistingSlug] = useState("");
  const [builtInPost, setBuiltInPost] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<JournalPost["status"]>("draft");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState(STARTER_BODY);
  const [tag, setTag] = useState("COMMUNITY");
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const loadPosts = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setPosts(await fetchPosts());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialPosts = async () => {
      try {
        const loadedPosts = await fetchPosts();
        if (!cancelled) setPosts(loadedPosts);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load articles.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInitialPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const openNew = () => {
    setExistingSlug("");
    setBuiltInPost(false);
    setCurrentStatus("draft");
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setExcerpt("");
    setBody(STARTER_BODY);
    setTag("COMMUNITY");
    setAuthor("");
    setMessage("");
    setPublishedSlug("");
    setView("editor");
  };

  const editPost = (post: JournalPost) => {
    setExistingSlug(post.slug);
    setBuiltInPost(isBuiltInPost(post));
    setCurrentStatus(post.status);
    setTitle(post.title);
    setSlug(post.slug);
    setSlugEdited(true);
    setExcerpt(post.excerpt);
    setBody(post.body);
    setTag(post.tag);
    setAuthor(post.author);
    setMessage("");
    setPublishedSlug(post.status === "published" ? post.slug : "");
    setView("editor");
  };

  const insert = (before: string, after = "") => {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = body.slice(start, end) || "text";
    setBody(body.slice(0, start) + before + selected + after + body.slice(end));
    requestAnimationFrame(() => element.focus());
  };

  const save = async (status: "draft" | "published") => {
    if (!title.trim() || !body.trim()) {
      setMessage("Add a title and article body before saving.");
      return;
    }

    setSaving(true);
    setMessage("Saving...");
    try {
      const finalSlug = slugify(slug || title);
      const endpoint = existingSlug ? `/api/posts/${encodeURIComponent(existingSlug)}` : "/api/posts";
      const response = await fetch(endpoint, {
        method: existingSlug ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug: finalSlug, excerpt, body, tag, author, status }),
      });
      const payload = (await response.json()) as { post?: JournalPost; error?: string };
      if (!response.ok || !payload.post) {
        setMessage(payload.error || "Could not save this article.");
        return;
      }

      const savedPost = payload.post;
      setPosts((current) =>
        [savedPost, ...current.filter((post) => post.slug !== existingSlug && post.id !== savedPost.id)]
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      );
      setExistingSlug(savedPost.slug);
      setBuiltInPost(isBuiltInPost(savedPost));
      setCurrentStatus(savedPost.status);
      setSlug(savedPost.slug);
      setSlugEdited(true);
      setPublishedSlug(status === "published" ? savedPost.slug : "");
      setMessage(status === "published" ? "Article published." : "Draft saved.");
    } catch {
      setMessage("Could not reach the publishing service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (view === "list") {
    return (
      <div className="journal-manager">
        <div className="journal-manager-heading">
          <div>
            <p className="story-meta">JOURNAL</p>
            <h2>Articles</h2>
          </div>
          <button className="button primary" type="button" onClick={openNew}>New article</button>
        </div>

        {loading && <p className="journal-list-note" role="status">Loading articles...</p>}
        {loadError && (
          <div className="journal-list-note error" role="alert">
            <p>{loadError}</p>
            <button className="button quiet" type="button" onClick={() => void loadPosts()}>Try again</button>
          </div>
        )}
        {!loading && !loadError && posts.length === 0 && (
          <div className="journal-list-note">
            <strong>No articles yet.</strong>
            <p>Create the first Journal article for this regional hub.</p>
          </div>
        )}
        {!loading && !loadError && posts.length > 0 && (
          <div className="journal-list" aria-label="Journal articles">
            <div className="journal-list-header" aria-hidden="true">
              <span>Article</span><span>Status</span><span>Updated</span><span>Action</span>
            </div>
            {posts.map((post) => (
              <article className="journal-list-row" key={post.id}>
                <div className="journal-list-title">
                  <strong>{post.title}</strong>
                  <span>{post.tag} / {post.slug}</span>
                </div>
                <span className={`journal-status ${post.status}`}>{post.status}</span>
                <time dateTime={post.updatedAt}>{updatedLabel(post)}</time>
                <button
                  className="journal-edit-button"
                  type="button"
                  aria-label={`Edit article ${post.title}`}
                  onClick={() => editPost(post)}
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  const valid = Boolean(title.trim() && body.trim());
  return (
    <div className="journal-manager">
      <div className="journal-editor-heading">
        <button className="journal-back-button" type="button" onClick={() => setView("list")}>
          Back to articles
        </button>
        <div>
          <p className="story-meta">{existingSlug ? "EDIT ARTICLE" : "NEW ARTICLE"}</p>
          <h2>{existingSlug ? title || "Untitled article" : "Create article"}</h2>
        </div>
      </div>
      <div className="editor-shell">
        <div className="editor-fields">
          <div className="input-demo">
            <label htmlFor="journal-title">Title</label>
            <input
              id="journal-title"
              required
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                setSlug(suggestedSlug(nextTitle, slug, slugEdited));
              }}
              placeholder="Article title"
            />
            <label htmlFor="journal-slug">URL slug</label>
            <input
              id="journal-slug"
              value={slug}
              disabled={builtInPost}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="article-url"
            />
            {builtInPost && <small className="field-note">The URL for a built-in article stays fixed.</small>}
            <label htmlFor="journal-excerpt">Excerpt</label>
            <textarea
              id="journal-excerpt"
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="Short social description"
            />
            <div className="field-pair">
              <div>
                <label htmlFor="journal-category">Category</label>
                <input id="journal-category" value={tag} onChange={(event) => setTag(event.target.value)} />
              </div>
              <div>
                <label htmlFor="journal-author">Author</label>
                <input id="journal-author" value={author} onChange={(event) => setAuthor(event.target.value)} />
              </div>
            </div>
            <label htmlFor="journal-body">Article</label>
            <div className="markdown-toolbar" aria-label="Article formatting">
              <button type="button" onClick={() => insert("**", "**")}>Bold</button>
              <button type="button" onClick={() => insert("## ")}>H2</button>
              <button type="button" onClick={() => insert("### ")}>H3</button>
              <button type="button" onClick={() => insert("- ")}>List</button>
              <button type="button" onClick={() => insert("[", "](https://example.com)")}>Link</button>
              <button type="button" onClick={() => insert("> ")}>Quote</button>
            </div>
            <textarea
              id="journal-body"
              ref={textarea}
              className="markdown-input"
              rows={18}
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <div className="editor-actions">
            <button className="button quiet" type="button" disabled={!valid || saving} onClick={() => save("draft")}>
              {currentStatus === "published" ? "Unpublish article" : "Save draft"}
            </button>
            <button className="button primary" type="button" disabled={!valid || saving} onClick={() => save("published")}>
              {currentStatus === "published" ? "Update article" : "Publish article"}
            </button>
          </div>
          {message && (
            <p className="save-note" role="status">
              {message}
              {publishedSlug && <> <Link href={`/journal/${publishedSlug}`}>Open article</Link></>}
            </p>
          )}
        </div>
        <aside className="editor-preview">
          <p className="story-meta">LIVE PREVIEW</p>
          <h1>{title || "Article title"}</h1>
          <p className="article-deck">{excerpt || "Your excerpt appears here."}</p>
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }} />
        </aside>
      </div>
    </div>
  );
}
