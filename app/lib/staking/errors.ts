type ErrorShape = {
  code?: number | string;
  message?: string;
  shortMessage?: string;
  reason?: string;
  info?: { error?: { message?: string } };
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return String(error ?? "");
  const value = error as ErrorShape;
  return [value.shortMessage, value.reason, value.message, value.info?.error?.message].filter(Boolean).join(" ");
}

export function stakingErrorMessage(error: unknown) {
  const value = error && typeof error === "object" ? error as ErrorShape : undefined;
  if (value?.code === 4001 || value?.code === "ACTION_REJECTED") return "Action cancelled";
  const text = errorText(error).toLowerCase();
  if (text.includes("whole-number cfx") || text.includes("positive whole multiple")) return "Amount must be a positive whole multiple of 1,000 CFX";
  if (text.includes("uint64")) return "Amount exceeds the contract limit";
  if (text.includes("insufficient balance")) return "Wallet balance cannot cover the amount and estimated gas";
  if (text.includes("unexpected staking") || text.includes("allowlist") || text.includes("contract code is unavailable")) return "Pool contract security validation failed";
  if (text.includes("minimal votepower")) return "Minimum amount is 1,000 CFX";
  if (text.includes("msg.value should be")) return "Stake amount parameters do not match";
  if (text.includes("locked is not enough")) return "Not enough principal is available to unstake, or it remains locked";
  if (text.includes("unlocked is not enough")) return "Not enough unlocked principal is available";
  if (text.includes("no claimable interest") || text.includes("interest not enough")) return "No claimable rewards are available";
  if (text.includes("pool is not setted")) return "The pool bridge address is not configured";
  if (text.includes("withdrawable cfx is not enough")) return "Pool withdrawal liquidity is currently insufficient";
  if (text.includes("timeout") || text.includes("network") || text.includes("failed to fetch")) return "Network service is temporarily unavailable";
  if (value?.code === "CALL_EXCEPTION") return "Transaction failed; funds were not changed by this request";
  return "The operation did not complete. Check your wallet and network, then try again";
}

export function stakingErrorDetail(error: unknown) {
  return errorText(error).slice(0, 800);
}
