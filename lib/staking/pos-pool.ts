import { POS_POOL_ABI } from "./abi.ts";
import type { ContractWriteIntent } from "./domain.ts";

export const CORE_MAINNET_CHAIN_ID = 1029;
export const CORE_MAINNET_CHAIN_ID_HEX = "0x405";
export const STAKING_CONTRACT_ADDRESS =
  "cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0";
export const CORE_MAINNET_RPC_URL = process.env.NEXT_PUBLIC_CONFLUX_RPC_URL?.trim() || "";
const configuredNetworkId = Number(process.env.NEXT_PUBLIC_CONFLUX_NETWORK_ID);
const configuredContract = process.env.NEXT_PUBLIC_STAKING_CONTRACT?.trim().toLowerCase();
const configuredNetwork = process.env.NEXT_PUBLIC_CONFLUX_NETWORK?.trim().toLowerCase();
export function stakingConfigurationIsValid(configuration: {
  enabled: string | undefined;
  network: string | undefined;
  networkId: number;
  contract: string | undefined;
  rpcUrl: string;
}): boolean {
  return configuration.enabled === "true" &&
    configuration.network === "mainnet" &&
    configuration.networkId === CORE_MAINNET_CHAIN_ID &&
    configuration.contract === STAKING_CONTRACT_ADDRESS &&
    /^https:\/\//.test(configuration.rpcUrl);
}

export const STAKING_ENABLED = stakingConfigurationIsValid({
  enabled: process.env.NEXT_PUBLIC_STAKING_ENABLED,
  network: configuredNetwork,
  networkId: configuredNetworkId,
  contract: configuredContract,
  rpcUrl: CORE_MAINNET_RPC_URL,
});
export const CORE_SCAN_URL = "https://confluxscan.org";
export const EXPECTED_POOL_VERSION = "1.8.0";
export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export const EXPECTED_IMPLEMENTATION_STORAGE =
  "0x0000000000000000000000008af148cf664bcb63e0c2ab07ab589c9a5f435a88";

export type WalletTransactionRequest = {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  storageLimit: string;
};

export type PoolSummary = {
  available: bigint;
  interest: bigint;
  totalInterest: bigint;
};

export type UserSummary = {
  votes: bigint;
  available: bigint;
  locked: bigint;
  unlocked: bigint;
  claimedInterest: bigint;
  currentInterest: bigint;
};

export type QueueNode = { votePower: bigint; endBlock: bigint };

export type PoolSnapshot = {
  name: string;
  summary: PoolSummary;
  apy: bigint;
  stakers: bigint;
  registered: boolean;
  lockPeriod: bigint;
  unlockPeriod: bigint;
  currentBlock: bigint;
  version: string;
  verified: boolean;
  verificationError?: string;
};

export type UserSnapshot = {
  balanceDrip: bigint;
  summary: UserSummary;
  claimableInterest: bigint;
  inQueue: QueueNode[];
  outQueue: QueueNode[];
  currentBlock: bigint;
};

export type PoolDeploymentEvidence = {
  chainId?: number;
  networkId?: number;
  code: string;
  implementationStorage: string | null;
  version: string;
};

type TransactionGateway = {
  encode(method: ContractWriteIntent["method"], args: bigint[]): string;
  estimate(transaction: Omit<WalletTransactionRequest, "gas" | "storageLimit">): Promise<{
    gasLimit: bigint;
    storageCollateralized: bigint;
  }>;
};

type ConfluxClientLike = {
  Contract(options: { abi: object[]; address: string }): unknown;
  getBalance(address: string, epochNumber?: string): Promise<unknown>;
  getEpochNumber(epochNumber?: string): Promise<unknown>;
  getTransactionReceipt(transactionHash: string): Promise<{ outcomeStatus?: string | number | bigint } | null>;
  getStatus(): Promise<{ chainId?: number; networkId?: number }>;
  getCode(address: string, epochNumber?: string): Promise<string>;
  getStorageAt(address: string, position: string, epochNumber?: string): Promise<string | null>;
};

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

