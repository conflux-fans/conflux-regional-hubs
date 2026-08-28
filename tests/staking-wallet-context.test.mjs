import assert from "node:assert/strict";
import test from "node:test";
import { WalletContextGuard } from "../app/lib/staking/wallet-context.ts";

test("older account and network requests cannot match a replaced wallet context", () => {
  const guard = new WalletContextGuard();
  const first = guard.replace("0x0000000000000000000000000000000000000002", 1030n);
  assert.equal(guard.matches(first), true);

  const second = guard.replace("0x0000000000000000000000000000000000000003", 1n);
  assert.equal(guard.matches(first), false);
  assert.equal(guard.matches(second), true);

  guard.clear();
  assert.equal(guard.matches(second), false);
});
