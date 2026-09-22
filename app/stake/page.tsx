import type { Metadata } from "next";
import Link from "next/link";
import { RegionalShell } from "../components/regional-shell";
import { getRegionalConfig } from "../lib/content";
import { stakeCopy } from "../lib/staking/copy";
import { getStakingConfig } from "../lib/staking/config";
import { regions, resolveRegion } from "../regional";
import { StakeClient } from "./stake-client";

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  const region = regions[resolveRegion(params.region)];
  return { title: `${region.stakeLabel} — ${region.wordmark}`, description: region.stakeIntro };
}

export default async function StakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));

  if (region.key === "latam") {
    const locale = region.locale === "en" ? "en" : "es";
    const copy = stakeCopy(locale).page;
    const staking = getStakingConfig();
    return (
      <RegionalShell region={region}>
        <main className="v2-stake-page stake-app">
          <section className="v2-stake-hero v2-wrap">
            <div>
              <p className="caudal-eyebrow">CONFLUX / CFX</p>
              <h1>{region.stakeLabel}</h1>
              <p>{region.stakeIntro}</p>
              <Link href="/?region=latam">← {locale === "en" ? "Home" : "Inicio"}</Link>
            </div>
            <div className="v2-wallet-card">
              {staking.enabled ? (
                <>
                  <strong>{copy.network}</strong>
                  <span>{copy.contract(shortAddress(staking.contractAddress))}</span>
                  <p>{copy.disclaimer}</p>
                </>
              ) : (
                <>
                  <strong>{copy.disabledTitle}</strong>
                  <p>{copy.disabledBody}</p>
                  <button type="button" className="caudal-primary" disabled>{copy.disabledButton}</button>
                </>
              )}
            </div>
          </section>
          {staking.enabled && <StakeClient rpcUrl={staking.rpcUrl} contractAddress={staking.contractAddress} poolFallbackName="Conflux Latinoamérica PoS Pool" locale={locale} />}
        </main>
      </RegionalShell>
    );
  }

  const staking = getStakingConfig();
  return (
    <RegionalShell region={region}>
      <main className="stake-app">
        <header className="stake-heading v2-wrap">
          <div>
            <p className="v2-kicker">CONFLUX POS / {region.code}</p>
            <h1>{region.stakeLabel}</h1>
            <p>{region.stakeIntro}</p>
            <Link href={`/?region=${region.key}`}>← Home</Link>
          </div>
          <aside>
            <b>Conflux eSpace Mainnet</b>
            <span>Contract {staking.enabled ? shortAddress(staking.contractAddress) : "Unavailable"}</span>
            <p>APY is a historical metric, not a fixed or guaranteed return. Staking and unstaking have lock periods, and cross-space settlement or pool liquidity may delay principal withdrawals.</p>
          </aside>
        </header>
        {staking.enabled ? (
          <StakeClient rpcUrl={staking.rpcUrl} contractAddress={staking.contractAddress} poolFallbackName={`${region.name} Community PoS Pool`} />
        ) : (
          <section className="stake-disabled v2-wrap" role="status">
            <span>STAKING PAUSED</span>
            <h2>Staking is not available yet</h2>
            <p>{staking.configurationError ? "The launch configuration is incomplete or invalid." : "The feature is implemented but disabled by default. Enable it only after reviewing the proxy implementation, ABI, and read-only calls."}</p>
          </section>
        )}
      </main>
    </RegionalShell>
  );
}
