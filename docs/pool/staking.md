# Staking

本功能是 Conflux PoS Staking 功能, 具体是指 PoS 矿池合约的交互功能, 矿池的代码位于 https://github.com/conflux-fans/pos-pool 仓库的 contract 目录.

## 1 期功能

我们第一期实现的功能如下:

1. 支持 Core Space 的 PoS 矿池合约交互; Core Space 使用 Fluent 钱包, 以及 js-conflux-sdk, 这点与以太坊有比较大的区别
   1. 用户钱包链接, 显示地址, 显示余额(账户 CFX 余额)
2. 支持的核心功能如下:
   1. 质押（Staking）：用户输入质押金额(1000CFX的整数倍), 点击按钮操作质押; 显示当前质押总量
      1. 质押有锁定期(13d), 所以需要显示锁定队列, 默认隐藏, 可点击展开查看详细列表
   2. 赎回（Unstaking）：显示当前用户可赎回总量, 输入赎回数量, 点击按钮操作赎回
      1. 赎回有解锁期(1d), 所以需要显示解锁队列, 默认隐藏, 可点击展开查看详细列表
   3. withdraw: 提取已赎回的资产, 显示可提取金额, 点击按钮操作提取
   4. 收益查询和提取：展示用户的累计收益, 支持提取操作
   5. 矿池整体信息: 质押总量, 总人数, APY

智能合约地址: cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0
ABI: ./IPoSPool.json

### 主要方法

```solidity
// drip 是最小单位, userInterest 返回的数字单位即是 drip 
// 1 CFX = 1e18 drip
// 1 votePower = 1000 CFX
struct PoolSummary {
    uint256 available;
    uint256 interest;
    uint256 totalInterest; // total interest of all pools
  }

  struct UserSummary {
    uint256 votes;  // Total votes in PoS system, including locking, locked, unlocking, unlocked
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
function increaseStake(uint64 votePower) public virtual payable;
function decreaseStake(uint64 votePower) public virtual;
function withdrawStake(uint64 votePower) public;
function userInterest(address _address) public view returns (uint256);
function claimInterest(uint amount) public;
function claimAllInterest() public;
function userSummary(address _user) public view returns (UserSummary memory);
function poolSummary() public view returns (PoolSummary memory);
// poolAPY, 返回数值的 ratio 是 10000, 即 apy/10000 * 100 为百分比数值
function poolAPY() public view returns (uint256);
function userInQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory);
function userOutQueue(address account) public view returns (VotePowerQueue.QueueNode[] memory);
function stakerNumber() public view returns (uint)
```