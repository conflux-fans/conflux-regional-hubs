import Link from "next/link";
import { RegionalShell } from "../components/regional-shell";
import { getRegionalConfig } from "../lib/content";
import { getStakingConfig } from "../lib/staking/config";
import { STAKING_CONTRACT_ADDRESS } from "../lib/staking/constants";
import { resolveRegion } from "../regional";
import { StakeClient } from "./stake-client";

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default async function StakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
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
            <span>Contract {shortAddress(STAKING_CONTRACT_ADDRESS)}</span>
            <p>APY is a historical metric, not a fixed or guaranteed return. Staking and unstaking have lock periods, and cross-space settlement or pool liquidity may delay principal withdrawals.</p>
          </aside>
        </header>
        {staking.enabled ? (
          <StakeClient rpcUrl={staking.rpcUrl} contractAddress={staking.contractAddress} poolFallbackName={`${region.name} Community PoS Pool`} />
        ) : (
          <section className="stake-disabled v2-wrap" role="status">
            <span>STAKING PAUSED</span>
            <h2>Staking is not available yet</h2>
            <p>{staking.configurationError ? "The launch configuration failed the security allowlist check." : "The feature is implemented but disabled by default. Enable it only after reviewing the proxy implementation, ABI, and read-only calls."}</p>
          </section>
        )}
      </main>
    </RegionalShell>
  );
}
