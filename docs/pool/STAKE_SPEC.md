# Stake 页面一期功能规格

> 状态：Draft for implementation
> 更新日期：2026-08-27
> 需求来源：`docs/pool/staking.md`
> 合约接口：`docs/pool/IPoSPool.json`

本文档在原始需求基础上补充可实施的交互、数据映射、边界条件、验收标准和发布检查。原始需求与 ABI 是输入材料，不由本文档替代或修改；发生冲突时，先核对链上合约，再由产品/技术负责人更新结论。

## 1. 目标与产品原则

一期在 `/stake` 提供 Conflux eSpace PoS 矿池的只读数据和四类用户交易：质押、赎回、提取本金、领取收益。

页面必须让用户始终分清三个状态：

1. 交易是否已经上链确认；
2. 质押或赎回是否仍在锁定/解锁队列；
3. 本金或收益是否已经可以提取。

页面只帮助用户调用既有矿池合约，不托管私钥、不代签交易、不保存助记词，也不承诺固定收益。所有写操作必须由兼容 EIP-1193 的用户钱包展示并确认。

## 2. 一期范围

### 2.1 包含

- Conflux eSpace 主网，chain ID `1030`（十六进制 `0x406`）；
- MetaMask 等 EIP-1193 注入钱包的发现、连接、断开、账户切换和网络切换检测；
- 当前账户的 eSpace CFX 余额；
- 矿池总质押量、质押人数和最近 APY；
- 当前用户的质押概览、锁定队列、解锁队列和收益概览；
- `increaseStake`、`decreaseStake`、`withdrawStake`、`claimAllInterest` 四条交易流程；
- 交易前校验、gas 估算、钱包签名、回执等待、结果反馈和数据刷新；
- 桌面端和移动端的响应式展示；
- 功能开关、网络/地址白名单和上线前合约校验。

### 2.2 不包含

- 用户直接操作 Conflux Core Space 或空间桥；
- 矿池注册、运维、升级、费率、白名单、Voting Escrow 等管理员功能；
- 自动复投、定时操作、批量账户、法币估值或历史收益曲线；
- 在站内保存钱包会话凭据、私钥或助记词；
- 对锁定结束时间作精确的自然时间保证。

eSpace 矿池合约会把新增质押转给已配置的桥接地址，并从桥接地址接收已解锁 CFX。前端只调用 eSpace 代理合约，不要求用户直接执行跨空间操作；但必须展示跨空间结算和合约流动性可能延迟本金提取的风险。

## 3. 固定集成参数

| 项目 | 一期值 | 要求 |
| --- | --- | --- |
| Space | eSpace | 禁止把地址或交易发送到 Core Space |
| 网络 | Conflux eSpace 主网 | `eth_chainId` 必须返回 `0x406`（十进制 `1030`） |
| 钱包 | MetaMask 等 EIP-1193 注入钱包 | 使用钱包提供的 EIP-1193 provider；多钱包环境不得默认覆盖用户选择 |
| SDK | `ethers` v6 | 金额和整数全程使用 `bigint`，不得经过 JavaScript `number` |
| 合约地址 | `0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3` | 必须由开发者配置并进入允许列表 |
| ABI | `docs/pool/IPoSPool.json` | 使用当前 eSpace 实现的最小用户 ABI，不向 UI 暴露管理员或桥接写方法 |
| CFX 最小单位 | Drip | `1 CFX = 10^18 Drip` |
| 票数单位 | votePower | `1 votePower = 1000 CFX` |

合约地址是 20 字节 EVM 地址。展示时使用 EIP-55 checksum，安全比较时先解析为同一 20 字节值；不要用字符串截断结果做安全判断，也不要把 Core Space base32 地址作为交易目标。

### 3.1 上线前链上校验

2026-08-27 的只读检查显示：该地址在 eSpace 主网有合约代码，为 EIP-1967 代理，当前实现地址是 `0x2990ff2180541b5e1b11186ab5db7666f858988c`，区块浏览器验证的实现合约名为 `ESpacePoSPool`，`birdgeAddrSetted()` 返回 `true`。实现合约没有 `VERSION()` 或 `_poolRegisted()`；`birdgeAddrSetted` 是链上既有的拼写，调用时不得自行改成 `bridgeAddrSetted`。

