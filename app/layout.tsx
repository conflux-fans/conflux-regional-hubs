import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://conflux-community-hub.christian-oertel.chatgpt.site"),
  title: "Kudi Hub — Africa Onchain",
  description: "African voices, blockchain perspectives, and a safer path to CFX staking.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Kudi Hub — Africa Onchain", description: "African voices, blockchain perspectives, and a safer path to CFX staking.", type: "website", images: [{ url: "/brand/kudi-hub/kudi-hub-symbol-1024.png", width: 1024, height: 1024, alt: "Kudi Hub" }] },
  twitter: { card: "summary_large_image", title: "Kudi Hub — Africa Onchain", description: "African voices, blockchain perspectives, and a safer path to CFX staking.", images: ["/brand/kudi-hub/kudi-hub-symbol-1024.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
