import { getAddress, type Eip1193Provider } from "ethers";
import {
  CONFLUX_ESPACE_CHAIN_HEX,
  CONFLUX_ESPACE_EXPLORER_URL,
  CONFLUX_ESPACE_NETWORK_NAME,
  CONFLUX_ESPACE_RPC_URL,
} from "./constants.ts";

type ProviderListener = (value: unknown) => void;

export type InjectedProvider = Eip1193Provider & {
  on?(event: string, listener: ProviderListener): void;
  removeListener?(event: string, listener: ProviderListener): void;
};

export type WalletChange =
  | { type: "accounts"; account: string | null }
  | { type: "chain"; chainId: bigint }
  | { type: "disconnect" };

function parseChainId(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") throw new Error("Wallet returned an invalid chain ID.");
  return BigInt(value);
}

function firstAccount(value: unknown) {
  if (!Array.isArray(value) || typeof value[0] !== "string") return null;
  return getAddress(value[0]);
}

export class InjectedWalletSession {
  readonly provider: InjectedProvider;

  constructor(provider: InjectedProvider) {
    this.provider = provider;
  }

  async connect() {
    const [accounts, chainId] = await Promise.all([
      this.provider.request({ method: "eth_requestAccounts" }),
      this.provider.request({ method: "eth_chainId" }),
    ]);
    const account = firstAccount(accounts);
    if (!account) throw new Error("Wallet did not provide an account.");
    return { account, chainId: parseChainId(chainId) };
  }

  async current() {
    const [accounts, chainId] = await Promise.all([
      this.provider.request({ method: "eth_accounts" }),
      this.provider.request({ method: "eth_chainId" }),
    ]);
    return { account: firstAccount(accounts), chainId: parseChainId(chainId) };
  }

  async switchToConflux() {
    try {
      await this.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFLUX_ESPACE_CHAIN_HEX }] });
    } catch (error) {
      const code = error && typeof error === "object" ? (error as { code?: number }).code : undefined;
      if (code !== 4902) throw error;
      await this.provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFLUX_ESPACE_CHAIN_HEX,
          chainName: CONFLUX_ESPACE_NETWORK_NAME,
          nativeCurrency: { name: "Conflux", symbol: "CFX", decimals: 18 },
          rpcUrls: [CONFLUX_ESPACE_RPC_URL],
          blockExplorerUrls: [CONFLUX_ESPACE_EXPLORER_URL],
        }],
      });
    }
  }

  subscribe(onChange: (change: WalletChange) => void) {
    if (!this.provider.on || !this.provider.removeListener) return () => undefined;
    const accountsListener: ProviderListener = (value) => onChange({ type: "accounts", account: firstAccount(value) });
    const chainListener: ProviderListener = (value) => onChange({ type: "chain", chainId: parseChainId(value) });
    const disconnectListener: ProviderListener = () => onChange({ type: "disconnect" });
    this.provider.on("accountsChanged", accountsListener);
    this.provider.on("chainChanged", chainListener);
    this.provider.on("disconnect", disconnectListener);
    return () => {
      this.provider.removeListener?.("accountsChanged", accountsListener);
      this.provider.removeListener?.("chainChanged", chainListener);
      this.provider.removeListener?.("disconnect", disconnectListener);
    };
  }
}

export type DiscoveredWallet = {
  id: string;
  name: string;
  icon?: string;
  provider: InjectedProvider;
};

function walletDisplayName(name?: string) {
  if (!name || name.toLowerCase().includes("fluent")) return "Browser wallet";
  return name;
}

type DiscoveryTarget = {
  ethereum?: InjectedProvider;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
};

export async function discoverInjectedWallets(target: DiscoveryTarget, waitMilliseconds = 250) {
  const wallets = new Map<string, DiscoveredWallet>();
  const listener: EventListener = (event) => {
    const detail = (event as CustomEvent).detail as { info?: { uuid?: string; name?: string; icon?: string }; provider?: InjectedProvider };
    if (!detail?.provider || !detail.info?.uuid) return;
    wallets.set(detail.info.uuid, {
      id: detail.info.uuid,
      name: walletDisplayName(detail.info.name),
      icon: detail.info.icon,
      provider: detail.provider,
    });
  };
  target.addEventListener("eip6963:announceProvider", listener);
  target.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, waitMilliseconds));
  target.removeEventListener("eip6963:announceProvider", listener);
  if (wallets.size === 0 && target.ethereum) {
    wallets.set("injected", { id: "injected", name: "Browser wallet", provider: target.ethereum });
  }
  return [...wallets.values()];
}
