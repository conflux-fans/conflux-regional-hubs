import assert from "node:assert/strict";
import test from "node:test";
import { buildIncreaseStakeIntent } from "../lib/staking/domain.ts";
import { fluentAccountMatches } from "../lib/staking/fluent.ts";
import {
  CORE_MAINNET_CHAIN_ID,
  STAKING_CONTRACT_ADDRESS,
  createTransactionRequest,
  normalizePoolSummary,
  normalizeQueue,
  normalizeUserSummary,
  isCoreMainnetChain,
  receiptSucceeded,
  resolveConfluxConstructor,
  stakingConfigurationIsValid,
  verifyPoolDeployment,
  getCurrentCoreBlockNumber,
} from "../lib/staking/pos-pool.ts";

test("the adapter resolves Conflux from ESM and browser UMD exports", () => {
  class EsmConflux {}
  class BrowserConflux {}

  assert.equal(
    resolveConfluxConstructor({ Conflux: EsmConflux }, {}),
    EsmConflux,
  );
  assert.equal(
    resolveConfluxConstructor({}, { TreeGraph: { Conflux: BrowserConflux } }),
    BrowserConflux,
  );
  assert.throws(
    () => resolveConfluxConstructor({}, {}),
    /does not expose a Conflux constructor/,
  );
});

test("the adapter produces an allowlisted Fluent transaction with estimation margin", async () => {
  const account = "cfx:type.user:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa6f0vrcsw";
  const intent = buildIncreaseStakeIntent("3000");
  const calls = [];
  const request = await createTransactionRequest(intent, account, {
    encode(method, args) {
      calls.push({ method, args });
      return "0x1234";
    },
    async estimate(transaction) {
      assert.equal(transaction.value, "0xa2a15d09519be00000");
      return { gasLimit: 100n, storageCollateralized: 10n };
    },
  });

  assert.deepEqual(calls, [{ method: "increaseStake", args: [3n] }]);
  assert.deepEqual(request, {
    from: account,
    to: STAKING_CONTRACT_ADDRESS,
    data: "0x1234",
    value: "0xa2a15d09519be00000",
    gas: "0x78",
    storageLimit: "0xc",
  });
});

test("the adapter recognizes Core mainnet and successful receipts", () => {
  assert.equal(CORE_MAINNET_CHAIN_ID, 1029);
  assert.equal(isCoreMainnetChain("0x405"), true);
  assert.equal(isCoreMainnetChain(1029), true);
  assert.equal(isCoreMainnetChain("0x406"), false);
  assert.equal(receiptSucceeded({ outcomeStatus: 0 }), true);
  assert.equal(receiptSucceeded({ outcomeStatus: "0x0" }), true);
  assert.equal(receiptSucceeded({ outcomeStatus: 1 }), false);
  assert.equal(receiptSucceeded(null), false);
});

test("wallet account comparison is case-insensitive and fails closed", () => {
  const account = "CFX:TYPE.USER:ABC";
  assert.equal(fluentAccountMatches(account, ["cfx:type.user:abc"]), true);
  assert.equal(fluentAccountMatches(account, ["cfx:type.user:def"]), false);
  assert.equal(fluentAccountMatches(account, []), false);
});

test("contract tuples normalize without losing integer precision", () => {
  assert.deepEqual(normalizePoolSummary(["0x7", "0x8", "0x9"]), {
    available: 7n,
    interest: 8n,
    totalInterest: 9n,
  });
  assert.deepEqual(
    normalizeUserSummary(["0xa", "0x7", "0x5", "0x1", "0x2", "0x3"]),
    {
      votes: 10n,
      available: 7n,
      locked: 5n,
      unlocked: 1n,
      claimedInterest: 2n,
      currentInterest: 3n,
    },
  );
  assert.deepEqual(normalizeQueue([["0x2", "0x64"]]), [
    { votePower: 2n, endBlock: 100n },
  ]);
});

test("staking configuration fails closed unless every public invariant matches", () => {
  const valid = {
    enabled: "true",
    network: "mainnet",
    networkId: 1029,
    contract: STAKING_CONTRACT_ADDRESS,
    rpcUrl: "https://main.confluxrpc.com",
  };
  assert.equal(stakingConfigurationIsValid(valid), true);
  for (const invalid of [
    { ...valid, enabled: undefined },
    { ...valid, network: "testnet" },
    { ...valid, networkId: 1030 },
    { ...valid, contract: "cfx:invalid" },
    { ...valid, rpcUrl: "http://localhost:12537" },
  ]) {
    assert.equal(stakingConfigurationIsValid(invalid), false);
  }
});

test("pool deployment verification fails closed on every attested invariant", () => {
  const valid = {
    chainId: 1029,
    networkId: 1029,
    code: "0x6000",
    implementationStorage: "0x000000000000000000000000870287bafef59161ddf9dd2e6ae845dde40713e7",
    version: "1.9.0",
  };
  assert.deepEqual(verifyPoolDeployment(valid), []);
  assert.equal(verifyPoolDeployment({ ...valid, chainId: 1 }).length, 1);
  assert.equal(verifyPoolDeployment({ ...valid, code: "0x" }).length, 1);
  assert.equal(verifyPoolDeployment({ ...valid, implementationStorage: "0x0" }).length, 1);
  assert.equal(verifyPoolDeployment({ ...valid, version: "1.10.0" }).length, 1);
});

test("queue timing uses the Core block number rather than the epoch number", async () => {
  const calls = [];
  const blockNumber = await getCurrentCoreBlockNumber({
    async getBlockByEpochNumber(epoch, includeTransactions) {
      calls.push([epoch, includeTransactions]);
      return { blockNumber: "0x12c" };
    },
  });

  assert.equal(blockNumber, 300n);
  assert.deepEqual(calls, [["latest_state", false]]);
});
