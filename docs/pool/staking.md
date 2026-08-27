# Staking

本功能是 Conflux PoS Staking 功能, 具体是指 PoS 矿池合约的交互功能, 矿池的代码位于 https://github.com/conflux-fans/pos-pool 仓库的 contract 目录.

## 1 期功能

我们第一期实现的功能如下:

1. 支持 Conflux eSpace 的 PoS 矿池合约交互；eSpace 兼容 EVM，一期使用 ethers v6 和 EIP-1193 钱包 provider
   1. 连接 MetaMask 等兼容钱包，显示 eSpace 十六进制地址和账户 CFX 余额
2. 支持的核心功能如下:
   1. 质押（Staking）：用户输入质押金额(1000CFX的整数倍), 点击按钮操作质押; 显示当前质押总量
      1. 质押有锁定期(13d), 所以需要显示锁定队列, 默认隐藏, 可点击展开查看详细列表
   2. 赎回（Unstaking）：显示当前用户可赎回总量, 输入赎回数量, 点击按钮操作赎回
      1. 赎回有解锁期(1d), 所以需要显示解锁队列, 默认隐藏, 可点击展开查看详细列表
   3. withdraw：提取已赎回的资产；分别显示已解锁本金和受 eSpace 合约 `withdrawableCfx` 流动性限制的当前可提取金额，点击按钮提取当前可提取额度
   4. 收益查询和提取：展示用户的累计收益, 支持提取操作
   5. 矿池整体信息: 质押总量, 总人数, APY

智能合约地址: 0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3
ABI: `./IPoSPool.json`（当前 eSpace 实现的最小用户 ABI）

### 一期最小 ABI 方法

```solidity
// Drip 是最小单位，userInterest 和 withdrawableCfx 返回值单位均为 Drip
// 1 CFX = 1e18 drip
// 1 votePower = 1000 CFX
struct PoolSummary {
  uint256 available;
  uint256 interest;
  uint256 totalInterest; // total interest of all pools
}

struct UserSummary {
  uint256 votes; // Total votes, including locking, locked, unlocking, unlocked
  uint256 available; // locking + locked
  uint256 locked;
  uint256 unlocked;
  uint256 claimedInterest;
  uint256 currentInterest;
}

struct QueueNode {
  uint256 votePower;
  uint256 endBlock;
}

function _poolLockPeriod() public view returns (uint256);
function _poolUnlockPeriod() public view returns (uint256);
function birdgeAddrSetted() public view returns (bool);
function claimAllInterest() public;
function decreaseStake(uint64 votePower) public;
function increaseStake(uint64 votePower) public payable;
function poolAPY() public view returns (uint256);
function poolName() public view returns (string memory);
function poolSummary() public view returns (PoolSummary memory);
function stakerNumber() public view returns (uint256);
function userInQueue(address account) public view returns (QueueNode[] memory);
function userInQueue(address account, uint64 offset, uint64 limit) public view returns (QueueNode[] memory);
function userInterest(address _address) public view returns (uint256);
function userOutQueue(address account) public view returns (QueueNode[] memory);
function userOutQueue(address account, uint64 offset, uint64 limit) public view returns (QueueNode[] memory);
function userSummary(address _user) public view returns (UserSummary memory);
function withdrawStake(uint64 votePower) public;
function withdrawableCfx() public view returns (uint256);
```

`poolAPY()` 的比例基数是 `10000`，例如返回 `1234` 时展示为 `12.34%`。`birdgeAddrSetted` 是链上合约的既有拼写。