每次发布到生产前必须重新验证：

- `eth_chainId` 返回 `0x406`；
- 代理地址代码非空，代理实现地址与已审核记录一致；
- 当前实现的已验证 ABI 与仓库最小 ABI 中使用的方法签名一致；
- `birdgeAddrSetted()` 为 `true`，且 `_poolLockPeriod()`、`_poolUnlockPeriod()` 可正常读取；
- 本文使用的最小 ABI 能成功调用全部只读方法；
- 交易目标仍是允许列表中的代理地址；
- 合约版本或实现地址变化时暂停写操作，复核实现源码和 ABI 后再恢复。

只读校验失败时页面进入“暂不可用”状态，不允许继续发起交易。

## 4. 单位、计算与格式化

任何合约返回的 `uint256`/`uint64` 都先按整数处理。禁止先转 JavaScript `number` 再计算；实现应使用 `bigint` 或 SDK 的大数类型。

### 4.1 基础换算

```text
CFX_PER_VOTE = 1000
DRIP_PER_CFX = 10^18

votePower = inputCFX / 1000
transactionValueDrip = inputCFX * 10^18
displayCFXFromVotes = votePower * 1000
displayCFXFromDrip = drip / 10^18
apyPercent = poolAPYRaw / 100
```

示例：用户输入 `3000 CFX`，则调用 `increaseStake(3)`，同时交易 `value` 必须为 `3000 * 10^18 Drip`。`poolAPY()` 返回 `1234` 时显示 `12.34%`。

### 4.2 输入规则

- 只接受十进制非负整数文本；
- 质押和赎回最少 `1000 CFX`，且必须为 `1000 CFX` 的整数倍；
- 不接受指数记法、负数、小数、空白夹杂或超过 `uint64` votePower 的值；
- 质押金额不得超过钱包余额扣除预计 gas 费用后的可用金额；
- 赎回金额不得超过 `userSummary.locked * 1000 CFX`；
- 提取票数不得超过 `min(userSummary.unlocked, withdrawableCfx / (1000 * 10^18))`；
- 收益全领时，`userInterest(account)` 必须大于零。

页面展示金额时保留可读精度并使用千位分隔，但交易参数永远来自原始整数，不得从格式化字符串反向解析。

## 5. 合约读模型

### 5.1 无需连接钱包的矿池数据

页面首屏应并行读取：

| UI 字段 | 合约来源 | 转换 |
| --- | --- | --- |
| 矿池名称（可选） | `poolName()` | 空值时使用区域配置中的通用名称 |
| 总质押量 | `poolSummary().available` | votePower × `1000 CFX` |
| 总人数 | `stakerNumber()` | 整数 |
| APY | `poolAPY()` | 原值 ÷ `100` 后加 `%` |
| 矿池是否可用 | `birdgeAddrSetted()` | `false` 时桥接地址尚未配置，禁用全部交易 |
| 当前提取流动性 | `withdrawableCfx()` | Drip；用于限制 `withdrawStake`，不等同于用户个人余额 |

APY 是合约按近期区块数据计算的历史指标，不是保证收益。APY 为 `0` 时显示 `0%`，不能显示为“暂无数据”；RPC/合约调用失败才显示“暂不可用”。

### 5.2 连接钱包后的用户数据

对当前账户并行读取：

- `eth_getBalance`：账户 CFX 余额；
- `userSummary(account)`：用户本金状态和累计已领收益；
- `userInterest(account)`：当前可领取收益，以 Drip 返回；
- `userInQueue(account)`：质押锁定队列；
- `userOutQueue(account)`：赎回解锁队列；
- `withdrawableCfx()`：eSpace 合约当前可用于本金提取的全局流动性；
- 当前 block number：判断队列是否到期。

`UserSummary` 的产品语义必须按下表实现：

