"use client";

import { useMemo, useState } from "react";

export function ShareActions({ title, canonicalUrl }: { title: string; canonicalUrl: string }) {
  const [copied, setCopied] = useState("");
  const links = useMemo(() => ({
    x: `https://x.com/intent/post?${new URLSearchParams({ text: title, url: canonicalUrl })}`,
    telegram: `https://t.me/share/url?${new URLSearchParams({ url: canonicalUrl, text: title })}`,
  }), [canonicalUrl, title]);

  async function copy(label: string) {
    await navigator.clipboard.writeText(`${title}\n${canonicalUrl}`);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <section className="article-share" aria-labelledby="share-heading">
      <div><span>SHARE THIS STORY</span><h2 id="share-heading">Send it to your community.</h2></div>
      <div>
        <a href={links.x} target="_blank" rel="noreferrer">Share on X ↗</a>
        <a href={links.telegram} target="_blank" rel="noreferrer">Share on Telegram ↗</a>
        <a href="https://discord.com/channels/@me" target="_blank" rel="noreferrer" onClick={() => copy("discord")}>{copied === "discord" ? "Link copied—open Discord ✓" : "Copy + open Discord ↗"}</a>
        <button type="button" onClick={() => copy("link")}>{copied === "link" ? "Copied ✓" : "Copy article link"}</button>
      </div>
    </section>
  );
}
