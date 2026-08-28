import { createConfig, http } from "wagmi";
import { confluxESpace } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [confluxESpace],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [confluxESpace.id]: http(),
  },
});
