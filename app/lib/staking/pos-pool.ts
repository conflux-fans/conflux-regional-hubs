import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  getAddress,
  type Eip1193Provider,
  type Provider,
  type Signer,
} from "ethers";
import { type StakeAmount, votesToCfx } from "./amounts.ts";
import { POS_POOL_ABI } from "./abi.ts";
import {
  APPROVED_POOL_IMPLEMENTATION,
  CONFLUX_ESPACE_CHAIN_ID,
  EIP1967_IMPLEMENTATION_SLOT,
  STAKING_CONTRACT_ADDRESS,
  STAKING_QUEUE_MAX_ITEMS,
  STAKING_QUEUE_PAGE_SIZE,
} from "./constants.ts";
import { deriveUserPosition, type QueueNode, type UserSummary } from "./models.ts";

type TransactionOptions = { value: bigint; gasLimit?: bigint };

export type PoolTransaction = {
  hash: string;
  wait(confirmations?: number, timeout?: number): Promise<{ status: number | null } | null>;
};

export interface PoolConnection {
  chainId(): Promise<bigint>;
  code(): Promise<string>;
  implementationAddress(): Promise<string>;
  call(method: string, args?: readonly unknown[]): Promise<unknown>;
  estimate(method: string, args: readonly unknown[], transaction: TransactionOptions): Promise<bigint>;
  send(method: string, args: readonly unknown[], transaction: TransactionOptions): Promise<PoolTransaction>;
  balance(account: string): Promise<bigint>;
  blockNumber(): Promise<bigint>;
  secondsPerBlock(): Promise<number>;
  feePerGas(): Promise<bigint>;
  receipt(hash: string): Promise<{ status: number | null } | null>;
}

type TupleLike = Record<string, unknown> & ArrayLike<unknown>;

function tupleValue(value: unknown, name: string, index: number) {
  const tuple = value as TupleLike;
  return tuple?.[name] ?? tuple?.[index];
}

function toBigInt(value: unknown, label: string) {
  try {
    return BigInt(value as bigint | string | number);
  } catch {
    throw new Error(`Invalid ${label} returned by the staking contract.`);
  }
}

function parseQueue(value: unknown): QueueNode[] {
  if (!Array.isArray(value)) throw new Error("Invalid queue returned by the staking contract.");
  return value.map((node) => ({
    votePower: toBigInt(tupleValue(node, "votePower", 0), "queue votePower"),
    endBlock: toBigInt(tupleValue(node, "endBlock", 1), "queue endBlock"),
  }));
}

function parseUserSummary(value: unknown): UserSummary {
  return {
    votes: toBigInt(tupleValue(value, "votes", 0), "user votes"),
    available: toBigInt(tupleValue(value, "available", 1), "user available votes"),
    locked: toBigInt(tupleValue(value, "locked", 2), "user locked votes"),
    unlocked: toBigInt(tupleValue(value, "unlocked", 3), "user unlocked votes"),
    claimedInterest: toBigInt(tupleValue(value, "claimedInterest", 4), "claimed interest"),
    currentInterest: toBigInt(tupleValue(value, "currentInterest", 5), "current interest"),
  };
}

export class PosPoolAdapter {
  readonly connection: PoolConnection;
  readonly contractAddress: string;

  constructor(connection: PoolConnection, contractAddress = STAKING_CONTRACT_ADDRESS) {
    const normalized = getAddress(contractAddress);
    if (normalized !== STAKING_CONTRACT_ADDRESS) throw new Error("Staking contract is not in the allowlist.");
    this.connection = connection;
    this.contractAddress = normalized;
  }

