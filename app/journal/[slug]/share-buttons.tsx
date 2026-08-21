"use client";

import { useMemo, useState } from "react";
import { shareUrls } from "../../../lib/share";

type Props = {
  title: string;
  articlePath: string;
  canonicalUrl: string | null;
};

export function ShareButtons({ title, articlePath, canonicalUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const url = canonicalUrl || articlePath;

  const links = useMemo(() => shareUrls(url, title), [title, url]);
  const copy = async () => {
    const shareUrl = url || window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };
  const discord = async () => {
    await copy();
    window.open(links.discord, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="share-row" aria-label="Share this article">
      <span>Share</span>
      <a href={links.x} target="_blank" rel="noopener noreferrer">
        X ↗
      </a>
      <a href={links.telegram} target="_blank" rel="noopener noreferrer">
        Telegram ↗
      </a>
      <button type="button" onClick={discord}>
        {copied ? "Link copied — open Discord ↗" : "Discord ↗"}
      </button>
      <button type="button" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
