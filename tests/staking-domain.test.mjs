import assert from "node:assert/strict";
import test from "node:test";
import {
  DRIP_PER_CFX,
  MAX_UINT64,
  parseStakeAmount,
  formatApy,
  formatDripAsCfx,
} from "../app/lib/staking/amounts.ts";
import { deriveUserPosition, queueNodeView } from "../app/lib/staking/models.ts";
import { stakingErrorMessage } from "../app/lib/staking/errors.ts";

test("stake input converts exact CFX integers into vote power and Drip", () => {
  assert.deepEqual(parseStakeAmount("3000"), {
    cfx: 3000n,
    votePower: 3n,
    valueDrip: 3000n * DRIP_PER_CFX,
  });
  assert.equal(parseStakeAmount((MAX_UINT64 * 1000n).toString()).votePower, MAX_UINT64);
});

test("stake input rejects values that the contract cannot safely accept", () => {
  for (const value of ["", "0", "999", "1001", "1.5", "1e3", "-1000", " 1000", "1000 "]) {
    assert.throws(() => parseStakeAmount(value));
  }
  assert.throws(() => parseStakeAmount(((MAX_UINT64 + 1n) * 1000n).toString()), /uint64/);
});

test("pool APY and Drip formatting never pass through floating point numbers", () => {
  assert.equal(formatApy(0n), "0%");
  assert.equal(formatApy(1234n), "12.34%");
  assert.equal(formatApy(1200n), "12%");
  assert.equal(formatDripAsCfx(12_345_678_901_234_567_890n), "12.345678 CFX");
});

test("user position derives redeemable and withdrawable principal from the correct fields", () => {
  const position = deriveUserPosition({
    votes: 10n,
    available: 7n,
    locked: 5n,
    unlocked: 2n,
    claimedInterest: 4n * DRIP_PER_CFX,
    currentInterest: 99n * DRIP_PER_CFX,
  }, 3n * DRIP_PER_CFX, 1500n * DRIP_PER_CFX);

  assert.equal(position.stakedCfx, 7000n);
  assert.equal(position.redeemableCfx, 5000n);
  assert.equal(position.pendingUnlockCfx, 1000n);
  assert.equal(position.unlockedCfx, 2000n);
  assert.equal(position.withdrawableVotes, 1n);
  assert.equal(position.withdrawableCfx, 1000n);
  assert.equal(position.claimableInterestDrip, 3n * DRIP_PER_CFX);
  assert.equal(position.totalInterestDrip, 7n * DRIP_PER_CFX);
});

test("queue status is decided by block height, not an estimated date", () => {
  assert.deepEqual(queueNodeView({ votePower: 2n, endBlock: 120n }, 100n, 2), {
    amountCfx: 2000n,
    endBlock: 120n,
    matured: false,
    estimatedSeconds: 40n,
  });
  assert.equal(queueNodeView({ votePower: 2n, endBlock: 100n }, 100n, 2).matured, true);
});

test("known wallet and contract failures map to recoverable product messages", () => {
  assert.equal(stakingErrorMessage({ code: 4001 }), "Action cancelled");
  assert.equal(stakingErrorMessage(new Error("execution reverted: Locked is not enough")), "Not enough principal is available to unstake, or it remains locked");
  assert.equal(stakingErrorMessage(new Error("Withdrawable CFX is not enough")), "Pool withdrawal liquidity is currently insufficient");
  assert.equal(stakingErrorMessage(new Error("Amount must be a positive whole multiple of 1,000 CFX")), "Amount must be a positive whole multiple of 1,000 CFX");
  assert.equal(stakingErrorMessage(new Error("Insufficient balance to cover the stake amount and estimated gas")), "Wallet balance cannot cover the amount and estimated gas");
});
