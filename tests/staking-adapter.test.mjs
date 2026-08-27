import assert from "node:assert/strict";
import test from "node:test";
import { parseStakeAmount, DRIP_PER_CFX } from "../app/lib/staking/amounts.ts";
import {
  APPROVED_POOL_IMPLEMENTATION,
  CONFLUX_ESPACE_CHAIN_ID,
  STAKING_CONTRACT_ADDRESS,
} from "../app/lib/staking/constants.ts";
import { PosPoolAdapter } from "../app/lib/staking/pos-pool.ts";

function fakeConnection(overrides = {}) {
  const calls = [];
  const connection = {
    calls,
    async chainId() { return CONFLUX_ESPACE_CHAIN_ID; },
    async code() { return "0x6001"; },
    async implementationAddress() { return APPROVED_POOL_IMPLEMENTATION; },
    async call(method, args = []) {
      calls.push(["call", method, args]);
      const values = {
        birdgeAddrSetted: true,
        _poolLockPeriod: 56_160n,
        _poolUnlockPeriod: 4_320n,
      };
      return values[method];
    },
    async estimate(method, args, transaction) {
      calls.push(["estimate", method, args, transaction]);
      return 100_000n;
    },
    async send(method, args, transaction) {
      calls.push(["send", method, args, transaction]);
      return { hash: `0x${"1".repeat(64)}`, wait: async () => ({ status: 1 }) };
    },
    async balance() { return 10_000n * DRIP_PER_CFX; },
    async blockNumber() { return 100n; },
    async secondsPerBlock() { return 2; },
    async feePerGas() { return 2n; },
    async receipt() { return null; },
    ...overrides,
  };
  return connection;
}

test("only increaseStake carries the exact native CFX value", async () => {
  const connection = fakeConnection();
  const adapter = new PosPoolAdapter(connection, STAKING_CONTRACT_ADDRESS);
  const amount = parseStakeAmount("3000");

  await adapter.estimateStake(amount);
  await adapter.sendStake(amount, 120_000n);
  await adapter.sendUnstake(3n, 120_000n);
  await adapter.sendWithdraw(2n, 120_000n);
  await adapter.sendClaim(120_000n);

  assert.deepEqual(connection.calls.filter(([kind]) => kind === "estimate" || kind === "send"), [
    ["estimate", "increaseStake", [3n], { value: 3000n * DRIP_PER_CFX }],
    ["send", "increaseStake", [3n], { value: 3000n * DRIP_PER_CFX, gasLimit: 120_000n }],
    ["send", "decreaseStake", [3n], { value: 0n, gasLimit: 120_000n }],
    ["send", "withdrawStake", [2n], { value: 0n, gasLimit: 120_000n }],
    ["send", "claimAllInterest", [], { value: 0n, gasLimit: 120_000n }],
  ]);
});

test("write safety rejects an unexpected network, target, implementation, or unconfigured bridge", async () => {
  await assert.rejects(
    () => new PosPoolAdapter(fakeConnection({ chainId: async () => 1n }), STAKING_CONTRACT_ADDRESS).estimateStake(parseStakeAmount("1000")),
    /network/i,
  );
  assert.throws(() => new PosPoolAdapter(fakeConnection(), "0x0000000000000000000000000000000000000001"), /allowlist/i);
  await assert.rejects(
    () => new PosPoolAdapter(fakeConnection({ implementationAddress: async () => "0x0000000000000000000000000000000000000001" }), STAKING_CONTRACT_ADDRESS).estimateStake(parseStakeAmount("1000")),
    /implementation/i,
  );
  await assert.rejects(
    () => new PosPoolAdapter(fakeConnection({ call: async (method) => method === "birdgeAddrSetted" ? false : 1n }), STAKING_CONTRACT_ADDRESS).estimateStake(parseStakeAmount("1000")),
    /bridge/i,
  );
});

test("queue reads use pages of 50 and stop at the first short page", async () => {
  const connection = fakeConnection({
    async call(method, args = []) {
      if (!method.startsWith("userInQueue")) return true;
      const offset = args[1];
      const length = offset === 0n ? 50 : 1;
      return Array.from({ length }, (_, index) => ({ votePower: 1n, endBlock: BigInt(index + 1) }));
    },
  });
  const adapter = new PosPoolAdapter(connection, STAKING_CONTRACT_ADDRESS);
  const queue = await adapter.readQueue("in", "0x0000000000000000000000000000000000000002");
  assert.equal(queue.length, 51);
});
