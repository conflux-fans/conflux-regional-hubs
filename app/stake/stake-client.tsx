"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress, type Eip1193Provider } from "ethers";
import { useConnect, useConnection, useConnectionEffect, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { formatApy, formatCfx, formatDripAsCfx, parseStakeAmount } from "../lib/staking/amounts";
import { CONFLUX_ESPACE_CHAIN_ID, transactionExplorerUrl } from "../lib/staking/constants";
import { stakeCopy, translateStakingMessage, type StakeCopy, type StakeLocale } from "../lib/staking/copy";
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

function approximateTime(seconds: bigint, copy: StakeCopy) {
  if (seconds <= 0n) return copy.approx.matured;
  const days = seconds / 86_400n;
  if (days > 0n) return copy.approx.days(days);
  const hours = (seconds + 3599n) / 3600n;
  return copy.approx.hours(hours);
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function QueuePanel({ title, queue, currentBlock, activeLabel, secondsPerBlock, copy }: { title: string; queue: QueueNode[]; currentBlock: bigint; activeLabel: string; secondsPerBlock: number; copy: StakeCopy }) {
  const [expanded, setExpanded] = useState(false);
  const pending = queue.filter((node) => node.endBlock > currentBlock);
  const pendingCfx = pending.reduce((total, node) => total + node.votePower * 1000n, 0n);
  return (
    <section className="stake-queue">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span><b>{title}</b><small>{copy.queue.active(pending.length)} · {formatCfx(pendingCfx)}</small></span>
        <i>{expanded ? copy.queue.collapse : copy.queue.expand}</i>
      </button>
      {expanded && (queue.length ? <div className="stake-queue-list">{queue.map((node, index) => {
        const view = queueNodeView(node, currentBlock, secondsPerBlock);
        return <article key={`${node.endBlock}-${index}`}><span><b>{formatCfx(view.amountCfx)}</b><small>{copy.queue.targetBlock}{view.endBlock.toString()}</small></span><span><b>{view.matured ? copy.approx.matured : activeLabel}</b><small>{approximateTime(view.estimatedSeconds, copy)}</small></span></article>;
      })}</div> : <p className="stake-empty">{copy.queue.empty}</p>)}
    </section>
  );
}

function TransactionNotice({ state, onCheck, copy }: { state: TransactionState; onCheck?: () => void; copy: StakeCopy }) {
  if (state.phase === "idle") return null;
  const tone = state.phase === "success" ? "success" : ["validation_error", "rejected", "reverted", "rpc_error"].includes(state.phase) ? "error" : "pending";
  return (
    <output className={`stake-transaction ${tone}`} aria-live="polite">
      <b>{state.message || copy.phaseLabel[state.phase]}</b>
      {state.hash && <a href={transactionExplorerUrl(state.hash)} target="_blank" rel="noreferrer">{copy.notice.viewTransaction}</a>}
      {canManuallyCheckReceipt(state) && onCheck && <button type="button" onClick={onCheck}>{copy.notice.checkReceipt}</button>}
      {state.detail && <details><summary>{copy.notice.technicalDetails}</summary><code>{state.detail}</code></details>}
    </output>
  );
}

export function StakeClient({ rpcUrl, contractAddress, poolFallbackName, locale = "en" }: { rpcUrl: string; contractAddress: string; poolFallbackName: string; locale?: StakeLocale }) {
  const copy = stakeCopy(locale);
  const errorMessage = useCallback((error: unknown) => translateStakingMessage(locale, stakingErrorMessage(error)), [locale]);
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
  const readAdapter = useMemo(() => createReadPoolAdapter(rpcUrl, contractAddress), [contractAddress, rpcUrl]);
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
        if (hash) restored[action] = transitionTransaction(restored[action], { type: "submitted", hash, message: copy.messages.pendingFound });
      }
      return restored;
    });
  }, [copy]);

  const refreshPool = useCallback(async () => {
    try {
      const overview = await readAdapter.readPoolOverview();
      setPool(overview);
      setPoolError(overview.writeReady ? "" : errorMessage(overview.validationError));
    } catch (error) {
      setPool(null);
      setPoolError(errorMessage(error));
    }
  }, [errorMessage, readAdapter]);

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
      if (request === userRequest.current && adapter === walletAdapter.current && walletContext.current.matches(context)) setWalletMessage(errorMessage(error));
    } finally {
      if (request === userRequest.current) setUserLoading(false);
    }
  }, [errorMessage]);

  const isCurrentWallet = useCallback((context: WalletContext) => walletContext.current.matches(context), []);

  const prepareWalletAdapter = useCallback(async (provider: Eip1193Provider, nextAccount: string, nextChainId: bigint) => {
    const context = walletContext.current.replace(nextAccount, nextChainId);
    clearUser();
    restorePendingTransactions(nextAccount);
    walletAdapter.current = null;
    if (nextChainId !== CONFLUX_ESPACE_CHAIN_ID) return;
    setUserLoading(true);
    try {
      const adapter = await createWalletPoolAdapter(provider, contractAddress);
      if (!isCurrentWallet(context)) return;
      walletAdapter.current = adapter;
      await refreshUser(nextAccount);
    } catch (error) {
      if (isCurrentWallet(context)) setWalletMessage(errorMessage(error));
    } finally {
      if (isCurrentWallet(context)) setUserLoading(false);
    }
  }, [clearUser, contractAddress, errorMessage, isCurrentWallet, refreshUser, restorePendingTransactions]);

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
      if (!cancelled) setWalletMessage(errorMessage(error));
    });
    return () => { cancelled = true; };
  }, [account, activeConnector, chainId, errorMessage, prepareWalletAdapter]);

  async function connect(connector: Connector) {
    setPendingConnectorUid(connector.uid);
    setWalletMessage("");
    try {
      await connectMutation.mutateAsync({ connector });
      setWalletModalOpen(false);
    } catch (error) {
      setWalletMessage(errorMessage(error));
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
      setWalletMessage(errorMessage(error));
    }
  }

  async function switchNetwork() {
    try {
      await switchChainMutation.mutateAsync({ chainId: Number(CONFLUX_ESPACE_CHAIN_ID) });
    } catch (error) {
      setWalletMessage(errorMessage(error));
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
        updateIfCurrent({ type: "reverted", hash: transaction.hash, message: copy.messages.txFailed });
        if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
      if (isCurrentWallet(operationContext)) {
        updateIfCurrent({ type: "refreshing", hash: transaction.hash, message: copy.messages.confirmedRefreshing });
        setStakeInput("");
        setUnstakeInput("");
        await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        updateIfCurrent({ type: "success", hash: transaction.hash, message: copy.success[action] });
      }
    } catch (error) {
      const replacement = submittedHash ? resolveConfirmedReplacement(error) : null;
      if (replacement) {
        window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
        if (replacement.outcome === "success") {
          if (isCurrentWallet(operationContext)) {
            updateIfCurrent({ type: "refreshing", hash: replacement.hash, message: copy.messages.replacementConfirmed });
            setStakeInput("");
            setUnstakeInput("");
            await Promise.all([refreshPool(), refreshUser(operationAccount)]);
            updateIfCurrent({ type: "success", hash: replacement.hash, message: copy.success[action] });
          }
        } else {
          updateIfCurrent({ type: "reverted", hash: replacement.hash, message: copy.messages.replacementFailed });
          if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        }
        return;
      }
      const code = error && typeof error === "object" ? (error as { code?: number | string }).code : undefined;
      const errorPhase = submittedHash ? "rpc_error" : phase === "validating" ? "validation_error" : code === 4001 || code === "ACTION_REJECTED" ? "rejected" : code === "CALL_EXCEPTION" ? "reverted" : "rpc_error";
      updateIfCurrent({ type: errorPhase, ...(submittedHash ? { hash: submittedHash } : {}), message: submittedHash ? copy.messages.submittedUnconfirmed : errorMessage(error), detail: stakingErrorDetail(error) });
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
      updateIfCurrent({ type: "confirming", hash, message: copy.messages.checkingReceipt });
      const receipt = await adapter.transactionReceipt(hash);
      if (!receipt) {
        updateIfCurrent({ type: "submitted", hash, message: copy.messages.stillAwaiting });
        return;
      }
      const receiptOutcome = classifyReceiptStatus(receipt.status);
      if (receiptOutcome === "unknown") {
        updateIfCurrent({ type: "submitted", hash, message: copy.messages.rpcUnknown });
        return;
      }
      if (receiptOutcome === "failed") {
        window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
        updateIfCurrent({ type: "reverted", hash, message: copy.messages.txFailed });
        if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(operationAccount, action));
      updateIfCurrent({ type: "refreshing", hash, message: copy.messages.confirmedRefreshing });
      if (isCurrentWallet(operationContext)) await Promise.all([refreshPool(), refreshUser(operationAccount)]);
      updateIfCurrent({ type: "success", hash, message: copy.success[action] });
    } catch (error) {
      updateIfCurrent({ type: "rpc_error", hash, message: copy.messages.receiptLookupFailed, detail: stakingErrorDetail(error) });
    } finally {
      receiptQueries.current.delete(queryKey);
    }
  }

  const correctNetwork = chainId === CONFLUX_ESPACE_CHAIN_ID;
  const poolName = pool?.name || poolFallbackName;
  const stakeInputError = (() => {
    if (!stakeInput) return "";
    try { parseStakeAmount(stakeInput); return ""; } catch (error) { return errorMessage(error); }
  })();
  const unstakeInputError = (() => {
    if (!unstakeInput) return "";
    try {
      const amount = parseStakeAmount(unstakeInput);
      return user && amount.cfx > user.position.redeemableCfx ? copy.actions.unstakeExceeds : "";
    } catch (error) { return errorMessage(error); }
  })();

  return (
    <div className="stake-dashboard v2-wrap">
      <section className="stake-pool" aria-busy={!pool && !poolError}>
        <div><span>{copy.pool.overview}</span><h2>{poolName}</h2><p>{copy.pool.live}</p></div>
        <div className="stake-metrics">
          <article><span>{copy.pool.totalStaked}</span><b>{pool ? pool.totalStakedCfx === null ? copy.pool.unavailable : formatCfx(pool.totalStakedCfx) : copy.pool.loading}</b></article>
          <article><span>{copy.pool.stakers}</span><b>{pool ? pool.stakerCount === null ? copy.pool.unavailable : pool.stakerCount.toLocaleString("en-US") : copy.pool.loading}</b></article>
          <article><span>{copy.pool.recentApy}</span><b>{pool ? pool.apyRaw === null ? copy.pool.unavailable : formatApy(pool.apyRaw) : copy.pool.loading}</b><small>{copy.pool.apyNote}</small></article>
        </div>
        {poolError && <output className="stake-global-error" role="alert">{copy.pool.unavailableError(poolError)}</output>}
      </section>

      <section className="stake-wallet-bar">
        {!account ? connection.status === "reconnecting" ? <button type="button" className="stake-connect-button" disabled>{copy.wallet.restoring}</button> : <button type="button" className="stake-connect-button" onClick={() => { setWalletMessage(""); setWalletModalOpen(true); }}>{copy.wallet.connect}</button>
          : <><div><b>{shortAddress(account)}</b><span>{correctNetwork ? copy.wallet.network : copy.wallet.wrongNetwork(chainId?.toString() ?? "")}</span></div><button type="button" onClick={() => void navigator.clipboard.writeText(account)}>{copy.wallet.copyAddress}</button>{!correctNetwork && <button type="button" onClick={switchNetwork}>{copy.wallet.switchNetwork}</button>}<button type="button" disabled={disconnectMutation.isPending} onClick={() => void disconnect()}>{disconnectMutation.isPending ? copy.wallet.disconnecting : copy.wallet.disconnect}</button></>}
        {walletMessage && !walletModalOpen && <output role="alert">{walletMessage}</output>}
      </section>
      {walletModalOpen && <WalletModal connectors={connectors} errorMessage={walletMessage} pendingConnectorUid={pendingConnectorUid} locale={locale} onClose={() => setWalletModalOpen(false)} onSelect={(connector) => void connect(connector)} />}

      {account && !correctNetwork && <section className="stake-network-warning" role="alert"><b>{copy.wallet.switchTitle}</b><p>{copy.wallet.switchBody}</p></section>}

      <section className="stake-user" aria-busy={userLoading}>
        <div className="stake-section-heading"><span>{copy.position.heading}</span><h2>{copy.position.title}</h2>{account && <p>{copy.position.balanceLabel}{user ? formatDripAsCfx(user.balanceDrip) : copy.pool.loading}</p>}</div>
        {!account ? <p className="stake-empty">{copy.position.connectPrompt}</p> : !user ? <p className="stake-empty">{userLoading ? copy.position.loading : copy.position.unavailable}</p> : <>
          <div className="stake-assets">
            <article><span>{copy.position.staked}</span><b>{formatCfx(user.position.stakedCfx)}</b></article>
            <article><span>{copy.position.availableUnstake}</span><b>{formatCfx(user.position.redeemableCfx)}</b></article>
            <article><span>{copy.position.pendingUnlock}</span><b>{formatCfx(user.position.pendingUnlockCfx)}</b></article>
            <article><span>{copy.position.unlockedPrincipal}</span><b>{formatCfx(user.position.unlockedCfx)}</b></article>
            <article><span>{copy.position.withdrawable}</span><b>{formatCfx(user.position.withdrawableCfx)}</b>{user.position.unlockedCfx > user.position.withdrawableCfx && <small>{copy.position.liquidityNote}</small>}</article>
            <article><span>{copy.position.claimable}</span><b>{formatDripAsCfx(user.position.claimableInterestDrip)}</b><small>{copy.position.totalPrefix}{formatDripAsCfx(user.position.totalInterestDrip)}</small></article>
          </div>
          <div className="stake-actions">
            <article>
              <span>{copy.actions.stakeStep}</span><h3>{copy.actions.stakeTitle}</h3><p>{copy.actions.stakeDescription}</p>
              <label htmlFor="stake-amount">{copy.actions.stakeAmountLabel} <small>CFX</small></label><input id="stake-amount" aria-describedby="stake-amount-error" aria-invalid={Boolean(stakeInputError)} inputMode="numeric" pattern="[0-9]*" value={stakeInput} onChange={(event) => setStakeInput(event.target.value)} placeholder="1000" />
              <small id="stake-amount-error" className="stake-input-error" role="alert">{stakeInputError}</small>
              <button type="button" onClick={() => void runTransaction("stake")} disabled={!pool?.writeReady || !correctNetwork || Boolean(stakeInputError) || isTransactionPending(transactions.stake)}>{copy.actions.stakeButton}</button>
              <TransactionNotice state={transactions.stake} onCheck={() => void checkReceipt("stake")} copy={copy} />
            </article>
            <article>
              <span>{copy.actions.unstakeStep}</span><h3>{copy.actions.unstakeTitle}</h3><p>{copy.actions.unstakeDescription}</p>
              <label htmlFor="unstake-amount">{copy.actions.unstakeAmountLabel} <small>{copy.actions.max(formatCfx(user.position.redeemableCfx))}</small></label><input id="unstake-amount" aria-describedby="unstake-amount-error" aria-invalid={Boolean(unstakeInputError)} inputMode="numeric" pattern="[0-9]*" value={unstakeInput} onChange={(event) => setUnstakeInput(event.target.value)} placeholder="1000" />
              <small id="unstake-amount-error" className="stake-input-error" role="alert">{unstakeInputError}</small>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("unstake")} disabled={!pool?.writeReady || !correctNetwork || user.position.redeemableCfx === 0n || Boolean(unstakeInputError) || isTransactionPending(transactions.unstake)}>{copy.actions.unstakeButton}</button>
              <TransactionNotice state={transactions.unstake} onCheck={() => void checkReceipt("unstake")} copy={copy} />
            </article>
            <article>
              <span>{copy.actions.withdrawStep}</span><h3>{copy.actions.withdrawTitle}</h3><p>{copy.actions.thisWithdrawal(formatCfx(user.position.withdrawableCfx))} {copy.actions.withdrawDescription}</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("withdraw")} disabled={!pool?.writeReady || !correctNetwork || user.position.withdrawableVotes === 0n || isTransactionPending(transactions.withdraw)}>{copy.actions.withdrawButton}</button>
              {user.position.unlockedCfx > 0n && user.position.withdrawableVotes === 0n && <small className="stake-liquidity-note">{copy.actions.withdrawLiquidityNote}</small>}
              <TransactionNotice state={transactions.withdraw} onCheck={() => void checkReceipt("withdraw")} copy={copy} />
            </article>
            <article>
              <span>{copy.actions.rewardsStep}</span><h3>{copy.actions.rewardsTitle}</h3><p>{copy.actions.claimableLabel(formatDripAsCfx(user.position.claimableInterestDrip))} {copy.actions.rewardsDescription}</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("claim")} disabled={!pool?.writeReady || !correctNetwork || user.position.claimableInterestDrip === 0n || isTransactionPending(transactions.claim)}>{copy.actions.rewardsButton}</button>
              <TransactionNotice state={transactions.claim} onCheck={() => void checkReceipt("claim")} copy={copy} />
            </article>
          </div>
          <div className="stake-queues">
            <QueuePanel title={copy.queue.lockQueue} queue={user.inQueue} currentBlock={user.currentBlock} activeLabel={copy.queue.locking} secondsPerBlock={pool?.secondsPerBlock ?? 2} copy={copy} />
            <QueuePanel title={copy.queue.unlockQueue} queue={user.outQueue} currentBlock={user.currentBlock} activeLabel={copy.queue.unlocking} secondsPerBlock={pool?.secondsPerBlock ?? 2} copy={copy} />
          </div>
        </>}
      </section>

      <section className="stake-risks">
        <span>{copy.risk.heading}</span><h2>{copy.risk.title}</h2>
        <div><p>{copy.risk.p1}</p><p>{copy.risk.p2}</p></div>
        <code>{getAddress(contractAddress)}</code>
      </section>
    </div>
  );
}
