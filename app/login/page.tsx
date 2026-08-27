import type { Metadata } from "next";
import Link from "next/link";
import { EditorLoginScreen } from "../components/editor-login-screen";
import { safeReturnTo } from "../lib/auth-crypto";
import { getAuthorizedEditor } from "../lib/editor-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manager login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(Array.isArray(params.return_to) ? params.return_to[0] : params.return_to);
  if (await getAuthorizedEditor()) return <main className="studio-access"><p className="v2-kicker">REGIONAL STUDIO</p><h1>You are already signed in.</h1><Link href={returnTo}>Open manager studio →</Link></main>;
  return <EditorLoginScreen returnTo={returnTo} />;
}
