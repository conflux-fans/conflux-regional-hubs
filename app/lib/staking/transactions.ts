export type TransactionPhase =
  | "idle"
  | "validating"
  | "estimating"
  | "awaiting_signature"
  | "submitted"
  | "confirming"
  | "success"
  | "refreshing"
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

export function pendingTransactionKey(account: string, action: string) {
  return `conflux-pos-pool:${account.toLowerCase()}:${action}`;
}
