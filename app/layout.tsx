import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { deploymentRegion, regionHtmlLang, siteMetadata } from "./lib/page-metadata";
import "./globals.css";
import "./caudal.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const region = deploymentRegion();

export const metadata: Metadata = {
  ...siteMetadata(region),
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang={regionHtmlLang(region)}><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