| 字段 | 单位 | 页面语义 |
| --- | --- | --- |
| `votes` | votePower | 用户尚未最终提取的全部本金，包含质押、锁定、解锁和已解锁状态 |
| `available` | votePower | 仍参与矿池的本金，即锁定中 + 已锁定 |
| `locked` | votePower | 已过质押锁定期、可以发起赎回的票数 |
| `unlocked` | votePower | 已过赎回解锁期、可以提取的票数 |
| `claimedInterest` | Drip | 历史累计已领取收益 |
| `currentInterest` | Drip | 合约存储的当前收益快照，不作为首选实时展示值 |

页面采用以下派生值：

```text
当前质押 = available * 1000 CFX
可赎回 = locked * 1000 CFX
待解锁 = (votes - available - unlocked) * 1000 CFX
已解锁本金 = unlocked * 1000 CFX
当前可提取票数 = min(unlocked, withdrawableCfx / (1000 * 10^18))
当前可提取本金 = 当前可提取票数 * 1000 CFX
可领取收益 = userInterest(account) / 10^18 CFX
累计收益 = (claimedInterest + userInterest(account)) / 10^18 CFX
```

`userInterest(account)` 包含尚未写入 `currentInterest` 的最新收益，因此可领取收益以它为准，不能用 `currentInterest` 替代。

`withdrawableCfx` 是全池共享且可能随其他用户交易变化的流动性快照。前端预检只能减少预期回滚，发送提取交易前仍必须重新估算 gas，并以最终回执为准。已解锁本金大于当前可提取本金时，页面保留已解锁金额并提示等待桥接流动性，不得显示为本金丢失。

### 5.3 队列数据

每个 `QueueNode` 包含：

- `votePower`：该批次票数；
- `endBlock`：该批次到期区块。

质押锁定队列和赎回解锁队列默认折叠，标题展示未到期批次数及金额合计。展开后按 `endBlock` 从早到晚显示：金额、目标区块、状态、预计到期时间。

状态计算：

- `currentBlock < endBlock`：锁定中/解锁中；
- `currentBlock >= endBlock`：已到期；质押队列的金额已计入 `userSummary.locked`，赎回队列的金额已计入 `userSummary.unlocked`；
- 队列为空：显示明确空状态，不渲染 `0` 行。

预计时间只能由剩余区块数和近期区块时间估算，并标记“预计”。最终是否到期以链上当前区块与 `endBlock` 的比较为准。产品文案可概括为“质押约 13 天、赎回约 1 天”，但实现必须读取 `_poolLockPeriod()` 和 `_poolUnlockPeriod()`，不得把天数用作交易判断。

一期可直接读取完整队列；同时适配 ABI 中带 `offset`、`limit` 的重载方法。当队列超过 50 条时使用分页读取，每页 50 条，并设置合理的最大展示/请求上限以避免 RPC 响应过大。

## 6. 页面信息架构

从上到下建议分为五个区域：

1. **风险和网络提示**：eSpace 主网、合约地址缩写、非固定收益说明；
2. **矿池概览**：总质押量、质押人数、APY；无需连接钱包即可查看；
3. **钱包栏**：连接按钮、当前地址、余额、网络状态和断开/切换账户入口；
4. **用户资产概览**：当前质押、可赎回、待解锁、已解锁本金、当前可提取本金、可领取收益、累计收益；
5. **操作区**：质押、赎回、提取、领取收益，以及两个可折叠队列。

移动端优先保证：完整金额不被截断、确认按钮不越界、地址可复制、队列横向内容改为纵向卡片、触控目标至少 44×44 CSS px。

初始区域文案和设计默认值放在 `app/regional.ts`；经理可编辑的可见文案继续通过 `app/lib/content.ts` 持久化到 SQLite。钱包/合约调用、单位换算、交易状态和错误映射放在共享实现中，符合现有 `ARCHITECTURE.md` 的边界。

## 7. 钱包与网络状态

页面至少处理以下状态：

