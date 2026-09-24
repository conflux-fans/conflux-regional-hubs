"use client";

import { useEffect, useRef, useState } from "react";
import type { RegionalContributor } from "../lib/content";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CFX";
}

function Portrait({ contributor, large = false }: { contributor: RegionalContributor; large?: boolean }) {
  return <span className={`contributor-portrait ${large ? "large" : ""}`}>
    {contributor.photoUrl ? <>
      {/* Portrait hosts are chosen by each regional manager, so this intentionally remains a standard remote image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={contributor.photoUrl} alt={`Portrait of ${contributor.name}`} />
    </> : <b aria-label={`${contributor.name} photo placeholder`}>{initials(contributor.name)}</b>}
  </span>;
}

export function Contributors({ contributors, title, subtitle, locale = "en" }: { contributors: RegionalContributor[]; title: string; subtitle: string; locale?: "en" | "es" }) {
  const visible = contributors.filter((item) => item.isVisible);
  const [active, setActive] = useState<RegionalContributor | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "Tab") { event.preventDefault(); dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; previous?.focus(); };
  }, [active]);

  if (!visible.length) return null;
  return <section className="contributors-section v2-wrap" id="contributors">
    <div className="contributors-heading"><div><p className="v2-kicker">{locale === "es" ? "EL EQUIPO / CONFLUX LATAM" : "THE PEOPLE / REGIONAL HUB"}</p><h2>{title}</h2></div><p>{subtitle}</p></div>
    <div className="contributors-grid">{visible.map((contributor) => <button type="button" key={`${contributor.name}-${contributor.role}`} className="contributor-card" onClick={() => setActive(contributor)} aria-haspopup="dialog">
      <Portrait contributor={contributor} />
      <span><small>{contributor.role}</small><strong>{contributor.name}</strong><p>{contributor.shortBio}</p><i>{locale === "es" ? "Ver perfil" : "View profile"} ↗</i></span>
    </button>)}</div>
    {active && <div className="contributor-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setActive(null); }}>
      <section ref={dialogRef} className="contributor-modal" role="dialog" aria-modal="true" aria-labelledby="contributor-modal-name" lang={locale}>
        <button type="button" className="contributor-modal-close" onClick={() => setActive(null)} aria-label={locale === "es" ? "Cerrar perfil" : "Close contributor profile"}>×</button>
        <Portrait contributor={active} large />
        <div><p className="v2-kicker">{locale === "es" ? "COLABORADOR REGIONAL" : "REGIONAL CONTRIBUTOR"}</p><h2 id="contributor-modal-name">{active.name}</h2><strong>{active.role}</strong><p>{active.fullBio}</p></div>
      </section>
    </div>}
  </section>;
}
