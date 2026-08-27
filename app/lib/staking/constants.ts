import { getAddress } from "ethers";

export const CONFLUX_ESPACE_CHAIN_ID = 1030n;
export const CONFLUX_ESPACE_CHAIN_HEX = "0x406";
export const CONFLUX_ESPACE_RPC_URL = "https://evm.confluxrpc.com";
export const CONFLUX_ESPACE_EXPLORER_URL = "https://evm.confluxscan.io";
export const CONFLUX_ESPACE_NETWORK_NAME = "Conflux eSpace";
export const STAKING_CONTRACT_ADDRESS = getAddress("0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3");
export const APPROVED_POOL_IMPLEMENTATION = getAddress("0x2990ff2180541b5e1b11186ab5db7666f858988c");
export const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export const STAKING_QUEUE_PAGE_SIZE = 50n;
export const STAKING_QUEUE_MAX_ITEMS = 500;

export function transactionExplorerUrl(hash: string) {
  return `${CONFLUX_ESPACE_EXPLORER_URL}/tx/${encodeURIComponent(hash)}`;
}
