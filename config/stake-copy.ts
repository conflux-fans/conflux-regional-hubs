export type StakeCopy = {
  pageSuffix: string;
  actionLabels: Record<"stake" | "unstake" | "withdraw" | "claim", string>;
  invalidInteger: string; invalidMultiple: string; amountTooLarge: string; exceedsAvailable: string; invalidAmount: string;
  matured: string; pending: string; estimatedRemaining: (blocks: string) => string; estimatedDate: (date: string) => string;
  batches: (count: number, amount: string) => string; amount: string; targetBlock: string; status: string;
  phases: Record<"validating" | "estimating" | "awaiting_signature" | "confirming" | "success" | "error", string>;
  transaction: string; explorerLink: string; walletNotFound: string; reserveFees: string; redeemExceeded: string; chainFailure: string;
  stakeSuccess: string; unstakeSuccess: string; withdrawSuccess: string; claimSuccess: string;
  disabledTitle: string; disabledBody: string; networkName: string; risk: string; poolEyebrow: string; poolTitle: string; refresh: string;
  totalStaked: string; stakers: string; recentApy: string; loading: string; apyNote: string; wallet: string; disconnected: string;
  switchNetwork: string; connect: string; installQuestion: string; installLink: string; positionEyebrow: string; positionTitle: string;
  syncing: string; balance: string; activeStake: string; redeemable: string; unlocking: string; withdrawable: string; claimable: string;
  lifetimeRewards: string; stakeTitle: string; stakeDescription: string; stakeAmount: string; confirmStake: string; unstakeTitle: string;
  unstakeDescription: string; unstakeAmount: string; all: string; confirmUnstake: string; withdrawTitle: string; withdrawDescription: string;
  withdrawAll: string; rewardsTitle: string; rewardsDescription: string; claimAll: string; inQueueTitle: string; inQueueEmpty: string;
  outQueueTitle: string; outQueueEmpty: string; connectTitle: string; connectDescription: string; verificationFailed: string;
  errors: {
    cancelled: string; minimum: string; valueMismatch: string; lockedInsufficient: string; unlockedInsufficient: string;
    interestInsufficient: string; poolUnavailable: string; accountChanged: string; wrongNetwork: string; networkUnavailable: string; generic: string;
  };
};

export const englishStakeCopy: StakeCopy = {
  pageSuffix: "Manage PoS pool staking directly on Conflux Core Space mainnet with Fluent.",
  actionLabels: { stake: "Stake", unstake: "Unstake", withdraw: "Withdraw principal", claim: "Claim rewards" },
  invalidInteger: "Enter a whole CFX amount.", invalidMultiple: "Amount must be a positive multiple of 1,000 CFX.",
  amountTooLarge: "Amount exceeds the contract limit.", exceedsAvailable: "Amount exceeds the available balance.", invalidAmount: "Enter a valid amount.",
  matured: "Matured", pending: "In progress", estimatedRemaining: (blocks) => `Approximately ${blocks} blocks remaining`,
  estimatedDate: (date) => `Estimated ${date}`, batches: (count, amount) => `${count} batches · ${amount} CFX`,
  amount: "Amount", targetBlock: "Target block", status: "Status",
  phases: { validating: "Validating…", estimating: "Estimating transaction costs…", awaiting_signature: "Confirm in Fluent…", confirming: "Submitted, waiting for on-chain confirmation…", success: "Confirmed", error: "Not completed" },
  transaction: "Transaction", explorerLink: "View on ConfluxScan ↗",
  walletNotFound: "Fluent was not detected. Install it, then refresh this page.",
  reserveFees: "Insufficient balance after reserving transaction fees and storage collateral.", redeemExceeded: "Amount exceeds the currently redeemable balance.",
  chainFailure: "The transaction failed on-chain.", stakeSuccess: "The stake is now in the locking queue.",
  unstakeSuccess: "The principal is unlocking. Withdraw it after maturity.", withdrawSuccess: "The principal was withdrawn to the connected wallet.",
  claimSuccess: "The rewards were claimed to the connected wallet.", disabledTitle: "Staking is not enabled",
  disabledBody: "This deployment has not passed the required staking configuration checks.", networkName: "Core Space mainnet",
  risk: "Stake takes about 13 days to mature; unstaked principal takes about 1 day to unlock. Rewards are not fixed. Pool contracts, validator operation, and protocol penalties carry risk.",
  poolEyebrow: "POOL STATUS", poolTitle: "Pool overview", refresh: "Refresh data", totalStaked: "Total staked", stakers: "Stakers",
  recentApy: "Recent APY", loading: "Loading…", apyNote: "Historical indicator, not a promise of future returns", wallet: "WALLET",
  disconnected: "Not connected", switchNetwork: "Switch to Core mainnet", connect: "Connect Fluent", installQuestion: "Fluent not installed?",
  installLink: "Install from the official site ↗", positionEyebrow: "YOUR POSITION", positionTitle: "My stake", syncing: "Syncing on-chain state…",
  balance: "Balance", activeStake: "Active stake", redeemable: "Redeemable", unlocking: "Unlocking", withdrawable: "Withdrawable principal",
  claimable: "Claimable rewards", lifetimeRewards: "Lifetime rewards", stakeTitle: "Stake CFX",
  stakeDescription: "Minimum 1,000 CFX in increments of 1,000. Confirmed stake enters the locking queue.", stakeAmount: "Stake amount",
  confirmStake: "Confirm stake", unstakeTitle: "Unstake", unstakeDescription: "Only matured stake can be unstaked. Confirmed principal then enters the unlocking period.",
  unstakeAmount: "Unstake amount", all: "Max", confirmUnstake: "Confirm unstake", withdrawTitle: "Withdraw principal",
  withdrawDescription: "Withdraw principal that has completed the unlocking period.", withdrawAll: "Withdraw all", rewardsTitle: "Claim rewards",
  rewardsDescription: "Claim all currently available rewards.", claimAll: "Claim all", inQueueTitle: "Stake locking queue",
  inQueueEmpty: "No stake is currently locking.", outQueueTitle: "Unstake unlocking queue", outQueueEmpty: "No principal is currently unlocking.",
  connectTitle: "Connect Fluent to view and manage your stake.",
  connectDescription: "The pool overview stays public. Connecting only reads your address and lets you submit transactions that you confirm.",
  verificationFailed: "Contract verification failed. Transactions are disabled:",
  errors: {
    cancelled: "The operation was cancelled.", minimum: "The minimum amount is 1,000 CFX.",
    valueMismatch: "The stake value is inconsistent. Refresh and try again.", lockedInsufficient: "The redeemable balance is insufficient or some CFX remains locked.",
    unlockedInsufficient: "The withdrawable principal is insufficient. Refresh the on-chain state.", interestInsufficient: "There are not enough rewards to claim.",
    poolUnavailable: "The pool is unavailable and transactions are paused.", wrongNetwork: "Switch Fluent to Conflux Core mainnet.",
    accountChanged: "The connected account changed. Review the transaction and try again.",
    networkUnavailable: "The network service is temporarily unavailable. Try again later.", generic: "The operation could not be completed.",
  },
};
