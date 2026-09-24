export const deploymentRegions = {
  latam: {
    siteName: "Caudal",
    intendedDomain: "caudal.hub",
    presentation: "caudal-flow",
    defaultLocale: "es",
  },
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
