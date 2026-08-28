import { StakingProviders } from "./staking-providers";

export default function StakingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StakingProviders>{children}</StakingProviders>;
}
