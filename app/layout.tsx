import type { Metadata } from "next";
import { Geist, Geist_Mono, Literata, Manrope, JetBrains_Mono } from "next/font/google";
import { deploymentRegion, regionHtmlLang, siteMetadata } from "./lib/page-metadata";
import "./globals.css";
import "./caudal.css";
import "./slovo.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const slovoSerif = Literata({ variable: "--font-slovo-serif", subsets: ["latin", "cyrillic", "cyrillic-ext"] });
const slovoSans = Manrope({ variable: "--font-slovo-sans", subsets: ["latin", "cyrillic", "cyrillic-ext"] });
const slovoMono = JetBrains_Mono({ variable: "--font-slovo-mono", subsets: ["latin", "cyrillic", "cyrillic-ext"] });

const region = deploymentRegion();
const bodyFonts = region.key === "slovo" ? `${slovoSans.variable} ${slovoSerif.variable} ${slovoMono.variable}` : `${geistSans.variable} ${geistMono.variable}`;

export const metadata: Metadata = {
  ...siteMetadata(region),
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang={regionHtmlLang(region)}><body className={bodyFonts}>{children}</body></html>;
}
