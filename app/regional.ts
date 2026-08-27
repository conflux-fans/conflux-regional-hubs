export type RegionKey = "africa" | "korea";

export type RegionalArticleSource = {
  format: "json" | "rss";
  url: string;
};

export type RegionalContributorProfile = {
  name: string;
  role: string;
  shortBio: string;
  fullBio: string;
  photoUrl: string;
};

export type RegionalConfig = {
  key: RegionKey;
  code: string;
  name: string;
  wordmark: string;
  logoStyle: "bars" | "monogram" | "disc";
  domain: string;
  language: string;
  accent: string;
  secondary: string;
  tertiary: string;
  onAccent: string;
  surface: string;
  headline: string;
  intro: string;
  heroEyebrow: string;
  journalLabel: string;
  journalTitle: string;
  journalEyebrow: string;
  stakeLabel: string;
  stakeEyebrow: string;
  stakeHeading: string;
  stakeIntro: string;
  footerText: string;
  communityLabel: string;
  localModuleEyebrow: string;
  localModuleTitle: string;
  localModuleText: string;
  motif: "sun" | "grid";
  layout: "editorial" | "poster";
  articleSource: RegionalArticleSource;
  communityLinks: Array<{ label: string; url: string }>;
  contributors: RegionalContributorProfile[];
};

export const regions: Record<RegionKey, RegionalConfig> = {
  africa: {
    key: "africa",
    code: "AF",
    name: "Africa",
    wordmark: "Kudi Hub",
    logoStyle: "disc",
    domain: "kudihub.com",
    language: "English",
    accent: "#3558ff",
    secondary: "#c9ff63",
    tertiary: "#ff684f",
    onAccent: "#ffffff",
    surface: "#f3f1e9",
    headline: "Money moves where community leads.",
    intro: "A home for African voices, ideas, and opportunities in the blockchain economy. Explore insightful blogs and practical perspectives on crypto, Web3, and the future of finance—while discovering new ways to participate, learn, and earn through staking.",
    heroEyebrow: "KUDI HUB / AFRICA ONCHAIN",
    journalLabel: "Crypto news",
    journalTitle: "Blockchain perspectives from across Africa",
    journalEyebrow: "THE JOURNAL / CRYPTO NEWS",
    stakeLabel: "Stake CFX",
    stakeEyebrow: "COMMUNITY-LED POS",
    stakeHeading: "Stake safely. Move together.",
    stakeIntro: "A clear path to CFX staking with wallet confirmation, visible lock periods, and chain-verified transaction status.",
    footerText: "African voices, useful blockchain perspectives, and a safer path to participation.",
    communityLabel: "Community",
    localModuleEyebrow: "ONE NETWORK / MANY HORIZONS",
    localModuleTitle: "Money moves where community leads.",
    localModuleText: "From local currencies to shared rhythms, Kudi Hub follows the builders, communities, and ideas moving value across a connected continent.",
    motif: "sun",
    layout: "editorial",
    articleSource: { format: "json", url: "" },
    communityLinks: [],
    contributors: [
      {
        name: "Ehis",
        role: "Conflux Africa lead",
        shortBio: "Excited to be building Africa’s financial future one block at a time.",
        fullBio: "I’ve been in the space for well over 7 years, passionate about blockchain technology and its ability to solve real-world problems and create new opportunities. My belief in blockchain goes beyond cryptocurrency. I see it as a powerful tool for building more transparent, accessible, and inclusive financial systems. I believe Africa has the opportunity to use blockchain to overcome traditional barriers, unlock economic opportunities, empower individuals and businesses, and connect the continent more effectively to the global economy. My passion is to be part of that transformation and help build technology that creates meaningful impact for Africa.",
        photoUrl: "",
      },
      {
        name: "Judith",
        role: "Community Manager",
        shortBio: "A Web3 Community Manager passionate about building and growing blockchain communities.",
        fullBio: "A Web3 Community Manager and community builder with over 8 years of experience growing and engaging blockchain communities across Africa. As a Community Manager for Conflux Africa, I manage community communications, create engaging content, organize online events and campaigns, and support ecosystem initiatives. I enjoy bringing people together, helping users, answering questions, and creating a welcoming space where community members can connect, learn, and grow. With additional experience in customer support and as a Certified Customer Interaction Professional, I am passionate about using community building and strategic communication to strengthen Web3 ecosystems across Africa.",
        photoUrl: "",
      },
      {
        name: "Abiola",
        role: "Marketing",
        shortBio: "Connecting great products with the people who need them.",
        fullBio: "Marketing and business operations professional with 9+ years of experience across technology, Web3, SaaS, and emerging markets. I’m passionate about connecting great products with the people who need them, building communities around emerging technologies, and turning ideas into products and experiences that create meaningful impact. My work sits at the intersection of product, storytelling, growth, and technology, with a particular interest in building for and within Africa’s growing digital ecosystem.",
        photoUrl: "",
      },
      {
        name: "Obafemi",
        role: "Designer",
        shortBio: "Designing better experiences for Africa’s digital future.",
        fullBio: "I’m a product designer with over 10 years of experience creating digital products and experiences across media, technology, healthcare, and Web3. I’m passionate about understanding how people interact with technology and using design to make complex ideas simpler, more accessible, and more impactful. I believe blockchain can unlock new opportunities for Africa, and I’m excited about contributing to an ecosystem that makes technology more open, inclusive, and accessible.",
        photoUrl: "",
      },
    ],
  },
  korea: {
    key: "korea",
    code: "KR",
    name: "Korea",
    wordmark: "CONFLUX KOREA",
    logoStyle: "monogram",
    domain: "confluxkorea.kr",
    language: "한국어",
    accent: "#ff684f",
    secondary: "#3558ff",
    tertiary: "#c9ff63",
    onAccent: "#111617",
    surface: "#f4f0ec",
    headline: "한국의 Conflux.",
    intro: "뉴스, 스테이킹, 커뮤니티를 한 곳에서.",
    heroEyebrow: "REGIONAL HUB / KR",
    journalLabel: "아티클",
    journalTitle: "최신 소식",
    journalEyebrow: "아티클 / AUTO FEED",
    stakeLabel: "CFX 스테이킹",
    stakeEyebrow: "COMMUNITY STAKING",
    stakeHeading: "Stake CFX. Support Conflux.",
    stakeIntro: "A shared, centrally maintained staking module for every regional site.",
    footerText: "뉴스, 스테이킹, 커뮤니티를 한 곳에서.",
    communityLabel: "커뮤니티",
    localModuleEyebrow: "SEOUL / COMMUNITY SIGNAL",
    localModuleTitle: "한국 커뮤니티가 만드는 Conflux.",
    localModuleText: "국내 생태계 소식, 빌더 인터뷰, 밋업과 스테이킹 가이드를 한곳에서 만나보세요.",
    motif: "grid",
    layout: "poster",
    articleSource: { format: "json", url: "" },
    communityLinks: [],
    contributors: [],
  },
};

export function resolveRegion(value: string | string[] | undefined): RegionKey {
  const candidate = Array.isArray(value) ? value[0] : value || process.env.NEXT_PUBLIC_REGION_SLUG;
  return candidate === "korea" ? candidate : "africa";
}
