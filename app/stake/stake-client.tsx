"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { region } from "../../config/regions";
import {
  apyRatioToPercent,
  buildClaimAllIntent,
  buildDecreaseStakeIntent,
  buildIncreaseStakeIntent,
  buildWithdrawStakeIntent,
  CFX_PER_VOTE,
  deriveUserPosition,
  formatCfx,
  formatDripAsCfx,
  parseCfxToVotes,
  queueNodeStatus,
  type ContractWriteIntent,
} from "../../lib/staking/domain";
import { stakingErrorMessage } from "../../lib/staking/errors";
import {
  getConnectedAccounts,
  fluentAccountMatches,
  getFluentProvider,
  getWalletChainId,
  requestAccounts,
  sendFluentTransaction,
  subscribeFluent,
  switchToCoreMainnet,
  type FluentProvider,
} from "../../lib/staking/fluent";
import {
  CORE_SCAN_URL,
  CORE_MAINNET_CHAIN_ID,
  PosPoolClient,
  STAKING_CONTRACT_ADDRESS,
  STAKING_ENABLED,
  isCoreMainnetChain,
  receiptSucceeded,
  transactionExplorerUrl,
  type PoolSnapshot,
  type QueueNode,
  type UserSnapshot,
} from "../../lib/staking/pos-pool";

type Action = "stake" | "unstake" | "withdraw" | "claim";
type TransactionPhase =
  | "idle"
  | "validating"
  | "estimating"
  | "awaiting_signature"
  | "confirming"
  | "success"
  | "error";

type TransactionState = {
  action: Action | null;
  phase: TransactionPhase;
  hash?: string;
  message?: string;
};

const IDLE_TRANSACTION: TransactionState = { action: null, phase: "idle" };
const COPY = region.stake.copy;
const ACTION_LABELS: Record<Action, string> = COPY.actionLabels;

function shortAddress(address: string): string {
  return address.length > 22 ? `${address.slice(0, 12)}…${address.slice(-8)}` : address;
}

function inputError(input: string, maximumCfx?: bigint): string | null {
  try {
    const amount = parseCfxToVotes(input);
    if (maximumCfx !== undefined && amount.cfx > maximumCfx) return COPY.exceedsAvailable;
    return null;
  } catch (error) {
    if (!(error instanceof Error)) return COPY.invalidAmount;
    if (error.message === "INVALID_CFX_INTEGER") return COPY.invalidInteger;
    if (error.message === "INVALID_VOTE_AMOUNT") return COPY.invalidMultiple;
    if (error.message === "AMOUNT_TOO_LARGE") return COPY.amountTooLarge;
    return COPY.invalidAmount;
  }
}

function queueEstimate(node: QueueNode, currentBlock: bigint): string {
  if (queueNodeStatus(node.endBlock, currentBlock) === "matured") return COPY.matured;
  const remainingBlocks = node.endBlock - currentBlock;
  const remainingSeconds = remainingBlocks / 2n;
  const maximumDateSeconds = BigInt(Math.floor((Date.UTC(9999, 0, 1) - Date.now()) / 1000));
  if (remainingSeconds > maximumDateSeconds) return COPY.estimatedRemaining(formatCfx(remainingBlocks));
  return COPY.estimatedDate(new Date(Date.now() + Number(remainingSeconds) * 1000).toLocaleString("en"));
}

