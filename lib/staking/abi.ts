const uintOutput = [{ name: "", type: "uint256" }];
const queueComponents = [
  { name: "votePower", type: "uint256" },
  { name: "endBlock", type: "uint256" },
];

export const POS_POOL_ABI = [
  { type: "function", name: "VERSION", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "_poolLockPeriod", stateMutability: "view", inputs: [], outputs: uintOutput },
  { type: "function", name: "_poolRegisted", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "_poolUnlockPeriod", stateMutability: "view", inputs: [], outputs: uintOutput },
  { type: "function", name: "claimAllInterest", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "decreaseStake", stateMutability: "nonpayable", inputs: [{ name: "votePower", type: "uint64" }], outputs: [] },
  { type: "function", name: "increaseStake", stateMutability: "payable", inputs: [{ name: "votePower", type: "uint64" }], outputs: [] },
  { type: "function", name: "poolAPY", stateMutability: "view", inputs: [], outputs: uintOutput },
  { type: "function", name: "poolName", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  {
    type: "function",
    name: "poolSummary",
    stateMutability: "view",
    inputs: [],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "available", type: "uint256" },
        { name: "interest", type: "uint256" },
        { name: "totalInterest", type: "uint256" },
      ],
    }],
  },
  { type: "function", name: "stakerNumber", stateMutability: "view", inputs: [], outputs: uintOutput },
  {
    type: "function",
    name: "userInQueue",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: queueComponents }],
  },
  { type: "function", name: "userInterest", stateMutability: "view", inputs: [{ name: "_address", type: "address" }], outputs: uintOutput },
  {
    type: "function",
    name: "userOutQueue",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: queueComponents }],
  },
  {
    type: "function",
    name: "userSummary",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "votes", type: "uint256" },
        { name: "available", type: "uint256" },
        { name: "locked", type: "uint256" },
        { name: "unlocked", type: "uint256" },
        { name: "claimedInterest", type: "uint256" },
        { name: "currentInterest", type: "uint256" },
      ],
    }],
  },
  { type: "function", name: "withdrawStake", stateMutability: "nonpayable", inputs: [{ name: "votePower", type: "uint64" }], outputs: [] },
];
