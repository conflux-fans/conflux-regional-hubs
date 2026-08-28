"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress, type Eip1193Provider } from "ethers";
import { useConnect, useConnection, useConnectionEffect, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { formatApy, formatCfx, formatDripAsCfx, parseStakeAmount } from "../lib/staking/amounts";
import { CONFLUX_ESPACE_CHAIN_ID, transactionExplorerUrl } from "../lib/staking/constants";
import { stakingErrorDetail, stakingErrorMessage } from "../lib/staking/errors";
import { queueNodeView, type QueueNode } from "../lib/staking/models";
import { createReadPoolAdapter, createWalletPoolAdapter, type PosPoolAdapter } from "../lib/staking/pos-pool";
import { WalletContextGuard, type WalletContext } from "../lib/staking/wallet-context";
import { readyWalletConnection, withoutExperimentalPermissionRevocation } from "../lib/staking/wallet-connector";
import { WalletModal } from "./wallet-modal";
import {
  canManuallyCheckReceipt,
  classifyReceiptStatus,
  gasLimitWithMargin,
  initialTransactionState,
  isTransactionPending,
  pendingTransactionKey,
  resolveConfirmedReplacement,
  transitionTransaction,
  type TransactionEvent,
  type TransactionPhase,
  type TransactionState,
} from "../lib/staking/transactions";

type PoolOverview = Awaited<ReturnType<PosPoolAdapter["readPoolOverview"]>>;
type UserSnapshot = Awaited<ReturnType<PosPoolAdapter["readUserSnapshot"]>>;
type Action = "stake" | "unstake" | "withdraw" | "claim";

const initialTransactions: Record<Action, TransactionState> = {
  stake: initialTransactionState(),
  unstake: initialTransactionState(),
  withdraw: initialTransactionState(),
  claim: initialTransactionState(),
};

const successMessages: Record<Action, string> = {
  stake: "Stake confirmed and entering the lock period",
  unstake: "Unstake confirmed and entering the unlock period",
  withdraw: "Principal withdrawn to your wallet",
  claim: "Rewards claimed to your wallet",
};

function phaseLabel(phase: TransactionPhase) {
  return {
    idle: "",
    validating: "Validating amount and network...",
    estimating: "Estimating gas...",
    awaiting_signature: "Confirm in your wallet...",
    submitted: "Transaction submitted",
    confirming: "Waiting for onchain confirmation...",
    success: "Transaction confirmed",
    refreshing: "Refreshing onchain data...",
    validation_error: "Check the entered amount",
    rejected: "Action cancelled",
    reverted: "Transaction failed",
    rpc_error: "Network service is temporarily unavailable",
  }[phase];
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function approximateTime(seconds: bigint) {
  if (seconds <= 0n) return "Matured";
  const days = seconds / 86_400n;
  if (days > 0n) return `About ${days} days (estimated)`;
  const hours = (seconds + 3599n) / 3600n;
  return `About ${hours} hours (estimated)`;
}

function QueuePanel({ title, queue, currentBlock, activeLabel, secondsPerBlock }: { title: string; queue: QueueNode[]; currentBlock: bigint; activeLabel: string; secondsPerBlock: number }) {
  const [expanded, setExpanded] = useState(false);
  const pending = queue.filter((node) => node.endBlock > currentBlock);
  const pendingCfx = pending.reduce((total, node) => total + node.votePower * 1000n, 0n);
  return (
    <section className="stake-queue">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span><b>{title}</b><small>{pending.length} active {pending.length === 1 ? "batch" : "batches"} · {formatCfx(pendingCfx)}</small></span>
        <i>{expanded ? "Collapse −" : "Expand +"}</i>
      </button>
      {expanded && (queue.length ? <div className="stake-queue-list">{queue.map((node, index) => {
        const view = queueNodeView(node, currentBlock, secondsPerBlock);
        return <article key={`${node.endBlock}-${index}`}><span><b>{formatCfx(view.amountCfx)}</b><small>Target block #{view.endBlock.toString()}</small></span><span><b>{view.matured ? "Matured" : activeLabel}</b><small>{approximateTime(view.estimatedSeconds)}</small></span></article>;
      })}</div> : <p className="stake-empty">No queue entries</p>)}
    </section>
  );
}

function TransactionNotice({ state, onCheck }: { state: TransactionState; onCheck?: () => void }) {
  if (state.phase === "idle") return null;
  const tone = state.phase === "success" ? "success" : ["validation_error", "rejected", "reverted", "rpc_error"].includes(state.phase) ? "error" : "pending";
  return (
    <output className={`stake-transaction ${tone}`} aria-live="polite">
      <b>{state.message || phaseLabel(state.phase)}</b>
      {state.hash && <a href={transactionExplorerUrl(state.hash)} target="_blank" rel="noreferrer">View transaction ↗</a>}
      {canManuallyCheckReceipt(state) && onCheck && <button type="button" onClick={onCheck}>Check receipt</button>}
      {state.detail && <details><summary>Technical details</summary><code>{state.detail}</code></details>}
    </output>
  );
}

export function StakeClient({ rpcUrl, contractAddress, poolFallbackName }: { rpcUrl: string; contractAddress: string; poolFallbackName: string }) {
  const [pool, setPool] = useState<PoolOverview | null>(null);
  const [poolError, setPoolError] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [pendingConnectorUid, setPendingConnectorUid] = useState<string>();
  const [user, setUser] = useState<UserSnapshot | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [stakeInput, setStakeInput] = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");
  const [transactions, setTransactions] = useState(initialTransactions);
  const connection = useConnection();
  const connectors = useConnectors();
  const connectMutation = useConnect();
  const disconnectMutation = useDisconnect();
  const switchChainMutation = useSwitchChain();
  const readyConnection = readyWalletConnection(connection);
  const account = readyConnection?.account ?? null;
  const chainId = readyConnection?.chainId ?? null;
  const activeConnector = readyConnection?.connector;
  const readAdapter = useMemo(() => createReadPoolAdapter(rpcUrl), [rpcUrl]);
  const walletAdapter = useRef<PosPoolAdapter | null>(null);
  const userRequest = useRef(0);
  const receiptQueries = useRef(new Set<string>());
  const walletContext = useRef(new WalletContextGuard());

  const updateTransaction = useCallback((action: Action, event: TransactionEvent) => {
    setTransactions((current) => ({ ...current, [action]: transitionTransaction(current[action], event) }));
  }, []);

  const restorePendingTransactions = useCallback((nextAccount: string) => {
    setTransactions(() => {
      const restored = { ...initialTransactions };
      for (const action of Object.keys(initialTransactions) as Action[]) {
        const hash = window.localStorage.getItem(pendingTransactionKey(nextAccount, action));
        if (hash) restored[action] = transitionTransaction(restored[action], { type: "submitted", hash, message: "Pending transaction found" });
      }
      return restored;
    });
  }, []);

  const refreshPool = useCallback(async () => {
    try {
      const overview = await readAdapter.readPoolOverview();
      setPool(overview);
      setPoolError(overview.writeReady ? "" : stakingErrorMessage(overview.validationError));
    } catch (error) {
      setPool(null);
      setPoolError(stakingErrorMessage(error));
    }
  }, [readAdapter]);

  const clearUser = useCallback(() => {
    userRequest.current += 1;
    setUser(null);
    setStakeInput("");
    setUnstakeInput("");
    setTransactions(initialTransactions);
    setUserLoading(false);
  }, []);

  const handleWalletDisconnect = useCallback(() => {
    walletContext.current.clear();
    walletAdapter.current = null;
    clearUser();
  }, [clearUser]);

  useConnectionEffect({ onDisconnect: handleWalletDisconnect });

  const refreshUser = useCallback(async (nextAccount?: string | null) => {
    const adapter = walletAdapter.current;
    const context = walletContext.current.current();
    const targetAccount = nextAccount ?? context.account;
    if (!adapter || !targetAccount || context.chainId !== CONFLUX_ESPACE_CHAIN_ID) return;
    const request = ++userRequest.current;
    setUserLoading(true);
    try {
      const snapshot = await adapter.readUserSnapshot(targetAccount);
      if (request === userRequest.current && adapter === walletAdapter.current && walletContext.current.matches(context)) {
        setUser(snapshot);
        setWalletMessage("");
      }
    } catch (error) {
      if (request === userRequest.current && adapter === walletAdapter.current && walletContext.current.matches(context)) setWalletMessage(stakingErrorMessage(error));
    } finally {
      if (request === userRequest.current) setUserLoading(false);
    }
  }, []);

  const isCurrentWallet = useCallback((context: WalletContext) => walletContext.current.matches(context), []);

  const prepareWalletAdapter = useCallback(async (provider: Eip1193Provider, nextAccount: string, nextChainId: bigint) => {
    const context = walletContext.current.replace(nextAccount, nextChainId);
    clearUser();
    restorePendingTransactions(nextAccount);
    walletAdapter.current = null;
    if (nextChainId !== CONFLUX_ESPACE_CHAIN_ID) return;
    setUserLoading(true);
    try {
      const adapter = await createWalletPoolAdapter(provider);
      if (!isCurrentWallet(context)) return;
      walletAdapter.current = adapter;
      await refreshUser(nextAccount);
    } catch (error) {
      if (isCurrentWallet(context)) setWalletMessage(stakingErrorMessage(error));
    } finally {
      if (isCurrentWallet(context)) setUserLoading(false);
    }
  }, [clearUser, isCurrentWallet, refreshUser, restorePendingTransactions]);

  useEffect(() => {
    const refreshVisibleData = () => {
      if (document.visibilityState !== "visible") return;
      void Promise.all([refreshPool(), refreshUser()]);
    };
    const initial = window.setTimeout(() => void refreshPool(), 0);
    const timer = window.setInterval(refreshVisibleData, 30_000);
    const onFocus = () => refreshVisibleData();
    const onVisibility = () => refreshVisibleData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPool, refreshUser]);

  useEffect(() => {
    let cancelled = false;
    const connector = activeConnector;
    if (!connector || !account || chainId === null) {
      walletContext.current.clear();
      walletAdapter.current = null;
      return;
    }

    void connector.getProvider().then((provider) => {
      if (cancelled) return;
      if (!provider || typeof provider !== "object" || !("request" in provider)) throw new Error("Wallet provider is unavailable");
      return prepareWalletAdapter(provider as Eip1193Provider, account, chainId);
    }).catch((error) => {
      if (!cancelled) setWalletMessage(stakingErrorMessage(error));
    });
    return () => { cancelled = true; };
  }, [account, activeConnector, chainId, prepareWalletAdapter]);

  async function connect(connector: Connector) {
    setPendingConnectorUid(connector.uid);
    setWalletMessage("");
    try {
      await connectMutation.mutateAsync({ connector });
      setWalletModalOpen(false);
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    } finally {
      setPendingConnectorUid(undefined);
    }
  }

  async function disconnect() {
    const connector = activeConnector;
    if (!connector) return;
    setWalletMessage("");
    try {
      await disconnectMutation.mutateAsync({ connector: withoutExperimentalPermissionRevocation(connector) });
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    }
  }

  async function switchNetwork() {
    try {
      await switchChainMutation.mutateAsync({ chainId: Number(CONFLUX_ESPACE_CHAIN_ID) });
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    }
  }

  async function runTransaction(action: Action) {
    const adapter = walletAdapter.current;
    if (!adapter || !account || !user || chainId !== CONFLUX_ESPACE_CHAIN_ID || isTransactionPending(transactions[action])) return;
    const operationAccount = account;
    const operationContext = walletContext.current.current();
    const updateIfCurrent = (event: TransactionEvent) => {
      if (isCurrentWallet(operationContext)) updateTransaction(action, event);
    };
    let submittedHash: string | undefined;
    let phase: TransactionPhase = "validating";
    try {
      updateIfCurrent({ type: "validating" });
      let votePower = 0n;
      let stakeAmount: ReturnType<typeof parseStakeAmount> | undefined;
      if (action === "stake") stakeAmount = parseStakeAmount(stakeInput);
      if (action === "unstake") {
        const amount = parseStakeAmount(unstakeInput);
        if (amount.cfx > user.position.redeemableCfx) throw new Error("Locked is not enough");
        votePower = amount.votePower;
      }
      if (action === "withdraw") {
        votePower = user.position.withdrawableVotes;
        if (votePower === 0n) throw new Error("Withdrawable CFX is not enough");
      }
      if (action === "claim" && user.position.claimableInterestDrip === 0n) throw new Error("No claimable interest");

      phase = "estimating";
      updateIfCurrent({ type: "estimating" });
      const estimate = action === "stake" ? await adapter.estimateStake(stakeAmount!)
        : action === "unstake" ? await adapter.estimateUnstake(votePower)
          : action === "withdraw" ? await adapter.estimateWithdraw(votePower)
            : await adapter.estimateClaim();
      const gasLimit = gasLimitWithMargin(estimate);
      if (action === "stake" && stakeAmount) {
        if (await adapter.estimatedStakeCost(stakeAmount, gasLimit) > user.balanceDrip) {
          phase = "validating";
          throw new Error("Insufficient balance to cover the stake amount and estimated gas");
        }
      }

      if (!isCurrentWallet(operationContext)) return;
      phase = "awaiting_signature";
      updateIfCurrent({ type: "awaiting_signature" });
      const transaction = action === "stake" ? await adapter.sendStake(stakeAmount!, gasLimit)
        : action === "unstake" ? await adapter.sendUnstake(votePower, gasLimit)
          : action === "withdraw" ? await adapter.sendWithdraw(votePower, gasLimit)
            : await adapter.sendClaim(gasLimit);
      submittedHash = transaction.hash;
      window.localStorage.setItem(pendingTransactionKey(operationAccount, action), transaction.hash);
      updateIfCurrent({ type: "submitted", hash: transaction.hash });
      updateIfCurrent({ type: "confirming" });
      const receipt = await transaction.wait(1, 180_000);
      if (!receipt) throw new Error("Transaction confirmation timeout");
      const receiptOutcome = classifyReceiptStatus(receipt.status);
      if (receiptOutcome === "unknown") throw new Error("Unknown transaction receipt status");
      if (receiptOutcome === "failed") {
        window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
        updateIfCurrent({ type: "reverted", hash: transaction.hash, message: "Transaction failed" });
        if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
      if (isCurrentWallet(operationContext)) {
        updateIfCurrent({ type: "refreshing", hash: transaction.hash, message: "Transaction confirmed. Refreshing onchain data..." });
        setStakeInput("");
        setUnstakeInput("");
        await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        updateIfCurrent({ type: "success", hash: transaction.hash, message: successMessages[action] });
      }
    } catch (error) {
      const replacement = submittedHash ? resolveConfirmedReplacement(error) : null;
      if (replacement) {
        window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
        if (replacement.outcome === "success") {
          if (isCurrentWallet(operationContext)) {
            updateIfCurrent({ type: "refreshing", hash: replacement.hash, message: "Replacement transaction confirmed. Refreshing onchain data..." });
            setStakeInput("");
            setUnstakeInput("");
            await Promise.all([refreshPool(), refreshUser(operationAccount)]);
            updateIfCurrent({ type: "success", hash: replacement.hash, message: successMessages[action] });
          }
        } else {
          updateIfCurrent({ type: "reverted", hash: replacement.hash, message: "The original transaction was cancelled, or its replacement failed" });
          if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        }
        return;
      }
      const code = error && typeof error === "object" ? (error as { code?: number | string }).code : undefined;
      const errorPhase = submittedHash ? "rpc_error" : phase === "validating" ? "validation_error" : code === 4001 || code === "ACTION_REJECTED" ? "rejected" : code === "CALL_EXCEPTION" ? "reverted" : "rpc_error";
      updateIfCurrent({ type: errorPhase, ...(submittedHash ? { hash: submittedHash } : {}), message: submittedHash ? "Transaction submitted, but the receipt is not confirmed yet. Continue checking." : stakingErrorMessage(error), detail: stakingErrorDetail(error) });
      if (submittedHash && isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
    }
  }

  async function checkReceipt(action: Action) {
    const adapter = walletAdapter.current;
    const hash = transactions[action].hash;
    if (!adapter || !hash || !account) return;
    const queryKey = pendingTransactionKey(account, action);
    if (receiptQueries.current.has(queryKey)) return;
    receiptQueries.current.add(queryKey);
    const operationAccount = account;
    const operationContext = walletContext.current.current();
    const updateIfCurrent = (event: TransactionEvent) => {
      if (isCurrentWallet(operationContext)) updateTransaction(action, event);
    };
    try {
      updateIfCurrent({ type: "confirming", hash, message: "Checking the onchain receipt..." });
      const receipt = await adapter.transactionReceipt(hash);
      if (!receipt) {
        updateIfCurrent({ type: "submitted", hash, message: "The transaction is still awaiting confirmation. An unknown status keeps this action locked." });
        return;
      }
      const receiptOutcome = classifyReceiptStatus(receipt.status);
      if (receiptOutcome === "unknown") {
        updateIfCurrent({ type: "submitted", hash, message: "The RPC returned an unknown receipt status. This action remains locked." });
        return;
      }
      if (receiptOutcome === "failed") {
        window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
        updateIfCurrent({ type: "reverted", hash, message: "Transaction failed" });
        if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
      updateIfCurrent({ type: "refreshing", hash, message: "Transaction confirmed. Refreshing onchain data..." });
      if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
      updateIfCurrent({ type: "success", hash, message: successMessages[action] });
    } catch (error) {
      updateIfCurrent({ type: "rpc_error", hash, message: "Receipt lookup failed. The transaction remains pending.", detail: stakingErrorDetail(error) });
    } finally {
      receiptQueries.current.delete(queryKey);
    }
  }

  const correctNetwork = chainId === CONFLUX_ESPACE_CHAIN_ID;
  const poolName = pool?.name || poolFallbackName;
  const stakeInputError = (() => {
    if (!stakeInput) return "";
    try { parseStakeAmount(stakeInput); return ""; } catch (error) { return stakingErrorMessage(error); }
  })();
  const unstakeInputError = (() => {
    if (!unstakeInput) return "";
    try {
      const amount = parseStakeAmount(unstakeInput);
      return user && amount.cfx > user.position.redeemableCfx ? "Entered amount exceeds the amount currently available to unstake" : "";
    } catch (error) { return stakingErrorMessage(error); }
  })();

  return (
    <div className="stake-dashboard v2-wrap">
      <section className="stake-pool" aria-busy={!pool && !poolError}>
        <div><span>POOL OVERVIEW</span><h2>{poolName}</h2><p>View live onchain pool data without connecting a wallet.</p></div>
        <div className="stake-metrics">
          <article><span>Total staked</span><b>{pool ? pool.totalStakedCfx === null ? "Unavailable" : formatCfx(pool.totalStakedCfx) : "Loading..."}</b></article>
          <article><span>Stakers</span><b>{pool ? pool.stakerCount === null ? "Unavailable" : pool.stakerCount.toLocaleString("en-US") : "Loading..."}</b></article>
          <article><span>Recent APY</span><b>{pool ? pool.apyRaw === null ? "Unavailable" : formatApy(pool.apyRaw) : "Loading..."}</b><small>Historical metric, not guaranteed returns</small></article>
        </div>
        {poolError && <output className="stake-global-error" role="alert">Pool unavailable: {poolError}. Transactions are disabled.</output>}
      </section>

      <section className="stake-wallet-bar">
        {!account ? connection.status === "reconnecting" ? <button type="button" className="stake-connect-button" disabled>Restoring wallet...</button> : <button type="button" className="stake-connect-button" onClick={() => { setWalletMessage(""); setWalletModalOpen(true); }}>Connect wallet</button>
          : <><div><b>{shortAddress(account)}</b><span>{correctNetwork ? "Conflux eSpace Mainnet" : `Wrong network · chain ${chainId?.toString()}`}</span></div><button type="button" onClick={() => void navigator.clipboard.writeText(account)}>Copy address</button>{!correctNetwork && <button type="button" onClick={switchNetwork}>Switch network</button>}<button type="button" disabled={disconnectMutation.isPending} onClick={() => void disconnect()}>{disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}</button></>}
        {walletMessage && !walletModalOpen && <output role="alert">{walletMessage}</output>}
      </section>
      {walletModalOpen && <WalletModal connectors={connectors} errorMessage={walletMessage} pendingConnectorUid={pendingConnectorUid} onClose={() => setWalletModalOpen(false)} onSelect={(connector) => void connect(connector)} />}

      {account && !correctNetwork && <section className="stake-network-warning" role="alert"><b>Switch to Conflux eSpace Mainnet</b><p>All staking transactions are disabled on the wrong network. The required chain ID is 1030 (0x406).</p></section>}

      <section className="stake-user" aria-busy={userLoading}>
        <div className="stake-section-heading"><span>YOUR POSITION</span><h2>Your onchain assets</h2>{account && <p>Wallet balance: {user ? formatDripAsCfx(user.balanceDrip) : "Loading..."}</p>}</div>
        {!account ? <p className="stake-empty">Connect your wallet to view staking, unstaking, and reward status.</p> : !user ? <p className="stake-empty">{userLoading ? "Loading account data..." : "Account data unavailable"}</p> : <>
          <div className="stake-assets">
            <article><span>Currently staked</span><b>{formatCfx(user.position.stakedCfx)}</b></article>
            <article><span>Available to unstake</span><b>{formatCfx(user.position.redeemableCfx)}</b></article>
            <article><span>Pending unlock</span><b>{formatCfx(user.position.pendingUnlockCfx)}</b></article>
            <article><span>Unlocked principal</span><b>{formatCfx(user.position.unlockedCfx)}</b></article>
            <article><span>Currently withdrawable</span><b>{formatCfx(user.position.withdrawableCfx)}</b>{user.position.unlockedCfx > user.position.withdrawableCfx && <small>Remaining principal is waiting for pool liquidity</small>}</article>
            <article><span>Claimable / total rewards</span><b>{formatDripAsCfx(user.position.claimableInterestDrip)}</b><small>Total {formatDripAsCfx(user.position.totalInterestDrip)}</small></article>
          </div>
          <div className="stake-actions">
            <article>
              <span>01 / STAKE</span><h3>Stake CFX</h3><p>Minimum 1,000 CFX in whole multiples of 1,000. Once confirmed, funds enter a lock period of about 13 days.</p>
              <label htmlFor="stake-amount">Stake amount <small>CFX</small></label><input id="stake-amount" aria-describedby="stake-amount-error" aria-invalid={Boolean(stakeInputError)} inputMode="numeric" pattern="[0-9]*" value={stakeInput} onChange={(event) => setStakeInput(event.target.value)} placeholder="3000" />
              <small id="stake-amount-error" className="stake-input-error" role="alert">{stakeInputError}</small>
              <button type="button" onClick={() => void runTransaction("stake")} disabled={!pool?.writeReady || !correctNetwork || Boolean(stakeInputError) || isTransactionPending(transactions.stake)}>Stake</button>
              <TransactionNotice state={transactions.stake} onCheck={() => void checkReceipt("stake")} />
            </article>
            <article>
              <span>02 / UNSTAKE</span><h3>Unstake CFX</h3><p>Only funds that have completed the staking lock period can be unstaked. Once confirmed, they enter an unlock period of about one day and are not immediately available.</p>
              <label htmlFor="unstake-amount">Unstake amount <small>Max {formatCfx(user.position.redeemableCfx)}</small></label><input id="unstake-amount" aria-describedby="unstake-amount-error" aria-invalid={Boolean(unstakeInputError)} inputMode="numeric" pattern="[0-9]*" value={unstakeInput} onChange={(event) => setUnstakeInput(event.target.value)} placeholder="1000" />
              <small id="unstake-amount-error" className="stake-input-error" role="alert">{unstakeInputError}</small>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("unstake")} disabled={!pool?.writeReady || !correctNetwork || user.position.redeemableCfx === 0n || Boolean(unstakeInputError) || isTransactionPending(transactions.unstake)}>Unstake</button>
              <TransactionNotice state={transactions.unstake} onCheck={() => void checkReceipt("unstake")} />
            </article>
            <article>
              <span>03 / WITHDRAW</span><h3>Withdraw principal</h3><p>This withdrawal: {formatCfx(user.position.withdrawableCfx)}. Unlocked principal may still be limited by the pool&apos;s bridge liquidity.</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("withdraw")} disabled={!pool?.writeReady || !correctNetwork || user.position.withdrawableVotes === 0n || isTransactionPending(transactions.withdraw)}>Withdraw available amount</button>
              {user.position.unlockedCfx > 0n && user.position.withdrawableVotes === 0n && <small className="stake-liquidity-note">Waiting for pool withdrawal liquidity</small>}
              <TransactionNotice state={transactions.withdraw} onCheck={() => void checkReceipt("withdraw")} />
            </article>
            <article>
              <span>04 / REWARDS</span><h3>Claim all rewards</h3><p>Claimable: {formatDripAsCfx(user.position.claimableInterestDrip)}. This version only supports claiming all rewards at once.</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("claim")} disabled={!pool?.writeReady || !correctNetwork || user.position.claimableInterestDrip === 0n || isTransactionPending(transactions.claim)}>Claim all rewards</button>
              <TransactionNotice state={transactions.claim} onCheck={() => void checkReceipt("claim")} />
            </article>
          </div>
          <div className="stake-queues">
            <QueuePanel title="Stake lock queue" queue={user.inQueue} currentBlock={user.currentBlock} activeLabel="Locking" secondsPerBlock={pool?.secondsPerBlock ?? 2} />
            <QueuePanel title="Unstake unlock queue" queue={user.outQueue} currentBlock={user.currentBlock} activeLabel="Unlocking" secondsPerBlock={pool?.secondsPerBlock ?? 2} />
          </div>
        </>}
      </section>

      <section className="stake-risks">
        <span>RISK DISCLOSURE</span><h2>Before you submit</h2>
        <div><p>You are interacting with a third-party PoS pool proxy contract. This site never holds private keys, signs transactions for you, or asks for a seed phrase.</p><p>Validator penalties, contract, RPC, cross-space bridge, and liquidity risks may affect returns or settlement times. The final state is determined by the eSpace receipt and current block.</p></div>
        <code>{getAddress(contractAddress)}</code>
      </section>
    </div>
  );
}
