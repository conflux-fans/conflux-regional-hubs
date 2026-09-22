import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { RegionalConfig } from "../regional";
import { KudiLogo } from "./kudi-logo";
import { CaudalLocale } from "./caudal-locale";

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

  if (region.key === "latam") return (
    <div className="regional-site region-latam" style={style} lang={region.locale || "es"}>
      <a className="caudal-skip" href="#caudal-main">{region.locale === "en" ? "Skip to content" : "Saltar al contenido"}</a>
      <header className="caudal-header">
        <Link href={`/${suffix}`} aria-label="Caudal">
          <span className="caudal-logo">
            {/* The Caudal wordmark is a pre-cropped brand asset; a standard img keeps the CSS crop positioning intact. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/caudal/logo-1.svg" alt="CAUDAL" />
          </span>
        </Link>
        <nav aria-label={region.locale === "en" ? "Main navigation" : "Navegación principal"}>
          <Link href={`/journal${suffix}`}>{region.journalLabel}</Link>
          <Link href={`/stake${suffix}`}>{region.stakeLabel}</Link>
          <Link href={`/${suffix}#community`}>{region.communityLabel}</Link>
        </nav>
        <CaudalLocale locale={region.locale || "es"} />
      </header>
      <div id="caudal-main">{children}</div>
      <footer className="caudal-footer">
        <div><strong>CAUDAL</strong><p>{region.footerText}</p></div>
        <nav>
          <Link href={`/studio${suffix}`}>{region.locale === "en" ? "Manager login" : "Acceso de gestión"}</Link>
          <Link href="/caudal-handoff">{region.locale === "en" ? "Developer handoff" : "Guía de desarrollo"}</Link>
        </nav>
        <small>{region.locale === "en" ? "Staking transactions are not enabled." : "Las transacciones de staking no están habilitadas."}</small>
      </footer>
    </div>
  );

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
            <Link href={`/journal${suffix}`}>{region.journalLabel}</Link>
            <Link href={`/stake${suffix}`}>{region.stakeLabel}</Link>
            {region.communityLinks.length > 0 && <a href="#community">{region.communityLabel}</a>}
          </nav>
          <Link className="demo-login-pill" href="/login?return_to=/studio">Manager login <span>→</span></Link>
        </div>
      </header>
      {children}
      <footer className="v2-footer">
        <div className="v2-wrap"><div className="v2-footer-brand">{region.key === "africa" ? <KudiLogo /> : <span className={`v2-mark v2-mark-${region.logoStyle}`} data-mark={mark} aria-hidden="true"><i /><i /><i /></span>}<strong>{region.wordmark}</strong></div><p>{region.domain} · {region.footerText}</p><small>© 2026 · Kudi Hub</small></div>
      </footer>
    </div>
  );
}
