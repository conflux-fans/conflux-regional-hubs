import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { region } from "../config/regions";
export const metadata: Metadata = { title:region.siteName, description:`The regional Conflux community hub for ${region.region}.`, other:{"codex-preview":"development"}, icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"} };
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
