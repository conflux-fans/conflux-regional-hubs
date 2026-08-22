import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { region } from "../config/regions";
import { siteBaseUrl } from "../lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const base = siteBaseUrl() || (host ? `${protocol}://${host}` : null);
  const description = `The regional Conflux community hub for ${region.region}.`;
  const socialImage = base ? `${base}/og.png` : undefined;
  return {
    title: region.siteName,
    description,
    metadataBase: base ? new URL(base) : undefined,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: region.siteName,
      description,
      type: "website",
      url: base || undefined,
      images: socialImage ? [{ url: socialImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: region.siteName,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}
const themeStyle = {
  "--blue": region.theme.primary,
  "--on-primary": region.theme.primaryText,
  "--sand": region.theme.secondary,
  "--on-secondary": region.theme.secondaryText,
  "--red": region.theme.accent,
  "--on-accent": region.theme.accentText,
  "--cream": region.theme.background,
  "--paper": region.theme.surface,
  "--ink": region.theme.text,
  "--muted": region.theme.muted,
  "--paper-ink": region.theme.surfaceText,
  "--paper-muted": region.theme.surfaceMuted,
  "--dark": region.theme.dark,
  "--dark-ink": region.theme.darkText,
  "--dark-muted": region.theme.darkMuted,
  "--font-body": region.presentation.bodyFont,
  "--font-display": region.presentation.displayFont,
  "--radius": region.presentation.radius,
} as CSSProperties;
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang={region.languages.primary === "English" ? "en" : region.languages.primary.toLowerCase()}><body style={themeStyle}>{children}</body></html>}