function QueueDetails({
  title,
  empty,
  nodes,
  currentBlock,
}: {
  title: string;
  empty: string;
  nodes: QueueNode[];
  currentBlock: bigint;
}) {
  const pendingNodes = nodes.filter((node) => node.endBlock > currentBlock);
  const totalCfx = pendingNodes.reduce((total, node) => total + node.votePower * CFX_PER_VOTE, 0n);
  return (
    <details className="stake-queue">
      <summary>
        <span>{title}</span>
        <span>{COPY.batches(pendingNodes.length, formatCfx(totalCfx))}</span>
      </summary>
      {nodes.length === 0 ? <p className="stake-empty">{empty}</p> : (
        <div className="stake-queue-list">
          {nodes.map((node, index) => {
            const status = queueNodeStatus(node.endBlock, currentBlock);
            return (
              <div className="stake-queue-row" key={`${node.endBlock}-${node.votePower}-${index}`}>
                <div><span>{COPY.amount}</span><strong>{formatCfx(node.votePower * CFX_PER_VOTE)} CFX</strong></div>
                <div><span>{COPY.targetBlock}</span><strong>#{formatCfx(node.endBlock)}</strong></div>
                <div><span>{COPY.status}</span><strong>{status === "matured" ? COPY.matured : COPY.pending}</strong></div>
                <small>{queueEstimate(node, currentBlock)}</small>
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="stake-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function TransactionNotice({ state }: { state: TransactionState }) {
  if (state.phase === "idle") return null;
  const phaseLabel = COPY.phases;
  return (
    <div className={`stake-transaction stake-transaction-${state.phase}`} aria-live="polite">
      <strong>{state.action ? ACTION_LABELS[state.action] : COPY.transaction} · {phaseLabel[state.phase]}</strong>
      {state.message && <p>{state.message}</p>}
      {state.hash && <a href={transactionExplorerUrl(state.hash)} target="_blank" rel="noreferrer">{COPY.explorerLink}</a>}
    </div>
  );
}

async function waitForReceipt(client: PosPoolClient, hash: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const receipt = await client.getTransactionReceipt(hash);
    if (receipt) return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  return null;
}

export function StakeClient() {
  const client = useMemo(() => new PosPoolClient(), []);
  const [pool, setPool] = useState<PoolSnapshot | null>(null);
  const [poolError, setPoolError] = useState("");
  const [poolLoading, setPoolLoading] = useState(true);
  const [provider, setProvider] = useState<FluentProvider | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<string | number | null>(null);
  const [user, setUser] = useState<UserSnapshot | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [stakeInput, setStakeInput] = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");
  const [transaction, setTransaction] = useState<TransactionState>(IDLE_TRANSACTION);
  const userRequestSequence = useRef(0);
  const walletRevision = useRef(0);

  const networkCorrect = chainId !== null && isCoreMainnetChain(chainId);
  const position = user ? deriveUserPosition({ ...user.summary, claimableInterest: user.claimableInterest }) : null;
  const transactionBusy = !["idle", "success", "error"].includes(transaction.phase);

  const loadPool = useCallback(async () => {
    if (!STAKING_ENABLED) return;
    setPoolLoading(true);
    setPoolError("");
    try {
      setPool(await client.readPool());
    } catch (error) {
      setPoolError(stakingErrorMessage(error, COPY.errors));
    } finally {
      setPoolLoading(false);
    }
  }, [client]);

  const loadUser = useCallback(async () => {
    const requestSequence = ++userRequestSequence.current;
    if (!account || !networkCorrect) {
      setUser(null);
      return;
    }
    setUserLoading(true);
    try {
      const nextUser = await client.readUser(account);
      if (requestSequence !== userRequestSequence.current) return;
      setUser(nextUser);
      setWalletMessage("");
    } catch (error) {
      if (requestSequence === userRequestSequence.current) {
        setWalletMessage(stakingErrorMessage(error, COPY.errors));
      }
    } finally {
      if (requestSequence === userRequestSequence.current) setUserLoading(false);
    }
  }, [account, client, networkCorrect]);

  useEffect(() => { void loadPool(); }, [loadPool]);
  useEffect(() => { void loadUser(); }, [loadUser]);

  useEffect(() => {
    const detected = getFluentProvider();
    setProvider(detected);
    setWalletChecked(true);
    if (!detected) return;

    const initializationRevision = walletRevision.current;
    void Promise.all([getConnectedAccounts(detected), getWalletChainId(detected)])
      .then(([accounts, walletChain]) => {
        if (initializationRevision !== walletRevision.current) return;
        setAccount(accounts[0] || "");
        setChainId(walletChain);
      })
      .catch((error) => setWalletMessage(stakingErrorMessage(error, COPY.errors)));

    const removeAccounts = subscribeFluent(detected, "accountsChanged", (value) => {
      walletRevision.current += 1;
      userRequestSequence.current += 1;
      const accounts = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      setAccount(accounts[0] || "");
      setUser(null);
      setStakeInput("");
      setUnstakeInput("");
      setTransaction(IDLE_TRANSACTION);
    });
    const removeChain = subscribeFluent(detected, "chainChanged", (value) => {
      walletRevision.current += 1;
      userRequestSequence.current += 1;
      if (typeof value === "string" || typeof value === "number") setChainId(value);
      setUser(null);
      setTransaction(IDLE_TRANSACTION);
    });
    const removeDisconnect = subscribeFluent(detected, "disconnect", () => {
      walletRevision.current += 1;
      userRequestSequence.current += 1;
      setAccount("");
      setUser(null);
    });
    return () => {
      walletRevision.current += 1;
      removeAccounts(); removeChain(); removeDisconnect();
    };
  }, []);

  useEffect(() => {
    if (!provider || !account || !networkCorrect) return;
    const stored = window.localStorage.getItem("staking:lastTransaction");
    if (!stored) return;
    let pending: unknown;
    try {
      pending = JSON.parse(stored) as unknown;
    } catch {
      window.localStorage.removeItem("staking:lastTransaction");
      return;
    }
    if (
      !pending ||
      typeof pending !== "object" ||
      !("account" in pending) ||
      !("hash" in pending) ||
      !("action" in pending) ||
      typeof pending.account !== "string" ||
      typeof pending.hash !== "string" ||
      typeof pending.action !== "string"
    ) {
      window.localStorage.removeItem("staking:lastTransaction");
      return;
    }
    if (
      pending.account.toLowerCase() !== account.toLowerCase() ||
      !/^0x[0-9a-f]{64}$/i.test(pending.hash) ||
      !["stake", "unstake", "withdraw", "claim"].includes(pending.action)
    ) return;

    const recoveredAction = pending.action as Action;
    const recoveredHash = pending.hash;

    let cancelled = false;
    setTransaction({ action: recoveredAction, phase: "confirming", hash: recoveredHash });
    void waitForReceipt(client, recoveredHash).then(async (receipt) => {
      if (cancelled || !receipt) return;
      window.localStorage.removeItem("staking:lastTransaction");
      if (!receiptSucceeded(receipt)) {
        setTransaction({ action: recoveredAction, phase: "error", hash: recoveredHash, message: COPY.chainFailure });
        return;
      }
      const successMessage = {
        stake: COPY.stakeSuccess,
        unstake: COPY.unstakeSuccess,
        withdraw: COPY.withdrawSuccess,
        claim: COPY.claimSuccess,
      }[recoveredAction];
      setTransaction({ action: recoveredAction, phase: "success", hash: recoveredHash, message: successMessage });
      await Promise.all([loadPool(), loadUser()]);
    }).catch((error) => {
      if (!cancelled) {
        setTransaction({ action: recoveredAction, phase: "error", hash: recoveredHash, message: stakingErrorMessage(error, COPY.errors) });
      }
    });
    return () => { cancelled = true; };
  }, [account, client, loadPool, loadUser, networkCorrect, provider]);

  async function connectWallet() {
    if (!provider) {
      setWalletMessage(COPY.walletNotFound);
      return;
    }
    setWalletMessage("");
    try {
      const accounts = await requestAccounts(provider);
      setAccount(accounts[0] || "");
      setChainId(await getWalletChainId(provider));
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error, COPY.errors));
    }
  }

  async function switchNetwork() {
    if (!provider) return;
    try {
      await switchToCoreMainnet(provider);
      setChainId(await getWalletChainId(provider));
    } catch (error) {
      setWalletMessage(stakingErrorMessage(error, COPY.errors));
    }
  }

  async function submit(action: Action, intentFactory: () => ContractWriteIntent) {
    if (!provider || !account || !networkCorrect || !pool?.registered || !pool.verified) return;
    const submissionAccount = account;
    const submissionWalletRevision = walletRevision.current;
    setTransaction({ action, phase: "validating" });
    try {
      const intent = intentFactory();
      if (action === "stake" && user && intent.value >= user.balanceDrip) {
        throw new Error(COPY.reserveFees);
      }
      if (action === "unstake" && user && intent.args[0] > user.summary.locked) {
        throw new Error(COPY.redeemExceeded);
      }
      setTransaction({ action, phase: "estimating" });
      const request = await client.prepareTransaction(intent, submissionAccount);
      const [liveChainId, liveAccounts, livePool] = await Promise.all([
        getWalletChainId(provider),
        getConnectedAccounts(provider),
        client.readPool(),
      ]);
      setPool(livePool);
      if (!isCoreMainnetChain(liveChainId)) throw new Error(COPY.errors.wrongNetwork);
      if (
        submissionWalletRevision !== walletRevision.current ||
        !fluentAccountMatches(submissionAccount, liveAccounts) ||
        request.from.toLowerCase() !== submissionAccount.toLowerCase()
      ) {
        throw new Error("WALLET_ACCOUNT_CHANGED");
      }
      if (!livePool.registered || !livePool.verified) throw new Error("Pool is not registed");
      if (
        request.to !== STAKING_CONTRACT_ADDRESS ||
        !/^0x[0-9a-f]{8,}$/i.test(request.data) ||
        request.value !== `0x${intent.value.toString(16)}`
      ) {
        throw new Error(COPY.errors.valueMismatch);
      }
      setTransaction({ action, phase: "awaiting_signature" });
      const hash = await sendFluentTransaction(provider, request);
      window.localStorage.setItem("staking:lastTransaction", JSON.stringify({ hash, action, account: submissionAccount }));
      setTransaction({ action, phase: "confirming", hash });
      const receipt = await waitForReceipt(client, hash);
      if (!receipt) {
        setTransaction({ action, phase: "confirming", hash, message: COPY.phases.confirming });
        return;
      }
      if (!receiptSucceeded(receipt)) throw new Error(COPY.chainFailure);
      window.localStorage.removeItem("staking:lastTransaction");
      setStakeInput("");
      setUnstakeInput("");
      setTransaction({
        action,
        phase: "success",
        hash,
        message: action === "stake"
          ? COPY.stakeSuccess
          : action === "unstake"
            ? COPY.unstakeSuccess
            : action === "withdraw"
              ? COPY.withdrawSuccess
              : COPY.claimSuccess,
      });
      await Promise.all([loadPool(), loadUser()]);
    } catch (error) {
      setTransaction((current) => ({
        action,
        phase: "error",
        hash: current.hash,
        message: stakingErrorMessage(error, COPY.errors),
      }));
      await loadUser();
    }
  }

  const stakeError = stakeInput ? inputError(stakeInput) : null;
  const unstakeError = unstakeInput && position ? inputError(unstakeInput, position.redeemableCfx) : null;
  const canTransact = Boolean(provider && account && networkCorrect && pool?.registered && pool.verified && user && !transactionBusy);

  if (!STAKING_ENABLED) {
    return <section className="staking-app"><div className="stake-unavailable"><h2>{COPY.disabledTitle}</h2><p>{COPY.disabledBody}</p></div></section>;
  }

  return (
    <section className="staking-app" aria-label="Conflux PoS staking">
      <div className="stake-risk">
        <strong>{COPY.networkName}</strong>
        <p>{COPY.risk}</p>
        <a
          href={`${CORE_SCAN_URL}/address/${STAKING_CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          title={STAKING_CONTRACT_ADDRESS}
        >
          {shortAddress(STAKING_CONTRACT_ADDRESS)}
        </a>
      </div>

      <div className="stake-section-heading">
        <div><p className="eyebrow">{COPY.poolEyebrow}</p><h2>{COPY.poolTitle}</h2></div>
        <button className="stake-text-button" type="button" onClick={() => void loadPool()} disabled={poolLoading}>{COPY.refresh}</button>
      </div>
      {poolError ? <div className="stake-error" role="alert">{poolError}</div> : (
        <div className="stake-metrics stake-pool-metrics" aria-busy={poolLoading}>
          <Metric label={COPY.totalStaked} value={pool ? `${formatCfx(pool.summary.available * CFX_PER_VOTE)} CFX` : COPY.loading} />
          <Metric label={COPY.stakers} value={pool ? formatCfx(pool.stakers) : COPY.loading} />
          <Metric label={COPY.recentApy} value={pool ? `${apyRatioToPercent(pool.apy)}%` : COPY.loading} note={COPY.apyNote} />
        </div>
      )}

      <div className="stake-wallet-bar">
        <div>
          <span className={`stake-status-dot ${account && networkCorrect ? "online" : ""}`} />
          <div>
            <small>{COPY.wallet}</small>
            <strong>{account ? shortAddress(account) : COPY.disconnected}</strong>
          </div>
        </div>
        {account ? (
          networkCorrect ? <span className="stake-network-pill">Core Mainnet · {CORE_MAINNET_CHAIN_ID}</span> : <button className="button primary" type="button" onClick={() => void switchNetwork()}>{COPY.switchNetwork}</button>
        ) : (
          <button className="button primary" type="button" onClick={() => void connectWallet()}>{COPY.connect} <span>↗</span></button>
        )}
      </div>
      {walletChecked && !provider && <p className="stake-wallet-help">{COPY.installQuestion} <a href="https://fluentwallet.com/" target="_blank" rel="noreferrer">{COPY.installLink}</a></p>}
      {walletMessage && <div className="stake-error" role="alert">{walletMessage}</div>}
      {pool && !pool.verified && <div className="stake-error" role="alert">{COPY.verificationFailed} {pool.verificationError}</div>}

      {account && networkCorrect ? (
        <>
          <div className="stake-section-heading stake-user-heading">
            <div><p className="eyebrow">{COPY.positionEyebrow}</p><h2>{COPY.positionTitle}</h2></div>
            <span>{userLoading ? COPY.syncing : `${COPY.balance} ${user ? formatDripAsCfx(user.balanceDrip) : "—"} CFX`}</span>
          </div>
          <div className="stake-metrics stake-user-metrics" aria-busy={userLoading}>
            <Metric label={COPY.activeStake} value={position ? `${formatCfx(position.activeCfx)} CFX` : "—"} />
            <Metric label={COPY.redeemable} value={position ? `${formatCfx(position.redeemableCfx)} CFX` : "—"} />
            <Metric label={COPY.unlocking} value={position ? `${formatCfx(position.pendingUnlockCfx)} CFX` : "—"} />
            <Metric label={COPY.withdrawable} value={position ? `${formatCfx(position.withdrawableCfx)} CFX` : "—"} />
            <Metric label={COPY.claimable} value={position ? `${formatDripAsCfx(position.claimableInterestDrip)} CFX` : "—"} />
            <Metric label={COPY.lifetimeRewards} value={position ? `${formatDripAsCfx(position.lifetimeInterestDrip)} CFX` : "—"} />
          </div>

          <TransactionNotice state={transaction} />

          <div className="stake-actions-grid">
            <article className="stake-action-card">
              <p className="eyebrow">01 · STAKE</p><h3>{COPY.stakeTitle}</h3>
              <p>{COPY.stakeDescription}</p>
              <label htmlFor="stake-amount">{COPY.stakeAmount}</label>
              <div className="stake-input-wrap"><input id="stake-amount" inputMode="numeric" value={stakeInput} onChange={(event) => setStakeInput(event.target.value)} placeholder="1000" aria-describedby="stake-error" /><span>CFX</span></div>
              {stakeError && <small className="stake-field-error" id="stake-error">{stakeError}</small>}
              <button className="button primary" type="button" disabled={!canTransact || !stakeInput || Boolean(stakeError)} onClick={() => void submit("stake", () => buildIncreaseStakeIntent(stakeInput))}>{COPY.confirmStake} <span>→</span></button>
            </article>

            <article className="stake-action-card">
              <p className="eyebrow">02 · UNSTAKE</p><h3>{COPY.unstakeTitle}</h3>
              <p>{COPY.unstakeDescription}</p>
              <div className="stake-label-row"><label htmlFor="unstake-amount">{COPY.unstakeAmount}</label><button type="button" onClick={() => setUnstakeInput(position?.redeemableCfx.toString() || "")}>{COPY.all}</button></div>
              <div className="stake-input-wrap"><input id="unstake-amount" inputMode="numeric" value={unstakeInput} onChange={(event) => setUnstakeInput(event.target.value)} placeholder="1000" aria-describedby="unstake-error" /><span>CFX</span></div>
              {unstakeError && <small className="stake-field-error" id="unstake-error">{unstakeError}</small>}
              <button className="button primary" type="button" disabled={!canTransact || !unstakeInput || Boolean(unstakeError) || position?.redeemableCfx === 0n} onClick={() => void submit("unstake", () => buildDecreaseStakeIntent(unstakeInput))}>{COPY.confirmUnstake} <span>→</span></button>
            </article>

            <article className="stake-action-card stake-action-compact">
              <p className="eyebrow">03 · WITHDRAW</p><h3>{COPY.withdrawTitle}</h3>
              <strong>{position ? formatCfx(position.withdrawableCfx) : "—"} CFX</strong>
              <p>{COPY.withdrawDescription}</p>
              <button className="button quiet" type="button" disabled={!canTransact || !user || user.summary.unlocked === 0n} onClick={() => void submit("withdraw", () => buildWithdrawStakeIntent(user!.summary.unlocked))}>{COPY.withdrawAll} <span>→</span></button>
            </article>

            <article className="stake-action-card stake-action-compact">
              <p className="eyebrow">04 · REWARDS</p><h3>{COPY.rewardsTitle}</h3>
              <strong>{position ? formatDripAsCfx(position.claimableInterestDrip) : "—"} CFX</strong>
              <p>{COPY.rewardsDescription}</p>
              <button className="button quiet" type="button" disabled={!canTransact || !user || user.claimableInterest === 0n} onClick={() => void submit("claim", buildClaimAllIntent)}>{COPY.claimAll} <span>→</span></button>
            </article>
          </div>

          {user && <div className="stake-queues">
            <QueueDetails title={COPY.inQueueTitle} empty={COPY.inQueueEmpty} nodes={user.inQueue} currentBlock={user.currentBlock} />
            <QueueDetails title={COPY.outQueueTitle} empty={COPY.outQueueEmpty} nodes={user.outQueue} currentBlock={user.currentBlock} />
          </div>}
        </>
      ) : (
        <div className="stake-connect-prompt">
          <p className="eyebrow">{COPY.positionEyebrow}</p>
          <h2>{COPY.connectTitle}</h2>
          <p>{COPY.connectDescription}</p>
        </div>
      )}
    </section>
  );
}
