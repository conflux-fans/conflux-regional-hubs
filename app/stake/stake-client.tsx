"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress } from "ethers";
import { formatApy, formatCfx, formatDripAsCfx, parseStakeAmount } from "../lib/staking/amounts";
import { CONFLUX_ESPACE_CHAIN_ID, transactionExplorerUrl } from "../lib/staking/constants";
import { stakingErrorDetail, stakingErrorMessage } from "../lib/staking/errors";
import { queueNodeView, type QueueNode } from "../lib/staking/models";
import { createReadPoolAdapter, createWalletPoolAdapter, type PosPoolAdapter } from "../lib/staking/pos-pool";
import { discoverInjectedWallets, InjectedWalletSession, type DiscoveredWallet, type InjectedProvider } from "../lib/staking/provider";
import {
  gasLimitWithMargin,
  initialTransactionState,
  pendingTransactionKey,
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
  stake: "质押交易已确认，正在锁定",
  unstake: "赎回交易已确认，进入解锁期",
  withdraw: "本金已提取至当前钱包",
  claim: "收益已领取至当前钱包",
};

function phaseLabel(phase: TransactionPhase) {
  return {
    idle: "",
    validating: "正在校验金额和网络…",
    estimating: "正在估算 gas…",
    awaiting_signature: "请在钱包中确认…",
    submitted: "交易已提交",
    confirming: "等待链上确认…",
    success: "交易已确认",
    refreshing: "正在刷新链上数据…",
    rejected: "操作已取消",
    reverted: "交易执行失败",
    rpc_error: "网络服务暂时不可用",
  }[phase];
}

