export type TransactionPhase =
  | "idle"
  | "validating"
  | "estimating"
  | "awaiting_signature"
  | "submitted"
  | "confirming"
  | "success"
  | "refreshing"
  | "validation_error"
  | "rejected"
  | "reverted"
  | "rpc_error";

export type TransactionState = {
  phase: TransactionPhase;
  hash?: string;
  message?: string;
  detail?: string;
};

export type TransactionEvent = {
  type: TransactionPhase;
  hash?: string;
  message?: string;
  detail?: string;
};

export function initialTransactionState(): TransactionState {
  return { phase: "idle" };
}

export function transitionTransaction(state: TransactionState, event: TransactionEvent): TransactionState {
  if (event.type === "idle" || event.type === "validating") return { phase: event.type };
  return {
    phase: event.type,
    ...(event.hash || state.hash ? { hash: event.hash ?? state.hash } : {}),
    ...(event.message ? { message: event.message } : {}),
    ...(event.detail ? { detail: event.detail } : {}),
  };
}

export function gasLimitWithMargin(estimate: bigint) {
  return (estimate * 120n + 99n) / 100n;
}

export function isTransactionPending(state: TransactionState) {
  if (["validating", "estimating", "awaiting_signature", "submitted", "confirming", "refreshing"].includes(state.phase)) {
    return true;
  }
  return state.phase === "rpc_error" && Boolean(state.hash);
}

export function canManuallyCheckReceipt(state: TransactionState) {
  return Boolean(state.hash) && (state.phase === "submitted" || state.phase === "rpc_error");
}

export function classifyReceiptStatus(status: unknown): "success" | "failed" | "unknown" {
  if (status === 1) return "success";
  if (status === 0) return "failed";
  return "unknown";
}

export function resolveConfirmedReplacement(error: unknown): { hash: string; outcome: "success" | "cancelled_or_failed" } | null {
  if (!error || typeof error !== "object") return null;
  const value = error as {
    code?: unknown;
    cancelled?: unknown;
    replacement?: { hash?: unknown };
    receipt?: { hash?: unknown; status?: unknown };
  };
  if (value.code !== "TRANSACTION_REPLACED" || typeof value.cancelled !== "boolean" || !value.receipt || (value.receipt.status !== 0 && value.receipt.status !== 1)) return null;
  const hash = typeof value.replacement?.hash === "string" ? value.replacement.hash
    : typeof value.receipt.hash === "string" ? value.receipt.hash
      : null;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return null;
  return {
    hash,
    outcome: !value.cancelled && value.receipt.status === 1 ? "success" : "cancelled_or_failed",
  };
}

export function pendingTransactionKey(account: string, action: string) {
  return `conflux-pos-pool:${account.toLowerCase()}:${action}`;
}
