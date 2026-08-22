export const CFX_PER_VOTE = 1_000n;
export const DRIP_PER_CFX = 1_000_000_000_000_000_000n;
export const MAX_UINT64 = 18_446_744_073_709_551_615n;

export type ContractWriteIntent = {
  method: "increaseStake" | "decreaseStake" | "withdrawStake" | "claimAllInterest";
  args: bigint[];
  value: bigint;
};

export type UserSummaryValues = {
  votes: bigint;
  available: bigint;
  locked: bigint;
  unlocked: bigint;
  claimedInterest: bigint;
};

export function parseCfxToVotes(input: string) {
  if (!/^[0-9]+$/.test(input)) {
    throw new Error("INVALID_CFX_INTEGER");
  }

  const cfx = BigInt(input);
  if (cfx < CFX_PER_VOTE || cfx % CFX_PER_VOTE !== 0n) {
    throw new Error("INVALID_VOTE_AMOUNT");
  }

  const votes = cfx / CFX_PER_VOTE;
  if (votes > MAX_UINT64) {
    throw new Error("AMOUNT_TOO_LARGE");
  }

  return { cfx, votes, drip: cfx * DRIP_PER_CFX };
}

export function buildIncreaseStakeIntent(input: string): ContractWriteIntent {
  const amount = parseCfxToVotes(input);
  return { method: "increaseStake", args: [amount.votes], value: amount.drip };
}

export function buildDecreaseStakeIntent(input: string): ContractWriteIntent {
  const amount = parseCfxToVotes(input);
  return { method: "decreaseStake", args: [amount.votes], value: 0n };
}

export function buildWithdrawStakeIntent(votes: bigint): ContractWriteIntent {
  if (votes <= 0n || votes > MAX_UINT64) {
    throw new Error("NOTHING_WITHDRAWABLE");
  }
  return { method: "withdrawStake", args: [votes], value: 0n };
}

export function buildClaimAllIntent(): ContractWriteIntent {
  return { method: "claimAllInterest", args: [], value: 0n };
}

export function deriveUserPosition(
  summary: UserSummaryValues & { claimableInterest: bigint },
) {
  const pendingVotes = summary.votes - summary.available - summary.unlocked;
  return {
    activeCfx: summary.available * CFX_PER_VOTE,
    redeemableCfx: summary.locked * CFX_PER_VOTE,
    pendingUnlockCfx: (pendingVotes > 0n ? pendingVotes : 0n) * CFX_PER_VOTE,
    withdrawableCfx: summary.unlocked * CFX_PER_VOTE,
    claimableInterestDrip: summary.claimableInterest,
    lifetimeInterestDrip: summary.claimedInterest + summary.claimableInterest,
  };
}

export function apyRatioToPercent(raw: bigint): string {
  const whole = raw / 100n;
  const fraction = (raw % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function queueNodeStatus(
  endBlock: bigint,
  currentBlock: bigint,
): "pending" | "matured" {
  return currentBlock >= endBlock ? "matured" : "pending";
}

export function formatCfx(value: bigint): string {
  return value.toLocaleString("en-US");
}

export function formatDripAsCfx(value: bigint, fractionDigits = 5): string {
  const whole = value / DRIP_PER_CFX;
  const remainder = value % DRIP_PER_CFX;
  if (remainder === 0n || fractionDigits === 0) return formatCfx(whole);

  const fraction = remainder
    .toString()
    .padStart(18, "0")
    .slice(0, fractionDigits)
    .replace(/0+$/, "");
  return fraction ? `${formatCfx(whole)}.${fraction}` : formatCfx(whole);
}
