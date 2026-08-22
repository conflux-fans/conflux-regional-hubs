import type { StakeCopy } from "./stake-copy.ts";

export type ModuleState = "use-now" | "setup-later" | "not-needed";
export type SocialProvider = "instagram" | "x" | "youtube";
export type HomeSectionId = "journal" | "stake" | "contributors" | "social";

export type RegionConfig = {
  slug: string;
  region: string;
  siteName: string;
  intendedDomain: string;
  languages: { primary: string; secondary: string[] };
  theme: {
    primary: string;
    primaryText: string;
    secondary: string;
    secondaryText: string;
    accent: string;
    accentText: string;
    background: string;
    text: string;
    muted: string;
    surface: string;
    surfaceText: string;
    surfaceMuted: string;
    dark: string;
    darkText: string;
    darkMuted: string;
  };
  identity: {
    eyebrow: string;
    localMark: string;
    symbol: "skyline" | "monogram";
    coordinateLeft: string;
    coordinateRight: string;
  };
  hero: { headline: string; introduction: string; strip: string[] };
  journal: {
    name: string;
    heading: string;
    pageHeading: string;
    introduction: string;
    emptyMessage: string;
    stories: Array<{
      slug: string;
      tag: string;
      date: string;
      title: string;
      deck: string;
      body: string;
      author: string;
    }>;
  };
  stake: {
    name: string;
    eyebrow: string;
    headline: string;
    homeHeading: string;
    introduction: string;
    copy: StakeCopy;
  };
  socials: Record<SocialProvider, { label: string; profileUrl: string; handle: string }>;
  contributors: Array<{
    name: string;
    role: string;
    cardBio: string;
    fullProfile: string;
    initials: string;
    visible: boolean;
  }>;
  modules: Record<
    | "journal"
    | "stake"
    | "contributors"
    | "instagram"
    | "twitter"
    | "youtube"
    | "events"
    | "newsletter"
    | "communityLinks",
    ModuleState
  >;
  presentation: {
    bodyFont: string;
    displayFont: string;
    radius: string;
    hero: {
      layout: "split" | "stacked";
      visual: "skyline" | "monogram-grid" | "asset" | "none";
      visualLabel: string;
      assetPath?: string;
    };
    home: {
      sectionOrder: HomeSectionId[];
      journalVariant: "rows" | "cards";
      stakeVariant: "orbit" | "statement";
      contributorsVariant: "portrait" | "compact";
      socialVariant: "cards" | "ticker";
    };
    pages: {
      journal: "editorial-list" | "card-grid";
      stake: "dark-panel" | "light-panel";
    };
    copy: {
      journalEyebrow: string;
      journalLink: string;
      stakeLink: string;
      contributorsEyebrow: string;
      contributorsHeading: string;
      contributorsIntroduction: string;
      socialEyebrow: string;
      socialHeading: string;
      closingLine: string;
      managerSignInTitle: string;
      managerSignInIntroduction: string;
      managerEmailLabel: string;
      managerPasswordLabel: string;
      managerInvalidCredentials: string;
      managerMissingConfiguration: string;
      managerSignInAction: string;
      managerSignOutAction: string;
      managerBackLink: string;
    };
  };
};