| 状态 | 页面行为 |
| --- | --- |
| 未检测到兼容钱包 | 展示 MetaMask 等兼容钱包的安装引导；不发起连接请求 |
| 已检测到、未连接 | 允许看矿池数据；用户数据占位；显示“连接钱包” |
| 正在连接 | 禁用重复点击；显示等待钱包响应 |
| 用户拒绝连接 | 保持未连接状态并给出可重试提示 |
| 已连接且 chain ID = 1030 | 读取用户数据并允许交易 |
| 已连接但网络错误 | 显示目标网络；禁用交易；提供钱包支持时的切网操作 |
| 账户切换 | 清除旧账户缓存和输入，立即以新账户重读 |
| 网络切换 | 清除合约实例和用户缓存，重新校验后再启用交易 |
| 钱包断开/权限撤销 | 清空用户数据并回到未连接状态 |

地址展示为 EIP-55 checksum 短格式，但复制按钮复制完整 eSpace 十六进制地址。交易目标必须是允许列表中的完整代理地址。

## 8. 用户操作规格

### 8.1 质押

入口显示钱包余额、当前质押和约 13 天锁定提示。

流程：

1. 用户输入 CFX 整数金额，或点击可选快捷金额；
2. 前端校验金额为 `1000 CFX` 的正整数倍；
3. 计算 `votePower = amountCFX / 1000` 和 `value = amountCFX * 10^18 Drip`；
4. 调用 `pool.increaseStake.estimateGas(votePower, { value })`，并为实际交易保留合理的 gas 余量；
5. 调用 `pool.increaseStake(votePower, { value })`，由当前 EIP-1193 钱包展示并确认交易；
6. 回执成功后刷新余额、用户概览、矿池概览和质押锁定队列；
7. 成功文案为“质押交易已确认，正在锁定”，不能写成“已可赎回”。

交易约束：合约要求 `votePower > 0`，且 `msg.value` 必须严格等于 `votePower * 1000 CFX`。

### 8.2 赎回（Unstaking）

入口显示“可赎回”，其来源只能是 `userSummary.locked`，不是 `available`。`available` 还包含未过质押锁定期的票数，直接使用会导致合约以 `Locked is not enough` 回滚。

流程：

1. 用户输入 CFX 整数金额，可提供“全部可赎回”；
2. 校验金额为 `1000 CFX` 的正整数倍且不超过可赎回；
3. 调用 `decreaseStake(amountCFX / 1000)`；本交易不附带 CFX value；
4. 交易确认后刷新概览和解锁队列；
5. 成功文案为“赎回交易已确认，进入解锁期”；
6. 到期后金额转入“已解锁本金”，不会自动回到钱包；当前可提取金额还受矿池流动性限制。

若未来启用了 Voting Escrow，合约还可能因治理锁仓限制实际可赎回量。遇到 `Locked is not enough` 时重新读取状态并提示部分 CFX 可能被锁定，不得自动反复提交。

### 8.3 提取本金（Withdraw）

一期采用“提取当前可提取额度”交互：先计算 `withdrawableVotes = withdrawableCfx / (1000 * 10^18)`，再取 `votesToWithdraw = min(userSummary.unlocked, withdrawableVotes)`，按钮金额为 `votesToWithdraw * 1000 CFX`，调用 `withdrawStake(votesToWithdraw)`。按钮在 `votesToWithdraw` 为零时禁用；若用户有已解锁本金但流动性为零，显示“等待矿池补充提取流动性”。

交易确认后刷新钱包余额、`withdrawableCfx`、用户概览和解锁队列。成功文案为“本金已提取至当前钱包”。如果后续增加用户自定义部分提取，输入仍须为 `1000 CFX` 的整数倍，并转换为 votePower 后调用。

### 8.4 领取收益

页面同时展示：

- 可领取收益：`userInterest(account)`；
- 累计收益：`claimedInterest + userInterest(account)`。

一期仅提供“领取全部”，调用 `claimAllInterest()`。当可领取收益为零时禁用。交易确认后刷新钱包余额、`userSummary`、`userInterest` 和矿池数据。

链上实现还提供 `claimInterest(amount)`，其参数单位是 Drip，可留给后续“部分领取”。一期 UI 和最小 ABI 均不暴露该方法，避免把 CFX 数值误作为 Drip 发送。

## 9. 交易状态机

每次写操作都使用独立、可恢复的状态机：

