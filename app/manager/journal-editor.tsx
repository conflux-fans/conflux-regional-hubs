"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { markdownToHtml, slugify, suggestedSlug } from "../../lib/markdown";

export function JournalEditor() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState(
    "## Start writing\n\nUse **bold text**, headings, lists and [links](https://example.com).\n\n- First point\n- Second point",
  );
  const [tag, setTag] = useState("COMMUNITY");
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

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
    setMessage("Saving…");
    try {
      const finalSlug = slugify(slug || title);
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          slug: finalSlug,
          excerpt,
          body,
          tag,
          author,
          status,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Could not save this article.");
        return;
      }
      setSlug(finalSlug);
      setSlugEdited(true);
      setPublishedSlug(status === "published" ? finalSlug : "");
      setMessage(
        status === "published"
          ? "Published successfully. The article URL is ready to share."
          : "Draft saved successfully.",
      );
    } catch {
      setMessage("Could not reach the publishing service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const valid = Boolean(title.trim() && body.trim());
  return (
    <div className="editor-shell">
      <div className="editor-fields">
        <div className="input-demo">
          <label htmlFor="journal-title">Title</label>
          <input
            id="journal-title"
            required
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              setSlug(suggestedSlug(value, slug, slugEdited));
            }}
            placeholder="Article title"
          />
          <label htmlFor="journal-slug">URL slug</label>
          <input
            id="journal-slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(slugify(event.target.value));
            }}
            placeholder="article-url"
          />
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
          <button className="button quiet" disabled={!valid || saving} onClick={() => save("draft")}>Save draft</button>
          <button className="button primary" disabled={!valid || saving} onClick={() => save("published")}>Publish article</button>
        </div>
        {message && (
          <p className="save-note" role="status">
            {message}
            {publishedSlug && <> <Link href={`/journal/${publishedSlug}`}>Open article ↗</Link></>}
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
  );
}
