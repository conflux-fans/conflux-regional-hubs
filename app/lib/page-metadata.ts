import type { Metadata } from "next";
import { regions, resolveRegion, type RegionalConfig } from "../regional.ts";

const shareImages: Partial<Record<RegionalConfig["key"], string>> = {
  africa: "/brand/kudi-hub/kudi-hub-symbol-1024.png",
  latam: "/brand/caudal/logo-blue.png",
};

const htmlLanguages: Partial<Record<RegionalConfig["key"], string>> = {
  africa: "en",
  korea: "ko",
  latam: "es",
};

export function regionShareImage(region: RegionalConfig) {
  return shareImages[region.key] ?? "/favicon.svg";
}

export function regionHtmlLang(region: RegionalConfig) {
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

export function regionalMetadata(region: RegionalConfig, { title, description, path = "/", type = "website", publishedTime }: PageMetadataInput): Metadata {
  const image = regionShareImage(region);
  const url = `${siteOrigin(region)}${path}`;
  return {
    metadataBase: new URL(siteOrigin(region)),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type, siteName: region.wordmark, images: [{ url: image }], ...(publishedTime ? { publishedTime } : {}) },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function siteMetadata(region: RegionalConfig): Metadata {
  return regionalMetadata(region, { title: region.seo.title, description: region.seo.description });
}