```text
idle
  -> validating
  -> estimating
  -> awaiting_signature
  -> submitted(txHash)
  -> confirming
  -> success
  -> refreshing
  -> idle

任一步均可进入 rejected / reverted / rpc_error；错误确认后可回到 idle 重试。
```

要求：

- `awaiting_signature` 起禁用同一操作的重复提交；
- 获得交易哈希后立刻展示并提供 eSpace 区块浏览器链接；
- 不以拿到哈希作为成功，必须读取交易回执；
- EVM 回执 `status === 1` 后才显示成功；`status === 0` 时展示失败并重读链上状态；
- 确认超时不等于失败，保留哈希并允许继续查询；
- 成功后以链上重读结果覆盖乐观数据；
- 刷新页面后可从本地保存的非敏感 tx hash 恢复“待确认”提示；
- 同一账户同一动作一期只允许一个 pending 交易。

## 10. 错误与安全处理

### 10.1 可识别错误

| 来源/错误 | 用户提示 | 后续动作 |
| --- | --- | --- |
| 未检测到兼容钱包 | 未检测到兼容的浏览器钱包 | 提供 MetaMask 等钱包的安装入口 |
| 用户拒绝连接或签名 | 操作已取消 | 不记录为失败交易，可重试 |
| chain ID 不是 1030 | 请切换到 Conflux eSpace 主网 | 禁用交易；钱包支持时调用 `wallet_switchEthereumChain` |
| `Minimal votePower is 1` | 最少操作 1000 CFX | 保留输入供修改 |
| `msg.value should be...` | 质押金额参数不一致 | 停止提交并记录前端集成错误 |
| `Locked is not enough` | 当前可赎回余额不足或存在锁仓限制 | 重读用户状态 |
| `Unlocked is not enough` | 已解锁本金不足 | 重读用户状态 |
| `No claimable interest` / `Interest not enough` | 当前没有足够可领取收益 | 重读收益 |
| `Pool is not setted` | 矿池桥接地址尚未配置 | 全局禁用写操作 |
| `Withdrawable CFX is not enough` | 矿池当前可提取流动性不足 | 重读状态并暂停提取，不重复提交 |
| 回执失败/未知 revert | 交易执行失败，资金状态未按本次请求改变 | 展示哈希和可重试入口 |
| RPC 超时/不可达 | 网络服务暂时不可用 | 保留已知交易哈希，允许重试读取 |

原始 RPC/合约错误可放在可展开的“技术详情”中，默认展示清晰中文，不把堆栈或 provider 对象直接渲染给用户。

### 10.2 安全约束

- 合约地址、chain ID 和允许调用的方法由开发者控制，不接受 URL、CMS 或用户输入覆盖；
- 前端最小 ABI 只包含本规格的读方法、四个写方法和相关事件；
- 交易发送前再次校验 chain ID、`to`、method selector、参数和值；
- 禁止请求无限授权；本流程直接发送原生 CFX，不需要 ERC-20 allowance；
- 不把私钥、助记词或钱包授权信息发送到应用服务端、日志或分析平台；
- 日志可记录 network、规范化地址、方法、tx hash 和错误码，但账户地址应遵守隐私策略；
- 页面明确披露：第三方矿池合约、跨空间桥、验证节点、锁定周期、提取流动性和协议处罚风险；
- 合约代理实现变化、链 ID 不符或校验失败时，宁可只读降级，不允许继续交易。

## 11. 建议实现边界

遵循项目“一套共享产品核心，多套区域展示”的架构：

```text
app/stake/page.tsx                 Server 页面外壳、区域文案与初始结构
app/stake/stake-client.tsx         Client 交互、状态组合与可访问 UI
app/lib/staking/constants.ts       chain、单位和经审核的合约允许列表
app/lib/staking/abi.ts             从 artifact 固化的最小用户 ABI
app/lib/staking/amounts.ts         Drip/CFX/votePower 的纯函数转换
app/lib/staking/provider.ts        EIP-1193 provider 发现、连接、事件订阅
app/lib/staking/pos-pool.ts        只读调用、估算和四个写调用的适配器
app/lib/staking/transactions.ts    EVM 回执等待和状态规范化
app/lib/staking/errors.ts          provider/revert 错误到产品文案的映射
app/regional.ts                    Stake 初始区域文案和设计默认值
app/lib/content.ts                 经理可编辑文案的 SQLite 读写
tests/staking-*.test.mjs           单位、状态、架构和页面测试
```

