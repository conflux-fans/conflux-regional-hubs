import type { Connector } from "wagmi";

type RequestProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
};

function isRequestProvider(provider: unknown): provider is RequestProvider {
  return Boolean(provider && typeof provider === "object" && "request" in provider && typeof provider.request === "function");
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