function isPending(state: TransactionState) {
  return ["validating", "estimating", "awaiting_signature", "submitted", "confirming", "refreshing"].includes(state.phase);
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function approximateTime(seconds: bigint) {
  if (seconds <= 0n) return "已到期";
  const days = seconds / 86_400n;
  if (days > 0n) return `预计约 ${days} 天`;
  const hours = (seconds + 3599n) / 3600n;
  return `预计约 ${hours} 小时`;
}

function QueuePanel({ title, queue, currentBlock, activeLabel, secondsPerBlock }: { title: string; queue: QueueNode[]; currentBlock: bigint; activeLabel: string; secondsPerBlock: number }) {
  const [expanded, setExpanded] = useState(false);
  const pending = queue.filter((node) => node.endBlock > currentBlock);
  const pendingCfx = pending.reduce((total, node) => total + node.votePower * 1000n, 0n);
  return (
    <section className="stake-queue">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span><b>{title}</b><small>{pending.length} 个进行中批次 · {formatCfx(pendingCfx)}</small></span>
        <i>{expanded ? "收起 −" : "展开 +"}</i>
      </button>
      {expanded && (queue.length ? <div className="stake-queue-list">{queue.map((node, index) => {
        const view = queueNodeView(node, currentBlock, secondsPerBlock);
        return <article key={`${node.endBlock}-${index}`}><span><b>{formatCfx(view.amountCfx)}</b><small>目标区块 #{view.endBlock.toString()}</small></span><span><b>{view.matured ? "已到期" : activeLabel}</b><small>{approximateTime(view.estimatedSeconds)}</small></span></article>;
      })}</div> : <p className="stake-empty">当前没有队列记录</p>)}
    </section>
  );
}

function TransactionNotice({ state, onCheck }: { state: TransactionState; onCheck?: () => void }) {
  if (state.phase === "idle") return null;
  const tone = state.phase === "success" ? "success" : ["rejected", "reverted", "rpc_error"].includes(state.phase) ? "error" : "pending";
  return (
    <output className={`stake-transaction ${tone}`} aria-live="polite">
      <b>{state.message || phaseLabel(state.phase)}</b>
      {state.hash && <a href={transactionExplorerUrl(state.hash)} target="_blank" rel="noreferrer">查看交易 ↗</a>}
      {state.phase === "submitted" && onCheck && <button type="button" onClick={onCheck}>查询回执</button>}
      {state.detail && <details><summary>技术详情</summary><code>{state.detail}</code></details>}
    </output>
  );
}

export function StakeClient({ rpcUrl, contractAddress, poolFallbackName }: { rpcUrl: string; contractAddress: string; poolFallbackName: string }) {
  const [pool, setPool] = useState<PoolOverview | null>(null);
  const [poolError, setPoolError] = useState("");
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [user, setUser] = useState<UserSnapshot | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [stakeInput, setStakeInput] = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");
  const [transactions, setTransactions] = useState(initialTransactions);
  const readAdapter = useMemo(() => createReadPoolAdapter(rpcUrl), [rpcUrl]);
  const walletProvider = useRef<InjectedProvider | null>(null);
  const walletAdapter = useRef<PosPoolAdapter | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const userRequest = useRef(0);
  const accountRef = useRef<string | null>(null);
  const chainIdRef = useRef<bigint | null>(null);

  const updateTransaction = useCallback((action: Action, event: TransactionEvent) => {
    setTransactions((current) => ({ ...current, [action]: transitionTransaction(current[action], event) }));
  }, []);

  const restorePendingTransactions = useCallback((nextAccount: string) => {
    setTransactions((current) => {
      const restored = { ...current };
      for (const action of Object.keys(initialTransactions) as Action[]) {
        const hash = window.localStorage.getItem(pendingTransactionKey(nextAccount, action));
        if (hash) restored[action] = transitionTransaction(restored[action], { type: "submitted", hash, message: "发现一笔待确认交易" });
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
  }, []);

  const refreshUser = useCallback(async (nextAccount = account) => {
    const adapter = walletAdapter.current;
    if (!adapter || !nextAccount || chainId !== CONFLUX_ESPACE_CHAIN_ID) return;
    const request = ++userRequest.current;
    setUserLoading(true);
    try {
      const snapshot = await adapter.readUserSnapshot(nextAccount);
      if (request === userRequest.current) {
        setUser(snapshot);
        setWalletMessage("");
      }
    } catch (error) {
      if (request === userRequest.current) setWalletMessage(stakingErrorMessage(error));
    } finally {
      if (request === userRequest.current) setUserLoading(false);
    }
  }, [account, chainId]);

  const prepareWalletAdapter = useCallback(async (provider: InjectedProvider, nextAccount: string, nextChainId: bigint) => {
    clearUser();
    setAccount(nextAccount);
    setChainId(nextChainId);
    accountRef.current = nextAccount;
    chainIdRef.current = nextChainId;
    restorePendingTransactions(nextAccount);
    walletAdapter.current = null;
    if (nextChainId !== CONFLUX_ESPACE_CHAIN_ID) return;
    try {
      const adapter = await createWalletPoolAdapter(provider);
      walletAdapter.current = adapter;
      const request = ++userRequest.current;
      setUserLoading(true);
      const snapshot = await adapter.readUserSnapshot(nextAccount);
      if (request === userRequest.current) setUser(snapshot);
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    } finally {
      setUserLoading(false);
    }
  }, [clearUser, restorePendingTransactions]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshPool(), 0);
    const timer = window.setInterval(() => void refreshPool(), 30_000);
    const onFocus = () => void refreshPool();
    window.addEventListener("focus", onFocus);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refreshPool]);

  useEffect(() => {
    void discoverInjectedWallets(window as typeof window & { ethereum?: InjectedProvider }).then((found) => {
      setWallets(found);
      if (found.length === 1) setSelectedWallet(found[0].id);
    });
    return () => unsubscribe.current?.();
  }, []);

  async function connect() {
    const wallet = wallets.find((item) => item.id === selectedWallet) ?? wallets[0];
    if (!wallet) { setWalletMessage("未检测到兼容的浏览器钱包"); return; }
    setConnecting(true);
    setWalletMessage("");
    try {
      const session = new InjectedWalletSession(wallet.provider);
      const connected = await session.connect();
      walletProvider.current = wallet.provider;
      unsubscribe.current?.();
      unsubscribe.current = session.subscribe((change) => {
        clearUser();
        if (change.type === "disconnect" || (change.type === "accounts" && !change.account)) {
          setAccount(null);
          accountRef.current = null;
          walletAdapter.current = null;
          return;
        }
        if (change.type === "chain") {
          setChainId(change.chainId);
          chainIdRef.current = change.chainId;
          if (accountRef.current && walletProvider.current) void prepareWalletAdapter(walletProvider.current, accountRef.current, change.chainId);
          return;
        }
        if (change.type === "accounts" && change.account && walletProvider.current) {
          void prepareWalletAdapter(walletProvider.current, change.account, chainIdRef.current ?? connected.chainId);
        }
      });
      await prepareWalletAdapter(wallet.provider, connected.account, connected.chainId);
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    unsubscribe.current?.();
    unsubscribe.current = null;
    walletProvider.current = null;
    walletAdapter.current = null;
    setAccount(null);
    setChainId(null);
    accountRef.current = null;
    chainIdRef.current = null;
    clearUser();
  }

  async function switchNetwork() {
    const provider = walletProvider.current;
    if (!provider) return;
    try {
      await new InjectedWalletSession(provider).switchToConflux();
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error));
    }
  }

  async function runTransaction(action: Action) {
    const adapter = walletAdapter.current;
    if (!adapter || !account || !user || chainId !== CONFLUX_ESPACE_CHAIN_ID || isPending(transactions[action])) return;
    let submittedHash: string | undefined;
    try {
      updateTransaction(action, { type: "validating" });
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

      updateTransaction(action, { type: "estimating" });
      const estimate = action === "stake" ? await adapter.estimateStake(stakeAmount!)
        : action === "unstake" ? await adapter.estimateUnstake(votePower)
          : action === "withdraw" ? await adapter.estimateWithdraw(votePower)
            : await adapter.estimateClaim();
      const gasLimit = gasLimitWithMargin(estimate);
      if (action === "stake" && stakeAmount) {
        const feePerGas = await adapter.connection.feePerGas();
        if (stakeAmount.valueDrip + estimate * feePerGas > user.balanceDrip) throw new Error("余额不足以支付质押金额和预计 gas");
      }

      updateTransaction(action, { type: "awaiting_signature" });
      const transaction = action === "stake" ? await adapter.sendStake(stakeAmount!, gasLimit)
        : action === "unstake" ? await adapter.sendUnstake(votePower, gasLimit)
          : action === "withdraw" ? await adapter.sendWithdraw(votePower, gasLimit)
            : await adapter.sendClaim(gasLimit);
      submittedHash = transaction.hash;
      window.localStorage.setItem(pendingTransactionKey(account, action), transaction.hash);
      updateTransaction(action, { type: "submitted", hash: transaction.hash });
      updateTransaction(action, { type: "confirming" });
      const receipt = await transaction.wait(1, 180_000);
      if (!receipt) throw new Error("Transaction confirmation timeout");
      if (receipt.status !== 1) {
        window.localStorage.removeItem(pendingTransactionKey(account, action));
        updateTransaction(action, { type: "reverted", hash: transaction.hash, message: "交易执行失败" });
        await Promise.all([refreshPool(), refreshUser(account)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(account, action));
      updateTransaction(action, { type: "success", hash: transaction.hash, message: successMessages[action] });
      updateTransaction(action, { type: "refreshing", hash: transaction.hash, message: "交易已确认，正在刷新链上数据…" });
      setStakeInput("");
      setUnstakeInput("");
      await Promise.all([refreshPool(), refreshUser(account)]);
      updateTransaction(action, { type: "success", hash: transaction.hash, message: successMessages[action] });
    } catch (error) {
      const code = error && typeof error === "object" ? (error as { code?: number | string }).code : undefined;
      const phase = code === 4001 || code === "ACTION_REJECTED" ? "rejected" : code === "CALL_EXCEPTION" ? "reverted" : "rpc_error";
      updateTransaction(action, { type: phase, ...(submittedHash ? { hash: submittedHash } : {}), message: stakingErrorMessage(error), detail: stakingErrorDetail(error) });
      if (submittedHash) await Promise.all([refreshPool(), refreshUser(account)]);
    }
  }

  async function checkReceipt(action: Action) {
    const adapter = walletAdapter.current;
    const hash = transactions[action].hash;
    if (!adapter || !hash || !account) return;
    try {
      const receipt = await adapter.transactionReceipt(hash);
      if (!receipt) { updateTransaction(action, { type: "submitted", hash, message: "交易仍在等待确认" }); return; }
      if (receipt.status !== 1) {
        window.localStorage.removeItem(pendingTransactionKey(account, action));
        updateTransaction(action, { type: "reverted", hash, message: "交易执行失败" });
        await Promise.all([refreshPool(), refreshUser(account)]);
        return;
      }
      window.localStorage.removeItem(pendingTransactionKey(account, action));
      updateTransaction(action, { type: "refreshing", hash, message: "交易已确认，正在刷新链上数据…" });
      await Promise.all([refreshPool(), refreshUser(account)]);
      updateTransaction(action, { type: "success", hash, message: successMessages[action] });
    } catch (error) {
      updateTransaction(action, { type: "rpc_error", hash, message: stakingErrorMessage(error), detail: stakingErrorDetail(error) });
    }
  }

  const correctNetwork = chainId === CONFLUX_ESPACE_CHAIN_ID;
  const poolName = pool?.name || poolFallbackName;

  return (
    <div className="stake-dashboard v2-wrap">
      <section className="stake-pool" aria-busy={!pool && !poolError}>
        <div><span>POOL OVERVIEW</span><h2>{poolName}</h2><p>无需连接钱包即可查看矿池链上数据。</p></div>
        <div className="stake-metrics">
          <article><span>总质押量</span><b>{pool ? pool.totalStakedCfx === null ? "暂不可用" : formatCfx(pool.totalStakedCfx) : "读取中…"}</b></article>
          <article><span>质押人数</span><b>{pool ? pool.stakerCount === null ? "暂不可用" : pool.stakerCount.toLocaleString("en-US") : "读取中…"}</b></article>
          <article><span>最近 APY</span><b>{pool ? pool.apyRaw === null ? "暂不可用" : formatApy(pool.apyRaw) : "读取中…"}</b><small>历史指标，非保证收益</small></article>
        </div>
        {poolError && <output className="stake-global-error" role="alert">矿池暂不可用：{poolError}。写操作已禁用。</output>}
      </section>

      <section className="stake-wallet-bar">
        {!wallets.length ? <div><b>未检测到兼容钱包</b><span>请安装 MetaMask 或其他 EIP‑1193 浏览器钱包。</span></div>
          : !account ? <><label>选择钱包<select value={selectedWallet} onChange={(event) => setSelectedWallet(event.target.value)}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label><button type="button" onClick={connect} disabled={connecting}>{connecting ? "等待钱包…" : "连接钱包"}</button></>
            : <><div><b>{shortAddress(account)}</b><span>{correctNetwork ? "Conflux eSpace 主网" : `错误网络 · chain ${chainId?.toString()}`}</span></div><button type="button" onClick={() => void navigator.clipboard.writeText(account)}>复制地址</button>{!correctNetwork && <button type="button" onClick={switchNetwork}>切换网络</button>}<button type="button" onClick={disconnect}>断开</button></>}
        {walletMessage && <output role="alert">{walletMessage}</output>}
      </section>

      {account && !correctNetwork && <section className="stake-network-warning" role="alert"><b>请切换到 Conflux eSpace 主网</b><p>错误网络下所有质押写操作均已禁用，目标 chain ID 为 1030（0x406）。</p></section>}

      <section className="stake-user" aria-busy={userLoading}>
        <div className="stake-section-heading"><span>YOUR POSITION</span><h2>你的链上资产</h2>{account && <p>钱包余额：{user ? formatDripAsCfx(user.balanceDrip) : "读取中…"}</p>}</div>
        {!account ? <p className="stake-empty">连接钱包后查看质押、赎回和收益状态。</p> : !user ? <p className="stake-empty">{userLoading ? "正在读取账户数据…" : "账户数据暂不可用"}</p> : <>
          <div className="stake-assets">
            <article><span>当前质押</span><b>{formatCfx(user.position.stakedCfx)}</b></article>
            <article><span>可赎回</span><b>{formatCfx(user.position.redeemableCfx)}</b></article>
            <article><span>待解锁</span><b>{formatCfx(user.position.pendingUnlockCfx)}</b></article>
            <article><span>已解锁本金</span><b>{formatCfx(user.position.unlockedCfx)}</b></article>
            <article><span>当前可提取本金</span><b>{formatCfx(user.position.withdrawableCfx)}</b>{user.position.unlockedCfx > user.position.withdrawableCfx && <small>其余本金等待矿池补充流动性</small>}</article>
            <article><span>可领取 / 累计收益</span><b>{formatDripAsCfx(user.position.claimableInterestDrip)}</b><small>累计 {formatDripAsCfx(user.position.totalInterestDrip)}</small></article>
          </div>
          <div className="stake-actions">
            <article>
              <span>01 / STAKE</span><h3>质押 CFX</h3><p>最少 1000 CFX，且必须为 1000 的整数倍。确认后进入约 13 天锁定期。</p>
              <label htmlFor="stake-amount">质押金额 <small>CFX</small></label><input id="stake-amount" inputMode="numeric" pattern="[0-9]*" value={stakeInput} onChange={(event) => setStakeInput(event.target.value)} placeholder="3000" />
              <button type="button" onClick={() => void runTransaction("stake")} disabled={!pool?.writeReady || !correctNetwork || isPending(transactions.stake)}>质押</button>
              <TransactionNotice state={transactions.stake} onCheck={() => void checkReceipt("stake")} />
            </article>
            <article>
              <span>02 / UNSTAKE</span><h3>赎回 CFX</h3><p>仅可赎回已过质押锁定期的金额。确认后进入约 1 天解锁期，不会立即到账。</p>
              <label htmlFor="unstake-amount">赎回金额 <small>最多 {formatCfx(user.position.redeemableCfx)}</small></label><input id="unstake-amount" inputMode="numeric" pattern="[0-9]*" value={unstakeInput} onChange={(event) => setUnstakeInput(event.target.value)} placeholder="1000" />
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("unstake")} disabled={!pool?.writeReady || !correctNetwork || user.position.redeemableCfx === 0n || isPending(transactions.unstake)}>赎回</button>
              <TransactionNotice state={transactions.unstake} onCheck={() => void checkReceipt("unstake")} />
            </article>
            <article>
              <span>03 / WITHDRAW</span><h3>提取本金</h3><p>本次提取 {formatCfx(user.position.withdrawableCfx)}。已解锁本金仍可能受全池桥接流动性限制。</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("withdraw")} disabled={!pool?.writeReady || !correctNetwork || user.position.withdrawableVotes === 0n || isPending(transactions.withdraw)}>提取当前可提取额度</button>
              {user.position.unlockedCfx > 0n && user.position.withdrawableVotes === 0n && <small className="stake-liquidity-note">等待矿池补充提取流动性</small>}
              <TransactionNotice state={transactions.withdraw} onCheck={() => void checkReceipt("withdraw")} />
            </article>
            <article>
              <span>04 / REWARDS</span><h3>领取全部收益</h3><p>可领取 {formatDripAsCfx(user.position.claimableInterestDrip)}。本期仅支持一次领取全部收益。</p>
              <button type="button" className="stake-secondary-button" onClick={() => void runTransaction("claim")} disabled={!pool?.writeReady || !correctNetwork || user.position.claimableInterestDrip === 0n || isPending(transactions.claim)}>领取全部收益</button>
              <TransactionNotice state={transactions.claim} onCheck={() => void checkReceipt("claim")} />
            </article>
          </div>
          <div className="stake-queues">
            <QueuePanel title="质押锁定队列" queue={user.inQueue} currentBlock={user.currentBlock} activeLabel="锁定中" secondsPerBlock={pool?.secondsPerBlock ?? 2} />
            <QueuePanel title="赎回解锁队列" queue={user.outQueue} currentBlock={user.currentBlock} activeLabel="解锁中" secondsPerBlock={pool?.secondsPerBlock ?? 2} />
          </div>
        </>}
      </section>

      <section className="stake-risks">
        <span>RISK DISCLOSURE</span><h2>提交前请了解</h2>
        <div><p>你正在与第三方 PoS 矿池代理合约交互，本站不托管私钥、不代签交易，也不会要求助记词。</p><p>验证节点处罚、合约、RPC、跨空间桥和流动性风险都可能影响收益或到账时间。最终状态以 eSpace 链上回执和当前区块为准。</p></div>
        <code>{getAddress(contractAddress)}</code>
      </section>
    </div>
  );
}