  async validateContract() {
    const [chainId, code, implementation, bridgeReady, lockPeriod, unlockPeriod] = await Promise.all([
      this.connection.chainId(),
      this.connection.code(),
      this.connection.implementationAddress(),
      this.connection.call("birdgeAddrSetted"),
      this.connection.call("_poolLockPeriod"),
      this.connection.call("_poolUnlockPeriod"),
    ]);
    if (chainId !== CONFLUX_ESPACE_CHAIN_ID) throw new Error("Unexpected staking network.");
    if (!code || code === "0x") throw new Error("Staking contract code is unavailable.");
    if (getAddress(implementation) !== APPROVED_POOL_IMPLEMENTATION) throw new Error("Unexpected staking implementation.");
    if (bridgeReady !== true) throw new Error("Staking pool bridge is not configured.");
    return {
      bridgeReady: true as const,
      lockPeriodBlocks: toBigInt(lockPeriod, "lock period"),
      unlockPeriodBlocks: toBigInt(unlockPeriod, "unlock period"),
      implementation: getAddress(implementation),
    };
  }

  async readPoolOverview() {
    const [name, summary, stakerCount, apyRaw, withdrawableCfxDrip, validation, secondsPerBlock] = await Promise.allSettled([
      this.connection.call("poolName"),
      this.connection.call("poolSummary"),
      this.connection.call("stakerNumber"),
      this.connection.call("poolAPY"),
      this.connection.call("withdrawableCfx"),
      this.validateContract(),
      this.connection.secondsPerBlock(),
    ]);
    const validationResult = validation.status === "fulfilled" ? validation.value : null;
    return {
      name: name.status === "fulfilled" && typeof name.value === "string" ? name.value : "",
      totalStakedCfx: summary.status === "fulfilled" ? votesToCfx(toBigInt(tupleValue(summary.value, "available", 0), "pool available votes")) : null,
      stakerCount: stakerCount.status === "fulfilled" ? toBigInt(stakerCount.value, "staker count") : null,
      apyRaw: apyRaw.status === "fulfilled" ? toBigInt(apyRaw.value, "pool APY") : null,
      withdrawableCfxDrip: withdrawableCfxDrip.status === "fulfilled" ? toBigInt(withdrawableCfxDrip.value, "withdrawable CFX") : null,
      secondsPerBlock: secondsPerBlock.status === "fulfilled" ? secondsPerBlock.value : 2,
      writeReady: Boolean(validationResult),
      validation: validationResult,
      validationError: validation.status === "rejected" ? validation.reason : null,
    };
  }

  async readQueue(kind: "in" | "out", account: string) {
    const method = `${kind === "in" ? "userInQueue" : "userOutQueue"}(address,uint64,uint64)`;
    const queue: QueueNode[] = [];
    for (let offset = 0n; queue.length < STAKING_QUEUE_MAX_ITEMS; offset += STAKING_QUEUE_PAGE_SIZE) {
      const page = parseQueue(await this.connection.call(method, [getAddress(account), offset, STAKING_QUEUE_PAGE_SIZE]));
      queue.push(...page.slice(0, STAKING_QUEUE_MAX_ITEMS - queue.length));
      if (page.length < Number(STAKING_QUEUE_PAGE_SIZE)) break;
    }
    return queue.sort((left, right) => left.endBlock < right.endBlock ? -1 : left.endBlock > right.endBlock ? 1 : 0);
  }

  async readUserSnapshot(account: string) {
    const address = getAddress(account);
    const [balanceDrip, summaryValue, interestDrip, poolLiquidityDrip, inQueue, outQueue, currentBlock] = await Promise.all([
      this.connection.balance(address),
      this.connection.call("userSummary", [address]),
      this.connection.call("userInterest", [address]),
      this.connection.call("withdrawableCfx"),
      this.readQueue("in", address),
      this.readQueue("out", address),
      this.connection.blockNumber(),
    ]);
    const summary = parseUserSummary(summaryValue);
    const claimableInterestDrip = toBigInt(interestDrip, "user interest");
    const liquidityDrip = toBigInt(poolLiquidityDrip, "withdrawable CFX");
    return {
      balanceDrip,
      summary,
      position: deriveUserPosition(summary, claimableInterestDrip, liquidityDrip),
      poolLiquidityDrip: liquidityDrip,
      inQueue,
      outQueue,
      currentBlock,
    };
  }

  async estimateStake(amount: StakeAmount) {
    await this.assertWriteSafety();
    return this.connection.estimate("increaseStake", [amount.votePower], { value: amount.valueDrip });
  }

