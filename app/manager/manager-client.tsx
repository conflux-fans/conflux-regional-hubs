"use client";

import Link from "next/link";
import { useState } from "react";
import { region } from "../../config/regions";
import { ConnectionsPanel } from "./connections-panel";
import { JournalEditor } from "./journal-editor";

const labels: Record<string, string> = {
  "use-now": "Use now",
  "setup-later": "Set up later",
  "not-needed": "Not needed",
};

const modules = Object.entries(region.modules).map(([key, state]) => ({
  name: key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase()),
  state: labels[state],
  detail:
    state === "use-now"
      ? "Visible on the public regional site."
      : state === "setup-later"
        ? "Available in manager tools and hidden until connected."
        : "Excluded from public site and normal manager navigation.",
}));

export function ManagerClient({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState("Overview");
  const contributor = region.contributors[0];

  return (
    <main className="manager-page">
      <div className="manager-top">
        <Link href="/">← Public site</Link>
        <div className="manager-account">
          <strong>{region.siteName.toUpperCase()} / MANAGER · {displayName}</strong>
          <form action="/api/manager/session" method="post">
            <input type="hidden" name="action" value="logout" />
            <button type="submit">{region.presentation.copy.managerSignOutAction}</button>
          </form>
        </div>
      </div>
      <div className="manager-wrap">
        <div className="manager-title">
          <div>
            <p className="eyebrow">REGIONAL MANAGER</p>
            <h1>Welcome, {region.region}.</h1>
          </div>
          <span className="status-pill">Signed in</span>
        </div>
        <div className="manager-grid">
          <aside className="manager-nav">
            {["Overview", "Journal", "Contributors", "Modules", "Connections"].map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </aside>
          <section className="manager-content">
            {tab === "Overview" && (
              <>
                <p className="story-meta">SITE STATUS</p>
                <h2>Regional hub overview</h2>
                <p className="muted">
                  Content and connections are scoped to <strong>{region.siteName}</strong>.
                </p>
                {modules.filter((module) => module.state === "Use now").map((module) => (
                  <div className="module-row" key={module.name}>
                    <div>
                      <strong>{module.name}</strong>
                      <p>{module.detail}</p>
                    </div>
                    <span className="module-state">{module.state}</span>
                  </div>
                ))}
              </>
            )}
            {tab === "Journal" && <JournalEditor />}
            {tab === "Contributors" && (
              <>
                <p className="story-meta">PEOPLE</p>
                <h2>Contributor profiles</h2>
                {contributor && (
                  <div className="module-row">
                    <div>
                      <strong>{contributor.name} — {contributor.role}</strong>
                      <p>{contributor.visible ? "Visible" : "Hidden"} · {contributor.cardBio}</p>
                    </div>
                    <span className="module-state">Edit ↗</span>
                  </div>
                )}
              </>
            )}
            {tab === "Modules" && modules.map((module) => (
              <div className="module-row" key={module.name}>
                <div>
                  <strong>{module.name}</strong>
                  <p>{module.detail}</p>
                </div>
                <span className="module-state">{module.state}</span>
              </div>
            ))}
            {tab === "Connections" && <ConnectionsPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
