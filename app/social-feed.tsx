"use client";

import { useEffect, useState } from "react";
import { region, type SocialProvider } from "../config/regions";
import type { SocialItem } from "../lib/social";

type Profile = { label: string; profileUrl: string; handle: string };
type Payload = {
  items: SocialItem[];
  connected: Record<SocialProvider, boolean>;
  profiles: Record<SocialProvider, Profile>;
};

const fallback: Payload = {
  items: [],
  connected: { instagram: false, x: false, youtube: false },
  profiles: region.socials,
};

export function SocialFeed() {
  const [data, setData] = useState<Payload>(fallback);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch("/api/social-feed", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: Payload) => setData(payload))
      .catch(() => setData(fallback))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const profiles = Object.entries(data.profiles).filter(
    ([, profile]) => profile.profileUrl,
  ) as Array<[SocialProvider, Profile]>;
  const reviewItems: SocialItem[] = profiles.map(([provider, profile]) => ({
    id: `review-${provider}`,
    provider,
    text: `${profile.label} profile connection and feed card`,
    url: profile.profileUrl,
    publishedAt: "",
  }));
  const showingReviewItems = !data.items.length;
  const visibleItems = showingReviewItems ? reviewItems : data.items;

  return (
    <section className={`section social-section social-${region.presentation.home.socialVariant}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{region.presentation.copy.socialEyebrow}</p>
          <h2>{region.presentation.copy.socialHeading}</h2>
        </div>
        <div className="social-profile-links">
          {profiles.map(([provider, profile]) => (
            <a key={provider} href={profile.profileUrl} target="_blank" rel="noopener noreferrer">
              {profile.label} <span>{profile.handle}</span> ↗
            </a>
          ))}
        </div>
      </div>

      {showingReviewItems && (
        <div className="feed-empty">
          <strong>Review feed active — profile links and card interactions are ready.</strong>
          <p>
            These three labeled cards demonstrate the feed experience. Live provider posts replace them
            automatically when the server credentials listed in the handoff are added.
          </p>
        </div>
      )}

      {visibleItems.length ? (
        <div className="social-grid">
          {visibleItems.map((item) => (
            <a className="social-card" href={item.url} key={`${item.provider}-${item.id}`} target="_blank" rel="noopener noreferrer">
              {item.thumbnail && <>
                {/* eslint-disable-next-line @next/next/no-img-element -- provider thumbnails use dynamic external hosts */}
                <img src={item.thumbnail} alt="" />
              </>}
              <p className="story-meta">
                {showingReviewItems ? "REVIEW SAMPLE · " : ""}{item.provider.toUpperCase()}
              </p>
              <h3>{item.text}</h3>
              <span>{showingReviewItems ? "Open profile ↗" : "Open post ↗"}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="feed-empty">
          <strong>No social profiles are enabled.</strong>
          <p>Add profile URLs in Manager → Connections.</p>
        </div>
      )}
    </section>
  );
}
