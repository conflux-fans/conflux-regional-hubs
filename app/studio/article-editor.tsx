"use client";

import { useRef, useState } from "react";
import { Markdown } from "../lib/markdown";
import type { LocalArticle } from "../lib/content";
import type { RegionKey } from "../regional";

type DraftState = { id?: number; slug?: string; title: string; excerpt: string; body: string; status: "draft" | "published" };
const blank: DraftState = { title: "", excerpt: "", body: "", status: "draft" };

export function ArticleEditor({ region, initialArticles }: { region: RegionKey; initialArticles: LocalArticle[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [draft, setDraft] = useState<DraftState>(blank);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(true);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function edit(article: LocalArticle) { setDraft({ id: article.id, slug: article.slug, title: article.title, excerpt: article.excerpt, body: article.body, status: article.status }); setStatus(""); }
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

  async function save(nextStatus: "draft" | "published") {
    setStatus(nextStatus === "draft" ? "Saving draft…" : "Publishing…");
    const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-article", region, ...draft, status: nextStatus }) });
    const data = await response.json() as { error?: string; article?: LocalArticle; url?: string };
    if (!response.ok || !data.article) { setStatus(data.error || "Could not save the article."); return; }
    setDraft({ ...data.article });
    setArticles((current) => [data.article!, ...current.filter((article) => article.id !== data.article!.id)]);
    setStatus(nextStatus === "draft" ? "Draft saved. You can reopen it from the list." : "Published. The stable article URL is ready to share.");
    if (data.url) window.setTimeout(() => { window.location.href = data.url!; }, 850);
  }

  return <div className="journal-editor-shell">
    <section className="manager-form journal-editor">
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
        <button type="button" className={preview ? "active" : ""} onClick={() => setPreview((value) => !value)}>{preview ? "Hide preview" : "Show preview"}</button>
      </div>
      <label className="setup-field"><span>Article body (Markdown)</span><textarea ref={bodyRef} className="studio-body markdown-source" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder={"Start writing…\n\n## Add a heading\nUse **bold**, *italic*, and [links](https://example.com)."} rows={16} /></label>
      {preview && <section className="markdown-preview"><span>LIVE PREVIEW</span><div className="article-body">{draft.body ? <Markdown source={draft.body} /> : <p>Your formatted article preview appears here.</p>}</div></section>}
      <div className="journal-editor-actions"><button type="button" onClick={() => save("draft")}>Save draft</button><button className="v2-button v2-button-accent" type="button" onClick={() => save("published")}>Publish to Crypto news <span>↗</span></button></div>
      {status && <output className="studio-status ok">{status}</output>}
    </section>
    <aside className="article-library"><header><span>YOUR JOURNAL</span><button type="button" onClick={() => { setDraft(blank); setStatus(""); }}>+ New article</button></header>{articles.length ? articles.map((article) => <button type="button" key={article.id} className={draft.id === article.id ? "active" : ""} onClick={() => edit(article)}><small>{article.status}</small><strong>{article.title}</strong><span>{new Date(article.publishedAt).toLocaleDateString()}</span></button>) : <p>No drafts or articles yet.</p>}</aside>
  </div>;
}