  async estimateUnstake(votePower: bigint) {
    await this.assertWriteSafety();
    return this.connection.estimate("decreaseStake", [votePower], { value: 0n });
  }

  async estimateWithdraw(votePower: bigint) {
    await this.assertWriteSafety();
    return this.connection.estimate("withdrawStake", [votePower], { value: 0n });
  }

  async estimateClaim() {
    await this.assertWriteSafety();
    return this.connection.estimate("claimAllInterest", [], { value: 0n });
  }

  async sendStake(amount: StakeAmount, gasLimit: bigint) {
    await this.assertWriteSafety();
    return this.connection.send("increaseStake", [amount.votePower], { value: amount.valueDrip, gasLimit });
  }

  async sendUnstake(votePower: bigint, gasLimit: bigint) {
    await this.assertWriteSafety();
    return this.connection.send("decreaseStake", [votePower], { value: 0n, gasLimit });
  }

  async sendWithdraw(votePower: bigint, gasLimit: bigint) {
    await this.assertWriteSafety();
    return this.connection.send("withdrawStake", [votePower], { value: 0n, gasLimit });
  }

  async sendClaim(gasLimit: bigint) {
    await this.assertWriteSafety();
    return this.connection.send("claimAllInterest", [], { value: 0n, gasLimit });
  }

  transactionReceipt(hash: string) {
    return this.connection.receipt(hash);
  }

  private async assertWriteSafety() {
    await this.validateContract();
  }
}

export class EthersPoolConnection implements PoolConnection {
  private readonly provider: Provider;
  private readonly contract: Contract;
  private readonly address: string;

  constructor(provider: Provider, signer?: Signer, address = STAKING_CONTRACT_ADDRESS) {
    this.address = getAddress(address);
    this.provider = provider;
    this.contract = new Contract(this.address, POS_POOL_ABI, signer ?? provider);
  }

  async chainId() {
    return (await this.provider.getNetwork()).chainId;
  }

  code() {
    return this.provider.getCode(this.address);
  }

  async implementationAddress() {
    const value = await this.provider.getStorage(this.address, EIP1967_IMPLEMENTATION_SLOT);
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error("Invalid EIP-1967 implementation slot.");
    return getAddress(`0x${value.slice(-40)}`);
  }

  async call(method: string, args: readonly unknown[] = []) {
    return this.contract.getFunction(method)(...args);
  }

  async estimate(method: string, args: readonly unknown[], transaction: TransactionOptions) {
    return this.contract.getFunction(method).estimateGas(...args, transaction);
  }

  async send(method: string, args: readonly unknown[], transaction: TransactionOptions) {
    const response = await this.contract.getFunction(method)(...args, transaction);
    return response as PoolTransaction;
  }

  balance(account: string) {
    return this.provider.getBalance(account);
  }

  async blockNumber() {
    return BigInt(await this.provider.getBlockNumber());
  }

  async secondsPerBlock() {
    const currentNumber = await this.provider.getBlockNumber();
    const previousNumber = Math.max(0, currentNumber - 50);
    const [current, previous] = await Promise.all([this.provider.getBlock(currentNumber), this.provider.getBlock(previousNumber)]);
    if (!current || !previous || currentNumber === previousNumber) return 2;
    return Math.max(1, (current.timestamp - previous.timestamp) / (currentNumber - previousNumber));
  }

  async feePerGas() {
    const fees = await this.provider.getFeeData();
    return fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
  }

  receipt(hash: string) {
    return this.provider.getTransactionReceipt(hash);
  }
}

export function createReadPoolAdapter(rpcUrl: string) {
  const provider = new JsonRpcProvider(rpcUrl, Number(CONFLUX_ESPACE_CHAIN_ID), { staticNetwork: true });
  return new PosPoolAdapter(new EthersPoolConnection(provider));
}

export async function createWalletPoolAdapter(provider: Eip1193Provider) {
  const browserProvider = new BrowserProvider(provider);
  const signer = await browserProvider.getSigner();
  return new PosPoolAdapter(new EthersPoolConnection(browserProvider, signer));
}
