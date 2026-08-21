"use client";

import { useEffect, useState } from "react";
import type { SocialConnection } from "../../lib/social-connections.server";

type FeedState = {
  connected?: Record<string, boolean>;
  configured?: Record<string, boolean>;
  errors?: Record<string, string>;
};

export function ConnectionsPanel() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [status, setStatus] = useState("");
  const [feed, setFeed] = useState<FeedState>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/social-connections").then((response) => response.json()),
      fetch("/api/social-feed").then((response) => response.json()),
    ])
      .then(([saved, current]) => {
        setConnections(saved.connections || []);
        setFeed(current || {});
      })
      .catch(() => setStatus("Could not load the current connection status."));
  }, []);

  const update = (
    index: number,
    key: keyof SocialConnection,
    value: string | boolean,
  ) =>
    setConnections((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );

  const save = async () => {
    setStatus("Saving…");
    try {
      const response = await fetch("/api/social-connections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connections }),
      });
      const payload = await response.json();
      if (response.ok) {
        setConnections(payload.connections);
        setStatus("Profile links saved. Feed credentials are managed securely by the hosting provider.");
      } else {
        setStatus(payload.error || "Could not save connections.");
      }
    } catch {
      setStatus("Could not reach the connection service. Please try again.");
    }
  };

  return (
    <>
      <p className="story-meta">SOCIAL CONNECTIONS</p>
      <h2>Profiles and feeds</h2>
      <p className="muted">
        Profile links work immediately. Each feed turns live after its provider credentials pass the server check.
      </p>
      {connections.map((connection, index) => {
        const live = Boolean(feed.connected?.[connection.provider]);
        const configured = Boolean(feed.configured?.[connection.provider]);
        const label = live ? "Feed live" : configured ? "Check failed" : "Credentials needed";
        return (
          <div className="connection-card" key={connection.provider}>
            <div className="connection-title">
              <strong>{connection.label}</strong>
              <span className={live ? "status-pill" : "module-state"}>{label}</span>
            </div>
            <label>
              Profile URL
              <input
                value={connection.profileUrl}
                onChange={(event) => update(index, "profileUrl", event.target.value)}
              />
            </label>
            <label>
              Handle
              <input
                value={connection.handle}
                onChange={(event) => update(index, "handle", event.target.value)}
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={connection.enabled}
                onChange={(event) => update(index, "enabled", event.target.checked)}
              />
              Show on public site
            </label>
            {feed.errors?.[connection.provider] && (
              <p className="muted">{feed.errors[connection.provider]}</p>
            )}
          </div>
        );
      })}
      <button className="button primary" onClick={save}>Save social links</button>
      {status && <p className="save-note" role="status">{status}</p>}
      <div className="credential-list">
        <strong>Server variables</strong>
        <code>INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID</code>
        <code>X_BEARER_TOKEN + X_USER_ID</code>
        <code>YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID</code>
      </div>
    </>
  );
}
