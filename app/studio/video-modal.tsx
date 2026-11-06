"use client";

import { useEffect, useRef, useState } from "react";
import { VideoEmbedPlayer } from "../components/video-embed-player";
import { videoEmbedUrl } from "../lib/video-embed";

const providerLabel = { youtube: "YouTube", vimeo: "Vimeo", bilibili: "Bilibili", rutube: "RuTube", vk: "VK" } as const;

/**
 * Video insert helper for the Journal editor: paste a whitelisted link,
 * confirm it against the live preview, and the URL lands in the article body.
 */
export function VideoModal({ onClose, onInsert }: { onClose: () => void; onInsert: (url: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const embed = trimmed ? videoEmbedUrl(trimmed) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog ref={dialogRef} className="video-modal" aria-labelledby="video-modal-title" onClose={onClose}>
      <header>
        <div><span>JOURNAL / EMBED VIDEO</span><h2 id="video-modal-title">Add a video</h2></div>
        <button type="button" aria-label="Close video dialog" title="Close" onClick={() => dialogRef.current?.close()}>×</button>
      </header>
      <div className="video-modal-body">
        <p>Paste a video page link, check the preview, then insert. The link sits on its own line in the article body.</p>
        <label className="setup-field"><span>Video link</span>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
          />
        </label>
        {trimmed && !embed && <output className="video-modal-status error" role="alert">Not a supported video link yet. Supported: YouTube, Vimeo, Bilibili (BV links), RuTube, VK.</output>}
        {embed && <output className="video-modal-status ok">{providerLabel[embed.provider]} video detected.</output>}
        {embed && <div className="video-modal-preview"><VideoEmbedPlayer url={trimmed} /></div>}
        <div className="video-modal-actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button className="v2-button v2-button-accent" type="button" disabled={!embed} onClick={() => { onInsert(trimmed); dialogRef.current?.close(); }}>Insert video <span>↓</span></button>
        </div>
      </div>
    </dialog>
  );
}
