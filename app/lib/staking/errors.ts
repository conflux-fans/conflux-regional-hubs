type ErrorShape = {
  code?: number | string;
  message?: string;
  shortMessage?: string;
  reason?: string;
  info?: { error?: { message?: string } };
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return String(error ?? "");
  const value = error as ErrorShape;
  return [value.shortMessage, value.reason, value.message, value.info?.error?.message].filter(Boolean).join(" ");
}

export function stakingErrorMessage(error: unknown) {
  const value = error && typeof error === "object" ? error as ErrorShape : undefined;
  if (value?.code === 4001 || value?.code === "ACTION_REJECTED") return "操作已取消";
  const text = errorText(error).toLowerCase();
  if (text.includes("请输入不含小数") || text.includes("金额必须是 1000 cfx")) return "金额必须是 1000 CFX 的正整数倍";
  if (text.includes("uint64")) return "输入金额超过合约允许的上限";
  if (text.includes("余额不足")) return "钱包余额不足以支付金额和预计 gas";
  if (text.includes("unexpected staking") || text.includes("allowlist") || text.includes("contract code is unavailable")) return "矿池合约安全校验失败";
  if (text.includes("minimal votepower")) return "最少操作 1000 CFX";
  if (text.includes("msg.value should be")) return "质押金额参数不一致";
  if (text.includes("locked is not enough")) return "当前可赎回余额不足或存在锁仓限制";
  if (text.includes("unlocked is not enough")) return "已解锁本金不足";
  if (text.includes("no claimable interest") || text.includes("interest not enough")) return "当前没有足够可领取收益";
  if (text.includes("pool is not setted")) return "矿池桥接地址尚未配置";
  if (text.includes("withdrawable cfx is not enough")) return "矿池当前可提取流动性不足";
  if (text.includes("timeout") || text.includes("network") || text.includes("failed to fetch")) return "网络服务暂时不可用";
  if (value?.code === "CALL_EXCEPTION") return "交易执行失败，资金状态未按本次请求改变";
  return "操作未完成，请检查钱包和网络后重试";
}

export function stakingErrorDetail(error: unknown) {
  return errorText(error).slice(0, 800);
}
