import assert from "node:assert/strict";
import test from "node:test";
import { resolveStakingConfig } from "../app/lib/staking/config.ts";
import { wagmiConfig } from "../app/lib/staking/wagmi-config.ts";

test("disabled or invalid staking configuration remains fail-closed", () => {
  assert.deepEqual(resolveStakingConfig({ NEXT_PUBLIC_STAKING_ENABLED: "false" }), { enabled: false });
  const invalid = resolveStakingConfig({ NEXT_PUBLIC_STAKING_ENABLED: "true" });
  assert.equal(invalid.enabled, false);
  assert.match(invalid.configurationError, /configuration/i);

  const configured = resolveStakingConfig({
    NEXT_PUBLIC_STAKING_ENABLED: "true",
    NEXT_PUBLIC_CONFLUX_NETWORK: "espace-mainnet",
    NEXT_PUBLIC_CONFLUX_CHAIN_ID: "1030",
    NEXT_PUBLIC_CONFLUX_RPC_URL: "https://evm.confluxrpc.com",
    NEXT_PUBLIC_STAKING_CONTRACT: "0x447Da341FA55E307F384a9d8CC0C933d67a0b2B0",
  });
  assert.equal(configured.enabled, true);
  if (configured.enabled) assert.equal(configured.contractAddress, "0x447Da341FA55E307F384a9d8CC0C933d67a0b2B0");
});

test("wallet hooks are configured for Conflux eSpace", () => {
  assert.deepEqual(wagmiConfig.chains.map((chain) => chain.id), [1030]);
  assert.equal(wagmiConfig.chains[0].name, "Conflux eSpace");
});
