import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { RegionalConfig } from "../regional";
import { KudiLogo } from "./kudi-logo";

export function RegionalShell({ region, children }: { region: RegionalConfig; children: ReactNode }) {
  const style = {
    "--region-accent": region.accent,
    "--region-secondary": region.secondary,
    "--region-tertiary": region.tertiary,
    "--region-on-accent": region.onAccent,
    "--region-surface": region.surface,
  } as CSSProperties;
  const suffix = `?region=${region.key}`;
  const mark = region.key === "africa" ? "K" : region.code.slice(0, 1);

  return (
    <div className={`regional-site region-${region.key} layout-${region.layout}`} style={style}>
      <div className="regional-demo-bar"><div className="v2-wrap"><span>KUDI HUB / AFRICA REGIONAL WEBSITE</span><b>{region.domain}</b></div></div>
      <header className="v2-header">
        <div className="v2-wrap v2-header-inner">
          <Link href={`/${suffix}`} className="v2-brand" aria-label={`${region.wordmark} home`}>
            {region.key === "africa" ? <KudiLogo /> : <span className={`v2-mark v2-mark-${region.logoStyle}`} data-mark={mark} aria-hidden="true"><i /><i /><i /></span>}
            <span><strong>{region.wordmark}</strong><small>CONFLUX AFRICA COMMUNITY</small></span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href={`/insights${suffix}`}>{region.journalLabel}</Link>
            <Link href={`/stake${suffix}`}>{region.stakeLabel}</Link>
            {region.communityLinks.length > 0 && <a href="#community">{region.communityLabel}</a>}
          </nav>
          <Link className="demo-login-pill" href="/login?return_to=/studio">Manager login <span>→</span></Link>
        </div>
      </header>
      {children}
      <footer className="v2-footer">
        <div className="v2-wrap"><div className="v2-footer-brand">{region.key === "africa" ? <KudiLogo /> : <span className={`v2-mark v2-mark-${region.logoStyle}`} data-mark={mark} aria-hidden="true"><i /><i /><i /></span>}<strong>{region.wordmark}</strong></div><p>{region.domain} · {region.footerText}</p><small>© 2026 · Interactive regional template · Not financial advice.</small></div>
      </footer>
    </div>
  );
}
