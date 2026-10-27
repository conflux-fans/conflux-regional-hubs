"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Markdown } from "../lib/markdown";
import type { LocalArticle } from "../lib/content";
import type { RegionKey } from "../regional";

type DraftState = { id?: number; slug?: string; title: string; excerpt: string; body: string; status: "draft" | "published" };
type Notice = { message: string; tone: "ok" | "error"; url?: string };
const blank: DraftState = { title: "", excerpt: "", body: "", status: "draft" };

export function ArticleEditor({ region, initialArticles }: { region: RegionKey; initialArticles: LocalArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [draft, setDraft] = useState<DraftState>(blank);
  const [view, setView] = useState<"list" | "editor">("list");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [preview, setPreview] = useState(true);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function startArticle() {
    setDraft(blank);
    setNotice(null);
    setView("editor");
  }

  function edit(article: LocalArticle) {
    setDraft({ id: article.id, slug: article.slug, title: article.title, excerpt: article.excerpt, body: article.body, status: article.status });
    setNotice(null);
    setView("editor");
  }

  function insert(before: string, after: string, placeholder: string) {
    const field = bodyRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = draft.body.slice(start, end) || placeholder;
    const next = `${draft.body.slice(0, start)}${before}${selected}${after}${draft.body.slice(end)}`;
    setDraft((current) => ({ ...current, body: next }));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }

  function insertText(value: string) {
    const field = bodyRef.current;
    if (!field) { setDraft((current) => ({ ...current, body: current.body + value })); return; }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    setDraft((current) => ({ ...current, body: `${current.body.slice(0, start)}${value}${current.body.slice(end)}` }));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + value.length, start + value.length); });
  }

  async function uploadImage(file: File) {
    if (file.size > 2 * 1024 * 1024) { setNotice({ message: "Images must be 2 MB or smaller.", tone: "error" }); return; }
    setNotice({ message: "Uploading image…", tone: "ok" });
    try {
      const form = new FormData();
      form.set("action", "upload-image");
      form.set("file", file);
      const response = await fetch("/api/studio", { method: "POST", body: form });
      const data = await response.json() as { error?: string; url?: string };
      if (!response.ok || !data.url) { setNotice({ message: data.error || "Could not upload the image.", tone: "error" }); return; }
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "").slice(0, 80) || "image";
      insertText(`\n\n![${alt}](${data.url})\n\n`);
      setNotice({ message: "Image added to the article body.", tone: "ok" });
    } catch {
      setNotice({ message: "Could not upload the image. Check your connection and try again.", tone: "error" });
    }
  }

  async function save(nextStatus: "draft" | "published") {
    setNotice({ message: nextStatus === "draft" ? "Saving draft…" : draft.status === "published" ? "Updating published article…" : "Publishing…", tone: "ok" });
    const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-article", region, ...draft, status: nextStatus }) });
    const data = await response.json() as { error?: string; article?: LocalArticle; url?: string };
    if (!response.ok || !data.article) { setNotice({ message: data.error || "Could not save the article.", tone: "error" }); return; }
    setDraft({ ...data.article });
    setArticles((current) => [data.article!, ...current.filter((article) => article.id !== data.article!.id)]);
    setNotice({
      message: nextStatus === "draft" ? "Draft saved. You can reopen it from the article list." : draft.status === "published" ? "Published article updated." : "Article published.",
      tone: "ok",
      url: data.url,
    });
  }

  async function deleteArticle(article: LocalArticle) {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    setNotice({ message: "Deleting article…", tone: "ok" });
    try {
      const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete-article", region, id: article.id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setNotice({ message: data.error || "Could not delete the article.", tone: "error" }); return; }
      setArticles((current) => current.filter((item) => item.id !== article.id));
      setDraft((current) => current.id === article.id ? blank : current);
      setNotice({ message: `“${article.title}” was deleted.`, tone: "ok" });
    } catch {
      setNotice({ message: "Could not delete the article. Check your connection and try again.", tone: "error" });
    }
  }

  if (view === "list") {
    const publishedCount = articles.filter((article) => article.status === "published").length;
    const draftCount = articles.length - publishedCount;

    return <section className="manager-form article-manager">
      <header className="article-manager-head">
        <div className="manager-heading"><span>JOURNAL / ARTICLE MANAGEMENT</span><h2>Manage your articles</h2><p>Open any draft or published article to edit its title, summary, or body.</p></div>
        <button className="v2-button v2-button-dark" type="button" onClick={startArticle}>New article <span>＋</span></button>
      </header>
      <div className="article-manager-counts" aria-label="Article totals"><span><b>{articles.length}</b>All articles</span><span><b>{publishedCount}</b>Published</span><span><b>{draftCount}</b>Drafts</span></div>
      {notice && <output className={`studio-status ${notice.tone}`}>{notice.message}</output>}
      {articles.length ? <div className="article-manager-list">
        {articles.map((article) => <article key={article.id}>
          <div className="article-manager-status"><span className={`article-status article-status-${article.status}`}>{article.status}</span><time dateTime={new Date(article.publishedAt).toISOString()}>{new Date(article.publishedAt).toLocaleDateString()}</time></div>
          <div className="article-manager-copy"><h3>{article.title}</h3><p>{article.excerpt}</p></div>
          <div className="article-manager-actions"><button type="button" onClick={() => edit(article)}>Edit</button>{article.status === "published" && <Link href={`/journal/${article.slug}?region=${region}`}>View article ↗</Link>}<button className="article-delete-button" type="button" onClick={() => deleteArticle(article)} aria-label={`Delete ${article.title}`}>Delete</button></div>
        </article>)}
      </div> : <div className="article-manager-empty"><h3>No articles yet.</h3><p>Create the first Journal article, save it as a draft, or publish it when ready.</p><button type="button" onClick={startArticle}>Create an article →</button></div>}
    </section>;
  }

  return <div className="journal-editor-shell">
    <section className="manager-form journal-editor">
      <button className="article-editor-back" type="button" onClick={() => { setView("list"); setNotice(null); }}>← Back to articles</button>
      <div className="manager-heading"><span>JOURNAL / MARKDOWN PUBLISHING</span><h2>Write, preview, and publish.</h2><p>Use the toolbar or type Markdown directly. Drafts remain editable; published stories keep the same shareable URL.</p></div>
      <label className="setup-field"><span>Article title</span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="A clear, useful headline" maxLength={140} /></label>
      <label className="setup-field"><span>Short summary</span><textarea value={draft.excerpt} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Shown on article cards and social previews" rows={3} maxLength={320} /></label>
      <div className="markdown-toolbar" aria-label="Article formatting">
        <button type="button" onClick={() => insert("## ", "", "Section heading")}>H2</button>
        <button type="button" onClick={() => insert("### ", "", "Smaller heading")}>H3</button>
        <button type="button" onClick={() => insert("**", "**", "bold text")}><b>Bold</b></button>
        <button type="button" onClick={() => insert("*", "*", "italic text")}><i>Italic</i></button>
        <button type="button" onClick={() => insert("[", "](https://example.com)", "link text")}>Link</button>
        <button type="button" onClick={() => insert("- ", "", "list item")}>• List</button>
        <button type="button" onClick={() => insert("> ", "", "quote")}>Quote</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Image ↑</button>
        <button type="button" onClick={() => insertText("\n\nhttps://www.youtube.com/watch?v=\n\n")}>Video ▶</button>
        <button type="button" className={preview ? "active" : ""} onClick={() => setPreview((value) => !value)}>{preview ? "Hide preview" : "Show preview"}</button>
      </div>
      <label className="setup-field"><span>Article body (Markdown)</span><textarea ref={bodyRef} className="studio-body markdown-source" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder={"Start writing…\n\n## Add a heading\nUse **bold**, *italic*, and [links](https://example.com).\nUpload images with the Image button, or paste a video link (YouTube, Vimeo, Bilibili, RuTube, VK) on its own line to embed it."} rows={16} /></label>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadImage(file); }} />
      {preview && <section className="markdown-preview"><span>LIVE PREVIEW</span><div className="article-body">{draft.body ? <Markdown source={draft.body} /> : <p>Your formatted article preview appears here.</p>}</div></section>}
      <div className={`journal-editor-actions ${draft.status === "published" ? "published" : ""}`}>{draft.status === "draft" && <button type="button" onClick={() => save("draft")}>Save draft</button>}<button className="v2-button v2-button-accent" type="button" onClick={() => save("published")}>{draft.status === "published" ? "Update published article" : "Publish to Crypto news"} <span>↗</span></button></div>
      {notice && <output className={`studio-status ${notice.tone}`}>{notice.message}{notice.url && <> <Link href={notice.url}>View article ↗</Link></>}</output>}
    </section>
  </div>;
}
