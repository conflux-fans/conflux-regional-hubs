import type { RegionConfig } from "./region-types";
import { englishStakeCopy } from "./stake-copy.ts";

/**
 * Neutral schema example for a questionnaire-generated region.
 * It deliberately avoids the reference implementations' layout choices. Replace every value
 * from the approved prompt; do not use this object as a visual design.
 */
export const newRegionTemplate: RegionConfig = {
  slug: "replace-me",
  region: "Region name",
  siteName: "Regional hub name",
  intendedDomain: "example.org",
  languages: { primary: "English", secondary: [] },
  theme: {
    primary: "#2348c8",
    primaryText: "#ffffff",
    secondary: "#f0b45f",
    secondaryText: "#171719",
    accent: "#c83b4d",
    accentText: "#ffffff",
    background: "#f7f4ee",
    text: "#171719",
    muted: "#5d5b59",
    surface: "#ffffff",
    surfaceText: "#171719",
    surfaceMuted: "#62605e",
    dark: "#111827",
    darkText: "#ffffff",
    darkMuted: "#d1d5db",
  },
  identity: { eyebrow: "CONFLUX COMMUNITY / REGION", localMark: "RG", symbol: "monogram", coordinateLeft: "0° N", coordinateRight: "0° E" },
  hero: { headline: "Regional headline", introduction: "Regional introduction", strip: ["LOCAL", "OPEN", "CONNECTED"] },
  journal: { name: "Journal", heading: "Regional stories.", pageHeading: "Latest stories.", introduction: "Journal introduction", emptyMessage: "Published stories will appear here.", stories: [] },
  stake: { name: "Stake CFX", eyebrow: "CONFLUX POS", headline: "Stake CFX", homeHeading: "Participate in the network.", introduction: "Shared staking introduction", copy: englishStakeCopy },
  socials: { instagram: { label: "Instagram", profileUrl: "", handle: "" }, x: { label: "X", profileUrl: "", handle: "" }, youtube: { label: "YouTube", profileUrl: "", handle: "" } },
  contributors: [],
  modules: { journal: "use-now", stake: "use-now", contributors: "setup-later", instagram: "setup-later", twitter: "setup-later", youtube: "setup-later", events: "not-needed", newsletter: "not-needed", communityLinks: "setup-later" },
  presentation: {
    bodyFont: "Arial, sans-serif",
    displayFont: "Arial, sans-serif",
    radius: "8px",
    hero: { layout: "split", visual: "none", visualLabel: "" },
    home: { sectionOrder: ["journal", "stake", "contributors", "social"], journalVariant: "rows", stakeVariant: "statement", contributorsVariant: "compact", socialVariant: "cards" },
    pages: { journal: "editorial-list", stake: "light-panel" },
    copy: {
      journalEyebrow: "JOURNAL",
      journalLink: "All stories",
      stakeLink: "Explore staking",
      contributorsEyebrow: "CONTRIBUTORS",
      contributorsHeading: "Meet the community.",
      contributorsIntroduction: "The people behind this regional hub.",
      socialEyebrow: "CHANNELS",
      socialHeading: "Follow the community.",
      closingLine: "REGION · CONFLUX",
    },
  },
};