function tupleValue(value: unknown, index: number, name: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  const tuple = value as Record<string | number, unknown>;
  return tuple[name] ?? tuple[index];
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" || typeof value === "string") return BigInt(value);
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt(String(value));
  }
  throw new Error("Contract returned an invalid integer");
}

export function normalizePoolSummary(value: unknown): PoolSummary {
  return {
    available: toBigInt(tupleValue(value, 0, "available")),
    interest: toBigInt(tupleValue(value, 1, "interest")),
    totalInterest: toBigInt(tupleValue(value, 2, "totalInterest")),
  };
}

export function normalizeUserSummary(value: unknown): UserSummary {
  return {
    votes: toBigInt(tupleValue(value, 0, "votes")),
    available: toBigInt(tupleValue(value, 1, "available")),
    locked: toBigInt(tupleValue(value, 2, "locked")),
    unlocked: toBigInt(tupleValue(value, 3, "unlocked")),
    claimedInterest: toBigInt(tupleValue(value, 4, "claimedInterest")),
    currentInterest: toBigInt(tupleValue(value, 5, "currentInterest")),
  };
}

export function normalizeQueue(value: unknown): QueueNode[] {
  if (!Array.isArray(value)) return [];
  return value.map((node) => ({
    votePower: toBigInt(tupleValue(node, 0, "votePower")),
    endBlock: toBigInt(tupleValue(node, 1, "endBlock")),
  }));
}

function withMargin(value: bigint): bigint {
  return (value * 120n + 99n) / 100n;
}

export async function createTransactionRequest(
  intent: ContractWriteIntent,
  account: string,
  gateway: TransactionGateway,
): Promise<WalletTransactionRequest> {
  const transaction = {
    from: account,
    to: STAKING_CONTRACT_ADDRESS,
    data: gateway.encode(intent.method, intent.args),
    value: toHex(intent.value),
  };
  const estimate = await gateway.estimate(transaction);
  return {
    ...transaction,
    gas: toHex(withMargin(estimate.gasLimit)),
    storageLimit: toHex(withMargin(estimate.storageCollateralized)),
  };
}

export function isCoreMainnetChain(chainId: string | number): boolean {
  const parsed = typeof chainId === "number" ? chainId : Number.parseInt(chainId, 0);
  return parsed === CORE_MAINNET_CHAIN_ID;
}

export function receiptSucceeded(
  receipt: { outcomeStatus?: string | number | bigint } | null,
): boolean {
  if (!receipt || receipt.outcomeStatus === undefined) return false;
  return BigInt(receipt.outcomeStatus) === 0n;
}

export function verifyPoolDeployment(evidence: PoolDeploymentEvidence): string[] {
  return [
    evidence.chainId === CORE_MAINNET_CHAIN_ID && evidence.networkId === CORE_MAINNET_CHAIN_ID
      ? null
      : "RPC is not Conflux Core mainnet",
    evidence.code && evidence.code !== "0x" ? null : "Proxy contract code is missing",
    evidence.implementationStorage?.toLowerCase() === EXPECTED_IMPLEMENTATION_STORAGE
      ? null
      : "Pool proxy implementation changed",
    evidence.version === EXPECTED_POOL_VERSION
      ? null
      : `Unreviewed pool version ${evidence.version || "unknown"}`,
  ].filter((problem): problem is string => Boolean(problem));
}

function contractMethod(contract: Record<string, (...args: unknown[]) => unknown>, method: string, args: bigint[]) {
  const callable = contract[method];
  if (typeof callable !== "function") throw new Error(`Unsupported contract method: ${method}`);
  return callable(...args);
}

export class PosPoolClient {
  private conflux: ConfluxClientLike | null = null;
  private contract: Record<string, (...args: unknown[]) => unknown> | null = null;
  private initializing: Promise<void> | null = null;
  private readonly rpcUrl: string;

  constructor(rpcUrl = CORE_MAINNET_RPC_URL) {
    this.rpcUrl = rpcUrl;
  }

