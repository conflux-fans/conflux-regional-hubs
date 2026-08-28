import assert from "node:assert/strict";
import test from "node:test";
import { connect, disconnect, getConnection } from "wagmi/actions";
import { createConfig, http } from "wagmi";
import { confluxESpace } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { withoutExperimentalPermissionRevocation } from "../app/lib/staking/wallet-connector.ts";

test("injected wallet disconnect does not call unsupported permission revocation", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  const requests = [];
  const provider = {
    async request({ method }) {
      requests.push(method);
      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        return ["0x0000000000000000000000000000000000000001"];
      }
      if (method === "eth_chainId") return "0x406";
      if (method === "wallet_getPermissions") return [{ parentCapability: "eth_accounts" }];
      if (method === "wallet_revokePermissions") {
        throw Object.assign(new Error("Method wallet_revokePermissions not found"), { code: -32601 });
      }
      throw new Error(`Unexpected method ${method}`);
    },
    on() {},
    removeListener() {},
  };
  const config = createConfig({
    chains: [confluxESpace],
    connectors: [injected({ target: { id: "io.fluent", name: "Fluent Wallet", provider } })],
    multiInjectedProviderDiscovery: false,
    ssr: true,
    transports: { [confluxESpace.id]: http() },
  });

  try {
    await connect(config, { connector: config.connectors[0] });
    const connector = getConnection(config).connector;
    await disconnect(config, { connector: withoutExperimentalPermissionRevocation(connector) });

    assert.equal(getConnection(config).status, "disconnected");
    assert.equal(requests.includes("wallet_revokePermissions"), false);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("other injected wallets keep their native disconnect behavior", () => {
  const connector = { id: "io.example", name: "Example Wallet", type: "injected" };
  assert.equal(withoutExperimentalPermissionRevocation(connector), connector);
});
