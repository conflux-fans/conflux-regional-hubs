"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { region, type HomeSectionId } from "../config/regions";
import { SocialFeed } from "./social-feed";
import { Brand } from "./site-components";

type Contributor = (typeof region.contributors)[number];

function JournalSection() {
  if (region.modules.journal !== "use-now") return null;
  const variant = region.presentation.home.journalVariant;
  return (
    <section className={`section journal-preview journal-${variant}`}>
      <div className="section-heading">
        <div><p className="eyebrow">{region.presentation.copy.journalEyebrow}</p><h2>{region.journal.heading}</h2></div>
        <Link className="text-link" href="/journal">{region.presentation.copy.journalLink} ↗</Link>
      </div>
      {region.journal.stories.length ? (
        <div className="story-grid">
          {region.journal.stories.map((story, index) => (
            <article className="story" key={story.title}>
              <div className="story-index">{String(index + 1).padStart(2, "0")}</div>
              <div><p className="story-meta">{story.tag} · {story.date}</p><h3>{story.title}</h3><p>{story.deck}</p></div>
              <Link aria-label={`Read ${story.title}`} href={`/journal/${story.slug}`}>↗</Link>
            </article>
          ))}
        </div>
      ) : <div className="regional-empty"><strong>{region.journal.emptyMessage}</strong></div>}
    </section>
  );
}

function StakeSection() {
  if (region.modules.stake !== "use-now") return null;
  const variant = region.presentation.home.stakeVariant;
  return (
    <section className={`stake-banner stake-${variant}`}>
      {variant === "orbit" ? <div className="stake-orbit"><span>CFX</span></div> : <div className="stake-statement-mark">$CFX</div>}
      <div className="stake-copy">
        <p className="eyebrow">{region.stake.eyebrow}</p>
        <h2>{region.stake.homeHeading}</h2>
        <p>{region.stake.introduction}</p>
      </div>
      <Link className="button light" href="/stake">{region.presentation.copy.stakeLink} ↗</Link>
    </section>
  );
}

function ContributorsSection({ onOpen }: { onOpen: (profile: Contributor) => void }) {
  if (region.modules.contributors !== "use-now") return null;
  const profiles = region.contributors.filter((profile) => profile.visible);
  if (!profiles.length) return null;
  const variant = region.presentation.home.contributorsVariant;
  return (
    <section className={`section contributor-section contributors-${variant}`} id="contributors">
      <div className="section-heading">
        <div><p className="eyebrow">{region.presentation.copy.contributorsEyebrow}</p><h2>{region.presentation.copy.contributorsHeading}</h2></div>
        <p className="section-note">{region.presentation.copy.contributorsIntroduction}</p>
      </div>
      <div className="profile-grid">
        {profiles.map((profile) => (
          <button className="profile-card" key={profile.name} onClick={() => onOpen(profile)} aria-haspopup="dialog">
            <div className="portrait"><span>{profile.initials}</span></div>
            <div><p className="story-meta">{profile.role.toUpperCase()}</p><h3>{profile.name}</h3><p>{profile.cardBio}</p></div>
            <span className="profile-arrow">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function shouldShowSocial() {
  const states = [region.modules.instagram, region.modules.twitter, region.modules.youtube];
  return states.includes("use-now") || Object.values(region.socials).some((profile) => Boolean(profile.profileUrl));
}

function renderSection(id: HomeSectionId, onOpen: (profile: Contributor) => void) {
  if (id === "journal") return <JournalSection key={id} />;
  if (id === "stake") return <StakeSection key={id} />;
  if (id === "contributors") return <ContributorsSection key={id} onOpen={onOpen} />;
  if (id === "social" && shouldShowSocial()) return <SocialFeed key={id} />;
  return null;
}

export function HomeSections() {
  const [selected, setSelected] = useState<Contributor | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <>
      {region.presentation.home.sectionOrder.map((id) => renderSection(id, setSelected))}
      <section className="closing">
        <Brand large />
        <p>{region.presentation.copy.closingLine}</p>
      </section>
      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-name" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close profile">×</button>
            <div className="portrait large"><span>{selected.initials}</span></div>
            <p className="eyebrow">{selected.role}</p>
            <h2 id="profile-name">{selected.name}</h2>
            <p className="modal-bio">{selected.fullProfile}</p>
            <p className="muted">Portrait coming soon. This initials placeholder can be replaced by the regional manager.</p>
          </div>
        </div>
      )}
    </>
  );
}
