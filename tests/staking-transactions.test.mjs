import assert from "node:assert/strict";
import test from "node:test";
import {
  canManuallyCheckReceipt,
  classifyReceiptStatus,
  gasLimitWithMargin,
  initialTransactionState,
  isTransactionPending,
  resolveConfirmedReplacement,
  transitionTransaction,
} from "../app/lib/staking/transactions.ts";

test("transaction state does not report success until a successful receipt", () => {
  let state = initialTransactionState();
  for (const phase of ["validating", "estimating", "awaiting_signature"]) {
    state = transitionTransaction(state, { type: phase });
    assert.equal(state.phase, phase);
  }
  state = transitionTransaction(state, { type: "submitted", hash: `0x${"a".repeat(64)}` });
  assert.equal(state.phase, "submitted");
  assert.equal(state.hash, `0x${"a".repeat(64)}`);
  state = transitionTransaction(state, { type: "confirming" });
  state = transitionTransaction(state, { type: "success", message: "confirmed" });
  assert.equal(state.phase, "success");
  assert.equal(state.message, "confirmed");
});

test("transaction errors retain a submitted hash for later receipt recovery", () => {
  const hash = `0x${"b".repeat(64)}`;
  const submitted = transitionTransaction(initialTransactionState(), { type: "submitted", hash });
  const failed = transitionTransaction(submitted, { type: "rpc_error", message: "timeout" });
  assert.deepEqual(failed, { phase: "rpc_error", hash, message: "timeout" });
  assert.equal(isTransactionPending(failed), true);
  assert.equal(isTransactionPending({ phase: "rpc_error", message: "failed before submission" }), false);
  assert.equal(canManuallyCheckReceipt(failed), true);
  assert.equal(canManuallyCheckReceipt({ phase: "confirming", hash }), false);
  assert.equal(canManuallyCheckReceipt({ phase: "submitted", hash }), true);
});

test("gas limit uses an integer twenty-percent safety margin", () => {
  assert.equal(gasLimitWithMargin(100_001n), 120_002n);
});

test("only a replacement with a definite receipt resolves the original pending transaction", () => {
  const hash = `0x${"d".repeat(64)}`;
  assert.deepEqual(resolveConfirmedReplacement({
    code: "TRANSACTION_REPLACED",
    cancelled: false,
    replacement: { hash },
    receipt: { status: 1 },
  }), { hash, outcome: "success" });
  assert.deepEqual(resolveConfirmedReplacement({
    code: "TRANSACTION_REPLACED",
    cancelled: true,
    replacement: { hash },
    receipt: { status: 1 },
  }), { hash, outcome: "cancelled_or_failed" });
  assert.equal(resolveConfirmedReplacement({ code: "TRANSACTION_REPLACED", replacement: { hash } }), null);
  assert.equal(resolveConfirmedReplacement({ code: "TIMEOUT", replacement: { hash }, receipt: { status: 1 } }), null);
});

test("only explicit receipt statuses resolve a pending transaction", () => {
  assert.equal(classifyReceiptStatus(1), "success");
  assert.equal(classifyReceiptStatus(0), "failed");
  assert.equal(classifyReceiptStatus(null), "unknown");
  assert.equal(classifyReceiptStatus(2), "unknown");
});
