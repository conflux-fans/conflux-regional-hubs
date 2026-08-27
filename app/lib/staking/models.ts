import { DRIP_PER_VOTE, votesToCfx } from "./amounts.ts";

export type UserSummary = {
  votes: bigint;
  available: bigint;
  locked: bigint;
  unlocked: bigint;
  claimedInterest: bigint;
  currentInterest: bigint;
};

export type QueueNode = {
  votePower: bigint;
  endBlock: bigint;
};

export function deriveUserPosition(summary: UserSummary, userInterest: bigint, poolLiquidityDrip: bigint) {
  const pendingUnlockVotes = summary.votes > summary.available + summary.unlocked
    ? summary.votes - summary.available - summary.unlocked
    : 0n;
  const liquidityVotes = poolLiquidityDrip / DRIP_PER_VOTE;
  const withdrawableVotes = summary.unlocked < liquidityVotes ? summary.unlocked : liquidityVotes;
  return {
    stakedCfx: votesToCfx(summary.available),
    redeemableCfx: votesToCfx(summary.locked),
    pendingUnlockCfx: votesToCfx(pendingUnlockVotes),
    unlockedCfx: votesToCfx(summary.unlocked),
    withdrawableVotes,
    withdrawableCfx: votesToCfx(withdrawableVotes),
    claimableInterestDrip: userInterest,
    totalInterestDrip: summary.claimedInterest + userInterest,
  };
}

export function queueNodeView(node: QueueNode, currentBlock: bigint, secondsPerBlock: number) {
  const remainingBlocks = node.endBlock > currentBlock ? node.endBlock - currentBlock : 0n;
  return {
    amountCfx: votesToCfx(node.votePower),
    endBlock: node.endBlock,
    matured: currentBlock >= node.endBlock,
    estimatedSeconds: remainingBlocks * BigInt(Math.max(1, Math.round(secondsPerBlock))),
  };
}
