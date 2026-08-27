import Link from "next/link";
import { KudiLogo } from "./kudi-logo";
import { LoginForm } from "../login/login-form";

export function EditorLoginScreen({ returnTo }: { returnTo: string }) {
  return (
    <main className="demo-login-page auth-login-page">
      <div className="demo-login-visual">
        <Link href="/" className="demo-back">← Return to website</Link>
        <KudiLogo className="demo-logo-large" />
        <p>REGIONAL WEBSITE STUDIO</p>
        <h1>Manage your regional hub securely.</h1>
        <div><span>Publish stories</span><span>Edit website text</span><span>Manage modules</span></div>
      </div>
      <section className="demo-login-card">
        <span>AUTHORIZED MANAGERS ONLY</span>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