具体文件名允许实现时调整，但必须保持：UI 不直接拼 calldata；金额换算是可单测纯函数；合约适配器集中校验网络和地址；区域配置不能改变交易目标和业务规则。

建议环境变量：

```dotenv
NEXT_PUBLIC_STAKING_ENABLED=false
NEXT_PUBLIC_CONFLUX_NETWORK=espace-mainnet
NEXT_PUBLIC_CONFLUX_CHAIN_ID=1030
NEXT_PUBLIC_CONFLUX_RPC_URL=https://evm.confluxrpc.com
NEXT_PUBLIC_STAKING_CONTRACT=0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3
```

生产构建中 `NEXT_PUBLIC_STAKING_ENABLED=true` 时，配置缺失、chain ID 非 `1030` 或地址不在代码允许列表都应使构建失败或功能保持禁用。RPC URL 是公开读取端点，不得放私钥。

## 12. 数据刷新与并发

- 首屏矿池数据可短时缓存，建议 15–30 秒；用户数据按账户隔离，不能跨账户复用；
- 连接、账户切换、网络切换、窗口重新聚焦和交易成功后立即刷新；
- pending 期间可轮询回执，避免每个新区块重读全部方法；
- 多个只读调用并行执行，单项失败不应让所有卡片消失；
- 使用请求序号或取消机制，防止旧账户的慢响应覆盖新账户；
- 页面隐藏时降低轮询频率，卸载时移除 provider 事件监听；
- 队列和 `userSummary` 应基于同一批次的当前区块读取，降低临界区块显示不一致。

## 13. 可访问性与文案要求

- 所有输入有可见 label、单位和错误关联；
- pending 状态通过 `aria-live` 宣告，不只依赖颜色或动画；
- 折叠队列使用可聚焦按钮并维护 `aria-expanded`；
- 钱包弹窗返回焦点，Esc 行为由钱包控制时不与页面冲突；
- 错误、成功和警告颜色满足 WCAG AA，且配套文字/图标；
- 不使用“无风险”“保证”“固定回报”“立即到账”等误导文案；
- “赎回交易成功”与“本金已到账”必须是两个独立状态。

## 14. 测试计划

### 14.1 单元测试

- CFX、Drip、votePower 双向换算及超大整数；
- `1000 CFX` 倍数、边界、非法字符串和 `uint64` 上限校验；
- APY 比例转换，包含 `0` 和大值；
- `UserSummary` 派生数据，特别是 `locked` 与 `available` 的区别；
- 队列到期判断和预计时间；
- 合约错误映射、地址/chain ID 允许列表校验。

### 14.2 适配器测试

- `increaseStake(3)` 必须携带精确的 `3000 CFX` Drip value；
- 其他三个写方法 value 必须为零；
- 质押、赎回和提取参数均为 votePower，提取参数受 `withdrawableCfx` 流动性限制；
- EIP-1193 钱包拒绝、RPC 超时、estimate 失败、回执成功/失败/迟到；
- 账户或网络切换时旧请求不污染新状态；
- 重载队列方法选择正确。

### 14.3 页面与端到端测试

- 未安装、未连接、错误网络、正确网络四个钱包入口状态；
- 矿池只读数据在未连接钱包时可见；
- 四个操作的按钮启用条件、确认状态、成功刷新和失败恢复；
- 两个队列默认折叠并可键盘操作；
- 320px 宽屏到桌面宽屏无金额/按钮溢出；
- 区域文案可变化，但网络、单位、地址和调用规则不受区域配置影响；
- feature flag 关闭时不加载钱包连接交互、不发 RPC 写请求。

主网不进行自动资金交易测试。写操作使用本地/测试环境中与线上版本匹配的合约进行集成测试；生产仅做只读 smoke test 和人工小额验证。

## 15. 上线与回滚

### 15.1 上线顺序

