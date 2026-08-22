import {
  CORE_MAINNET_CHAIN_ID_HEX,
  CORE_MAINNET_RPC_URL,
  type WalletTransactionRequest,
} from "./pos-pool.ts";

type FluentEvent = "accountsChanged" | "chainChanged" | "disconnect";

export type FluentProvider = {
  isFluent?: boolean;
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: FluentEvent, listener: (...args: unknown[]) => void): void;
  off?(event: FluentEvent, listener: (...args: unknown[]) => void): void;
  removeListener?(event: FluentEvent, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    conflux?: FluentProvider;
  }
}

export function getFluentProvider(): FluentProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.conflux;
  return provider?.isFluent ? provider : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getConnectedAccounts(provider: FluentProvider): Promise<string[]> {
  return stringArray(await provider.request({ method: "cfx_accounts" }));
}

export async function requestAccounts(provider: FluentProvider): Promise<string[]> {
  return stringArray(await provider.request({ method: "cfx_requestAccounts" }));
}

export function fluentAccountMatches(account: string, accounts: string[]): boolean {
  return Boolean(accounts[0]) && accounts[0].toLowerCase() === account.toLowerCase();
}

export async function getWalletChainId(provider: FluentProvider): Promise<string | number> {
  const value = await provider.request({ method: "cfx_chainId" });
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Fluent returned an invalid chain ID");
  }
  return value;
}

export async function switchToCoreMainnet(provider: FluentProvider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchConfluxChain",
      params: [{ chainId: CORE_MAINNET_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addConfluxChain",
      params: [{
        chainId: CORE_MAINNET_CHAIN_ID_HEX,
        chainName: "Conflux Core Mainnet",
        nativeCurrency: { name: "Conflux", symbol: "CFX", decimals: 18 },
        rpcUrls: [CORE_MAINNET_RPC_URL],
        blockExplorerUrls: ["https://confluxscan.org"],
      }],
    });
  }
}

export async function sendFluentTransaction(
  provider: FluentProvider,
  transaction: WalletTransactionRequest,
): Promise<string> {
  const result = await provider.request({
    method: "cfx_sendTransaction",
    params: [transaction],
  });
  if (typeof result !== "string" || !/^0x[0-9a-f]{64}$/i.test(result)) {
    throw new Error("Fluent returned an invalid transaction hash");
  }
  return result;
}

export function subscribeFluent(
  provider: FluentProvider,
  event: FluentEvent,
  listener: (...args: unknown[]) => void,
): () => void {
  provider.on?.(event, listener);
  return () => {
    if (provider.off) provider.off(event, listener);
    else provider.removeListener?.(event, listener);
  };
}
