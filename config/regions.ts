export const deploymentRegions = {
  africa: {
    siteName: "Kudi Hub",
    intendedDomain: "kudihub.com",
    presentation: "kudi-light-editorial",
    defaultLocale: "en",
  },
  korea: {
    siteName: "Conflux Korea",
    intendedDomain: "confluxkorea.kr",
    presentation: "korea-poster",
    defaultLocale: "ko",
  },
} as const;

export type DeploymentRegionSlug = keyof typeof deploymentRegions;
