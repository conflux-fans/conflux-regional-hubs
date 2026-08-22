import assert from "node:assert/strict";
import test from "node:test";
import {
  apyRatioToPercent,
  buildClaimAllIntent,
  buildDecreaseStakeIntent,
  buildIncreaseStakeIntent,
  buildWithdrawStakeIntent,
  deriveUserPosition,
  formatCfx,
  formatDripAsCfx,
  parseCfxToVotes,
  queueNodeStatus,
} from "../lib/staking/domain.ts";

test("3000 CFX becomes three votes and an exact transaction value", () => {
  assert.deepEqual(parseCfxToVotes("3000"), {
    cfx: 3000n,
    votes: 3n,
    drip: 3_000_000_000_000_000_000_000n,
  });
  assert.deepEqual(buildIncreaseStakeIntent("3000"), {
    method: "increaseStake",
    args: [3n],
    value: 3_000_000_000_000_000_000_000n,
  });
});

test("stake-sized CFX input rejects fractions, non-multiples, and zero", () => {
  for (const value of ["", "0", "999", "1001", "1000.5", "1e3", "-1000", " 1000"] ) {
    assert.throws(() => parseCfxToVotes(value));
  }
});

test("user position keeps active, redeemable, pending, and withdrawable principal distinct", () => {
  assert.deepEqual(
    deriveUserPosition({
      votes: 10n,
      available: 7n,
      locked: 5n,
      unlocked: 1n,
      claimedInterest: 2_000_000_000_000_000_000n,
      claimableInterest: 500_000_000_000_000_000n,
    }),
    {
      activeCfx: 7000n,
      redeemableCfx: 5000n,
      pendingUnlockCfx: 2000n,
      withdrawableCfx: 1000n,
      claimableInterestDrip: 500_000_000_000_000_000n,
      lifetimeInterestDrip: 2_500_000_000_000_000_000n,
    },
  );
});

test("write intents preserve contract units", () => {
  assert.deepEqual(buildDecreaseStakeIntent("2000"), {
    method: "decreaseStake",
    args: [2n],
    value: 0n,
  });
  assert.deepEqual(buildWithdrawStakeIntent(4n), {
    method: "withdrawStake",
    args: [4n],
    value: 0n,
  });
  assert.deepEqual(buildClaimAllIntent(), {
    method: "claimAllInterest",
    args: [],
    value: 0n,
  });
});

test("APY and queue maturity follow contract ratios and block numbers", () => {
  assert.equal(apyRatioToPercent(1234n), "12.34");
  assert.equal(apyRatioToPercent(0n), "0.00");
  assert.equal(queueNodeStatus(99n, 100n), "matured");
  assert.equal(queueNodeStatus(100n, 100n), "matured");
  assert.equal(queueNodeStatus(101n, 100n), "pending");
});

test("display formatting never converts contract integers through floating point", () => {
  assert.equal(formatCfx(12_345_000n), "12,345,000");
  assert.equal(formatDripAsCfx(500_000_000_000_000_000n), "0.5");
  assert.equal(formatDripAsCfx(12_345_678_900_000_000_000n, 5), "12.34567");
});
