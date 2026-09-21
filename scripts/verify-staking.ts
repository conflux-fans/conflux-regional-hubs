import { getAddress } from "ethers";
import { formatApy, formatCfx, formatDripAsCfx } from "../app/lib/staking/amounts.ts";
import { resolveStakingConfig } from "../app/lib/staking/config.ts";
import {
  CONFLUX_ESPACE_RPC_URL,
} from "../app/lib/staking/constants.ts";
import { createReadPoolAdapter } from "../app/lib/staking/pos-pool.ts";

const staking = resolveStakingConfig({
  NEXT_PUBLIC_STAKING_ENABLED: "true",
  NEXT_PUBLIC_CONFLUX_NETWORK: process.env.NEXT_PUBLIC_CONFLUX_NETWORK || "espace-mainnet",
  NEXT_PUBLIC_CONFLUX_CHAIN_ID: process.env.NEXT_PUBLIC_CONFLUX_CHAIN_ID || "1030",
  NEXT_PUBLIC_CONFLUX_RPC_URL: process.env.NEXT_PUBLIC_CONFLUX_RPC_URL?.trim() || CONFLUX_ESPACE_RPC_URL,
  NEXT_PUBLIC_STAKING_CONTRACT: process.env.NEXT_PUBLIC_STAKING_CONTRACT?.trim(),
});
if (!staking.enabled) throw new Error(staking.configurationError || "Staking configuration is invalid.");
const { rpcUrl, contractAddress } = staking;
const probeAccount = getAddress("0x0000000000000000000000000000000000000001");
const adapter = createReadPoolAdapter(rpcUrl, contractAddress);

const overview = await adapter.readPoolOverview();
if (!overview.writeReady || !overview.validation) throw overview.validationError ?? new Error("Staking contract validation failed.");
if (overview.totalStakedCfx === null || overview.stakerCount === null || overview.apyRaw === null || overview.withdrawableCfxDrip === null) {
  throw new Error("One or more required pool read methods failed.");
}

await Promise.all([
  adapter.connection.call("userSummary", [probeAccount]),
  adapter.connection.call("userInterest", [probeAccount]),
  adapter.readQueue("in", probeAccount),
  adapter.readQueue("out", probeAccount),
]);

console.log(JSON.stringify({
  chain: "Conflux eSpace mainnet (1030)",
  contract: contractAddress,
  implementation: overview.validation.implementation,
  bridgeReady: overview.validation.bridgeReady,
  lockPeriodBlocks: overview.validation.lockPeriodBlocks.toString(),
  unlockPeriodBlocks: overview.validation.unlockPeriodBlocks.toString(),
  poolName: overview.name,
  totalStaked: formatCfx(overview.totalStakedCfx),
  stakers: overview.stakerCount.toString(),
  apy: formatApy(overview.apyRaw),
  withdrawableLiquidity: formatDripAsCfx(overview.withdrawableCfxDrip),
  minimalReadAbi: "passed",
}, null, 2));