1. 先发布 feature flag 关闭的实现；
2. 运行网络、代理实现地址、ABI 和只读 smoke test；
3. 在受控环境使用受支持的 EIP-1193 钱包完成人工小额端到端验证；
4. 只对内部/指定区域开启；
5. 观察 RPC 错误率、签名拒绝率、交易回执失败率和刷新失败率；
6. 验证稳定后再全面开启。

### 15.2 快速回滚

出现错误网络、错误地址、ABI 不兼容、代理实现未知变化或异常交易失败率时，立即关闭 `NEXT_PUBLIC_STAKING_ENABLED`，保留静态说明或只读数据，不需要回滚其他 Journal/Manager 功能。

## 16. 一期验收标准

- [ ] 未连接钱包即可看到矿池总质押、人数和 APY；
- [ ] 兼容钱包连接后显示 EIP-55 checksum eSpace 地址及准确 CFX 余额；
- [ ] 错误网络下所有写操作均不可用；
- [ ] 质押只接受 `1000 CFX` 的正整数倍，并以正确 votePower/value 调用；
- [ ] 当前质押使用 `available`，可赎回使用 `locked`，已解锁本金使用 `unlocked`；
- [ ] 质押与赎回队列默认折叠，展开后显示金额、endBlock、状态和预计时间；
- [ ] 赎回确认后进入解锁队列，不被误报为已到账；
- [ ] 当前可提取票数取 `min(unlocked, withdrawableVotes)`；流动性不足时不提交超额交易；
- [ ] 提取使用 `withdrawStake(votesToWithdraw)`，确认后钱包余额、流动性和用户状态刷新；
- [ ] 可领取收益以 `userInterest` 为准，累计收益为已领加可领取；
- [ ] 一期领取收益只调用 `claimAllInterest()`；
- [ ] 所有交易展示 awaiting signature、submitted、confirming、success/error；
- [ ] 获得 tx hash 后可跳转到正确的 eSpace 浏览器；
- [ ] 用户拒签、revert、RPC 超时和刷新失败均能恢复并重试；
- [ ] 账户/网络切换不会短暂展示上一账户的资产；
- [ ] 合约校验失败或 feature flag 关闭时不会产生钱包写请求；
- [ ] 单元、适配器、页面、响应式和现有架构测试全部通过。

## 17. 实现前待确认项

以下问题不阻塞规格评审，但在开发相应部分前必须定案：

1. 生产 RPC 是否直接使用 Conflux 公共端点，还是配置有配额和监控的独立端点；
2. eSpace 区块浏览器交易链接是否固定使用 `evm.confluxscan.io`；
3. 一期支持哪些 EIP-1193 钱包，是否需要 EIP-6963 多钱包发现或 WalletConnect；
4. 合约代理当前实现地址、审核 commit 和 ABI 的发布记录；
5. 是否在一期显示矿池用户分成/手续费；原始需求未要求，当前建议不展示；
6. 队列超过 50 条时的最终分页样式；
7. 风险披露和中文文案是否需要法务/社区负责人确认。

## 18. 参考资料

- 原始需求：`docs/pool/staking.md`
- 本地 ABI：`docs/pool/IPoSPool.json`
- PoS Pool 上游源码：<https://github.com/conflux-fans/pos-pool>
- Conflux PoS Staking 概览：<https://doc.confluxnetwork.org/docs/general/mine-stake/stake/staking-overview>
- Conflux PoS Pools 指南：<https://doc.confluxnetwork.org/docs/general/mine-stake/stake/pos-pools-list/>
- Conflux eSpace 概览：<https://doc.confluxnetwork.org/docs/espace/Overview/>
- Conflux eSpace 网络端点：<https://doc.confluxnetwork.org/docs/espace/network-endpoints/>
- EIP-1193 Provider API：<https://eips.ethereum.org/EIPS/eip-1193>
- ethers v6：<https://docs.ethers.org/v6/>
- eSpace 合约代理：<https://evm.confluxscan.io/address/0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3>
- Conflux v3.0 升级说明：<https://doc.confluxnetwork.org/docs/general/hardforks/v3.0/>
- CIP-156：<https://github.com/Conflux-Chain/CIPs/blob/master/CIPs/cip-156.md>
