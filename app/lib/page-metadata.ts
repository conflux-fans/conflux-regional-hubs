import type { Metadata } from "next";
import { regions, resolveRegion, type RegionalConfig } from "../regional.ts";

const shareImages: Partial<Record<RegionalConfig["key"], string>> = {
  africa: "/brand/kudi-hub/kudi-hub-symbol-1024.png",
  latam: "/brand/caudal/logo-blue.png",
  slovo: "/brand/slovo/logo-og.png",
  hk: "/brand/hk/hk-logo-og.png",
};

const htmlLanguages: Partial<Record<RegionalConfig["key"], string>> = {
  africa: "en",
  korea: "ko",
  latam: "es",
  hk: "zh-Hant",
};

export function regionShareImage(region: RegionalConfig) {
  return shareImages[region.key] ?? "/favicon.svg";
}

export function regionHtmlLang(region: RegionalConfig) {
  if (region.key === "slovo") return region.locale === "uk" ? "uk" : "ru";
  return htmlLanguages[region.key] ?? "en";
}

export function siteOrigin(region: RegionalConfig) {
  return (process.env.NEXT_PUBLIC_SITE_URL || `https://${region.domain}`).replace(/\/+$/, "");
}

/** The region this deployment serves, used by the root layout where no `?region=` query is available. */
export function deploymentRegion() {
  return regions[resolveRegion(undefined)];
}

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  publishedTime?: string;
};

/** Per-region favicon, resolved per request by page metadata so one deployment can preview other regions safely. */
function regionIcons(region: RegionalConfig) {
  if (region.key === "slovo")
    return { icon: "/brand/slovo/mark-32.png", shortcut: "/brand/slovo/mark-32.png", apple: "/brand/slovo/mark-128.png" };
  if (region.key === "hk")
    return { icon: "/brand/hk/hk-mark-32.png", shortcut: "/brand/hk/hk-mark-32.png", apple: "/brand/hk/hk-mark-180.png" };
  return { icon: "/favicon.svg", shortcut: "/favicon.svg" };
}

export function regionalMetadata(region: RegionalConfig, { title, description, path = "/", type = "website", publishedTime }: PageMetadataInput): Metadata {
  const image = regionShareImage(region);
  const url = `${siteOrigin(region)}${path}`;
  return {
    metadataBase: new URL(siteOrigin(region)),
    title,
    description,
    alternates: { canonical: url },
    icons: regionIcons(region),
    openGraph: { title, description, url, type, siteName: region.wordmark, images: [{ url: image }], ...(publishedTime ? { publishedTime } : {}) },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function siteMetadata(region: RegionalConfig): Metadata {
  return regionalMetadata(region, { title: region.seo.title, description: region.seo.description });
}
