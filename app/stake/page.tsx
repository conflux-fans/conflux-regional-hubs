import Link from "next/link";
import { ConnectWallet } from "../components/connect-wallet";
import { RegionalShell } from "../components/regional-shell";
import { getRegionalConfig } from "../lib/content";
import { resolveRegion } from "../regional";

export default async function StakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const region = await getRegionalConfig(resolveRegion(params.region));
  return (
    <RegionalShell region={region}>
      <main className="v2-stake-page">
        <section className="v2-stake-hero v2-wrap">
          <div><p className="v2-kicker">CONFLUX POS / {region.code}</p><h1>{region.stakeLabel}</h1><p>One secure staking experience, shared across every regional site.</p><Link href={`/?region=${region.key}`}>← Home</Link></div>
          <div className="v2-wallet-card"><div><span className="v2-live"><i /> CORE MODULE</span><strong>Community staking pool</strong></div><p>Connect a Conflux-compatible wallet to continue.</p><ConnectWallet /><small>The wallet and contract layer remains centrally maintained.</small></div>
        </section>
        <section className="v2-boundaries v2-wrap"><div><span>REGIONAL TEAMS EDIT</span><p>Language, colors, editorial feed, community links, local events, and supporting visuals.</p></div><div><span>CORE TEAM MAINTAINS</span><p>Wallet connections, contracts, fees, risk disclosures, security, analytics, and accessibility.</p></div></section>
      </main>
    </RegionalShell>
  );
}
