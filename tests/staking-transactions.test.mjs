import assert from "node:assert/strict";
import test from "node:test";
import {
  gasLimitWithMargin,
  initialTransactionState,
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
});

test("gas limit uses an integer twenty-percent safety margin", () => {
  assert.equal(gasLimitWithMargin(100_001n), 120_002n);
});
