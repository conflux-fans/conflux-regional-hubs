export type WalletContext = Readonly<{
  generation: number;
  account: string | null;
  chainId: bigint | null;
}>;

function sameAccount(left: string | null, right: string | null) {
  return left === null || right === null ? left === right : left.toLowerCase() === right.toLowerCase();
}

export class WalletContextGuard {
  private context: WalletContext = { generation: 0, account: null, chainId: null };

  current() {
    return this.context;
  }

  replace(account: string, chainId: bigint) {
    this.context = { generation: this.context.generation + 1, account, chainId };
    return this.context;
  }

  clear() {
    this.context = { generation: this.context.generation + 1, account: null, chainId: null };
    return this.context;
  }

  matches(expected: WalletContext) {
    return expected.generation === this.context.generation
      && expected.chainId === this.context.chainId
      && sameAccount(expected.account, this.context.account);
  }
}
