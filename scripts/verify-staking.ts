import { getAddress } from "ethers";
import { formatApy, formatCfx, formatDripAsCfx } from "../app/lib/staking/amounts.ts";
import {
  APPROVED_POOL_IMPLEMENTATION,
  CONFLUX_ESPACE_RPC_URL,
  STAKING_CONTRACT_ADDRESS,
} from "../app/lib/staking/constants.ts";
import { createReadPoolAdapter } from "../app/lib/staking/pos-pool.ts";

const rpcUrl = process.env.NEXT_PUBLIC_CONFLUX_RPC_URL?.trim() || CONFLUX_ESPACE_RPC_URL;
const probeAccount = getAddress("0x0000000000000000000000000000000000000001");
const adapter = createReadPoolAdapter(rpcUrl);

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
  contract: STAKING_CONTRACT_ADDRESS,
  implementation: overview.validation.implementation,
  implementationApproved: overview.validation.implementation === APPROVED_POOL_IMPLEMENTATION,
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
