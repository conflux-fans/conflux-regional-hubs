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
            <b>Conflux eSpace 主网</b>
            <span>合约 {shortAddress(STAKING_CONTRACT_ADDRESS)}</span>
            <p>APY 是历史指标，不代表固定或保证收益。质押和赎回存在锁定期，跨空间结算及矿池流动性可能延迟本金提取。</p>
          </aside>
        </header>
        {staking.enabled ? (
          <StakeClient rpcUrl={staking.rpcUrl} contractAddress={staking.contractAddress} poolFallbackName={`${region.name} Community PoS Pool`} />
        ) : (
          <section className="stake-disabled v2-wrap" role="status">
            <span>STAKING PAUSED</span>
            <h2>质押功能暂未开放</h2>
            <p>{staking.configurationError ? "上线配置未通过安全白名单校验。" : "功能已随代码交付，但默认保持关闭；完成代理实现、ABI 和只读调用复核后再开启。"}</p>
          </section>
        )}
      </main>
    </RegionalShell>
  );
}
