import type { StakeCopy } from "../../config/stake-copy";

export function stakingErrorMessage(error: unknown, copy: StakeCopy["errors"]): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;

  if (code === 4001 || /user rejected|user denied|rejected by user/i.test(message)) {
    return copy.cancelled;
  }
  if (/Minimal votePower is 1/i.test(message)) return copy.minimum;
  if (/msg\.value should be/i.test(message)) return copy.valueMismatch;
  if (/Locked is not enough/i.test(message)) return copy.lockedInsufficient;
  if (/Unlocked is not enough/i.test(message)) return copy.unlockedInsufficient;
  if (/No claimable interest|Interest not enough/i.test(message)) return copy.interestInsufficient;
  if (/Pool is not registed/i.test(message)) return copy.poolUnavailable;
  if (/WALLET_ACCOUNT_CHANGED/i.test(message)) return copy.accountChanged;
  if (/network|chain/i.test(message)) return copy.wrongNetwork;
  if (/timeout|fetch|network request|failed to fetch/i.test(message)) return copy.networkUnavailable;
  return message ? `${copy.generic} ${message}` : copy.generic;
}