  private async ready() {
    if (this.conflux && this.contract) return;
    if (!this.initializing) {
      this.initializing = import("js-conflux-sdk").then(({ Conflux }) => {
        this.conflux = new Conflux({
          url: this.rpcUrl,
          networkId: CORE_MAINNET_CHAIN_ID,
        }) as unknown as ConfluxClientLike;
        this.contract = this.conflux.Contract({
          abi: POS_POOL_ABI,
          address: STAKING_CONTRACT_ADDRESS,
        }) as Record<string, (...args: unknown[]) => unknown>;
      });
    }
    await this.initializing;
  }

  async readPool(): Promise<PoolSnapshot> {
    await this.ready();
    const contract = this.contract!;
    const [summary, apy, stakers, name, registered, lockPeriod, unlockPeriod, currentBlock, version, status, code, implementationStorage] =
      await Promise.all([
        contract.poolSummary(),
        contract.poolAPY(),
        contract.stakerNumber(),
        contract.poolName(),
        contract._poolRegisted(),
        contract._poolLockPeriod(),
        contract._poolUnlockPeriod(),
        this.conflux!.getEpochNumber("latest_state"),
        contract.VERSION(),
        this.conflux!.getStatus(),
        this.conflux!.getCode(STAKING_CONTRACT_ADDRESS, "latest_state"),
        this.conflux!.getStorageAt(
          STAKING_CONTRACT_ADDRESS,
          EIP1967_IMPLEMENTATION_SLOT,
          "latest_state",
        ),
      ]);
    const versionString = String(version || "");
    const verificationProblems = verifyPoolDeployment({
      chainId: status.chainId,
      networkId: status.networkId,
      code,
      implementationStorage,
      version: versionString,
    });
    return {
      name: String(name || "Conflux PoS Pool"),
      summary: normalizePoolSummary(summary),
      apy: toBigInt(apy),
      stakers: toBigInt(stakers),
      registered: Boolean(registered),
      lockPeriod: toBigInt(lockPeriod),
      unlockPeriod: toBigInt(unlockPeriod),
      currentBlock: toBigInt(currentBlock),
      version: versionString,
      verified: verificationProblems.length === 0,
      verificationError: verificationProblems.join("; ") || undefined,
    };
  }

  async readUser(account: string): Promise<UserSnapshot> {
    await this.ready();
    const contract = this.contract!;
    const [balance, summary, interest, inQueue, outQueue, currentBlock] = await Promise.all([
      this.conflux!.getBalance(account, "latest_state"),
      contract.userSummary(account),
      contract.userInterest(account),
      contract.userInQueue(account),
      contract.userOutQueue(account),
      this.conflux!.getEpochNumber("latest_state"),
    ]);
    return {
      balanceDrip: toBigInt(balance),
      summary: normalizeUserSummary(summary),
      claimableInterest: toBigInt(interest),
      inQueue: normalizeQueue(inQueue),
      outQueue: normalizeQueue(outQueue),
      currentBlock: toBigInt(currentBlock),
    };
  }

  async prepareTransaction(intent: ContractWriteIntent, account: string) {
    await this.ready();
    const contract = this.contract!;
    return createTransactionRequest(intent, account, {
      encode: (method, args) => {
        const transaction = contractMethod(contract, method, args) as { data?: string };
        if (!transaction.data) throw new Error("Unable to encode contract transaction");
        return transaction.data;
      },
      estimate: async (transaction) => {
        const method = contractMethod(contract, intent.method, intent.args) as {
          estimateGasAndCollateral(options: object): Promise<{
            gasLimit: unknown;
            storageCollateralized: unknown;
          }>;
        };
        const result = await method.estimateGasAndCollateral({
          from: transaction.from,
          value: transaction.value,
        });
        return {
          gasLimit: toBigInt(result.gasLimit),
          storageCollateralized: toBigInt(result.storageCollateralized),
        };
      },
    });
  }

  getTransactionReceipt(transactionHash: string) {
    return this.ready().then(() => this.conflux!.getTransactionReceipt(transactionHash));
  }
}

export function transactionExplorerUrl(transactionHash: string): string {
  return `${CORE_SCAN_URL}/transaction/${encodeURIComponent(transactionHash)}`;
}
