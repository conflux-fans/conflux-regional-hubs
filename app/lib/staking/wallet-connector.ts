import type { Connector } from "wagmi";

type RequestProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
};

function isRequestProvider(provider: unknown): provider is RequestProvider {
  return Boolean(provider && typeof provider === "object" && "request" in provider && typeof provider.request === "function");
}

export function readyWalletConnection(connection: {
  status: string;
  address?: string;
  chainId?: number;
  connector?: unknown;
}) {
  const connector = connection.connector;
  if (
    connection.status !== "connected" ||
    !connection.address ||
    connection.chainId === undefined ||
    !connector ||
    typeof connector !== "object" ||
    !("getProvider" in connector) ||
    typeof connector.getProvider !== "function"
  ) return null;
  return {
    account: connection.address,
    chainId: BigInt(connection.chainId),
    connector: connector as Connector,
  };
}

export function withoutExperimentalPermissionRevocation(connector: Connector): Connector {
  const identity = `${connector.id} ${connector.name}`.toLowerCase();
  if (connector.type !== "injected" || !identity.includes("fluent")) return connector;

  const adapted = Object.create(connector) as Connector;
  const getProvider = connector.getProvider.bind(connector);
  adapted.getProvider = async (parameters) => {
    const provider = await getProvider(parameters);
    if (!isRequestProvider(provider)) return provider;

    return new Proxy(provider, {
      get(target, property) {
        if (property === "request") {
          return (args: { method: string; params?: unknown }) => {
            if (args.method === "wallet_revokePermissions") return Promise.resolve(null);
            return target.request(args);
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
  return adapted;
}
