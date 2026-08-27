export const DRIP_PER_CFX = 10n ** 18n;
export const CFX_PER_VOTE = 1000n;
export const DRIP_PER_VOTE = CFX_PER_VOTE * DRIP_PER_CFX;
export const MAX_UINT64 = (1n << 64n) - 1n;

export type StakeAmount = {
  cfx: bigint;
  votePower: bigint;
  valueDrip: bigint;
};

export function parseStakeAmount(input: string): StakeAmount {
  if (!/^[0-9]+$/.test(input)) throw new Error("请输入不含小数的 CFX 数量");
  const cfx = BigInt(input);
  if (cfx < CFX_PER_VOTE || cfx % CFX_PER_VOTE !== 0n) {
    throw new Error("金额必须是 1000 CFX 的正整数倍");
  }
  const votePower = cfx / CFX_PER_VOTE;
  if (votePower > MAX_UINT64) throw new Error("票数超过 uint64 上限");
  return { cfx, votePower, valueDrip: cfx * DRIP_PER_CFX };
}

export function votesToCfx(votes: bigint) {
  return votes * CFX_PER_VOTE;
}

export function formatCfx(cfx: bigint) {
  return `${cfx.toLocaleString("en-US")} CFX`;
}

export function formatDripAsCfx(drip: bigint, fractionDigits = 6) {
  const whole = drip / DRIP_PER_CFX;
  const fraction = drip % DRIP_PER_CFX;
  const digits = fraction.toString().padStart(18, "0").slice(0, fractionDigits).replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${digits ? `.${digits}` : ""} CFX`;
}

export function formatApy(raw: bigint) {
  const whole = raw / 100n;
  const fraction = (raw % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}%`;
}
