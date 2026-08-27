import { getAddress } from "ethers";
import {
  CONFLUX_ESPACE_CHAIN_ID,
  STAKING_CONTRACT_ADDRESS,
} from "./constants.ts";

type PublicStakingEnvironment = Record<string, string | undefined>;

export type StakingConfig =
  | { enabled: false; configurationError?: string }
  | { enabled: true; rpcUrl: string; contractAddress: string; chainId: bigint };

export function resolveStakingConfig(environment: PublicStakingEnvironment): StakingConfig {
  if (environment.NEXT_PUBLIC_STAKING_ENABLED !== "true") return { enabled: false };
  try {
    const network = environment.NEXT_PUBLIC_CONFLUX_NETWORK;
    const chainId = BigInt(environment.NEXT_PUBLIC_CONFLUX_CHAIN_ID ?? "");
    const rpcUrl = new URL(environment.NEXT_PUBLIC_CONFLUX_RPC_URL ?? "");
    const contractAddress = getAddress(environment.NEXT_PUBLIC_STAKING_CONTRACT ?? "");
    if (network !== "espace-mainnet" || chainId !== CONFLUX_ESPACE_CHAIN_ID) throw new Error("network");
    if (!/^https?:$/.test(rpcUrl.protocol) || contractAddress !== STAKING_CONTRACT_ADDRESS) throw new Error("target");
    return { enabled: true, rpcUrl: rpcUrl.toString(), contractAddress, chainId };
  } catch {
    return { enabled: false, configurationError: "Staking configuration is incomplete or outside the approved allowlist." };
  }
}

export function getStakingConfig() {
  return resolveStakingConfig({
    NEXT_PUBLIC_STAKING_ENABLED: process.env.NEXT_PUBLIC_STAKING_ENABLED,
    NEXT_PUBLIC_CONFLUX_NETWORK: process.env.NEXT_PUBLIC_CONFLUX_NETWORK,
    NEXT_PUBLIC_CONFLUX_CHAIN_ID: process.env.NEXT_PUBLIC_CONFLUX_CHAIN_ID,
    NEXT_PUBLIC_CONFLUX_RPC_URL: process.env.NEXT_PUBLIC_CONFLUX_RPC_URL,
    NEXT_PUBLIC_STAKING_CONTRACT: process.env.NEXT_PUBLIC_STAKING_CONTRACT,
  });
}
