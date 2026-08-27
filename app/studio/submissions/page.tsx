import Link from "next/link";
import { EditorLoginScreen } from "../../components/editor-login-screen";
import { SignOutButton } from "../../components/sign-out-button";
import { getAuthorizedEditor } from "../../lib/editor-auth";
import { getRegionalBriefSubmissions } from "../../lib/content";
import { PromptActions } from "./prompt-actions";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const returnTo = "/studio/submissions";
  if (!(await getAuthorizedEditor())) return <EditorLoginScreen returnTo={returnTo} />;

  const submissions = await getRegionalBriefSubmissions();
  return <main className="studio-page submissions-page">
    <header className="studio-header"><div><p className="v2-kicker">PRIVATE COORDINATOR INBOX</p><h1>Regional<br />submissions.</h1><p>Review every questionnaire and forward its generated prompt to the developer.</p></div><nav><Link href="/questionnaire?region=africa">Open public questionnaire ↗</Link><Link href="/studio?region=africa">Website manager</Link><SignOutButton /></nav></header>
    <section className="studio-scope"><span>STEP 01</span><strong>Open and review a submission</strong><span>STEP 02</span><strong>Copy or download the prompt and send it to the developer</strong></section>
    {submissions.length === 0 ? <section className="submissions-empty"><span>NO SUBMISSIONS YET</span><h2>New questionnaire responses will appear here automatically.</h2><p>Share the public questionnaire link with a regional lead. They do not need a manager login.</p></section> : <section className="submissions-list">{submissions.map((item) => <details key={item.id} className="submission-card"><summary><span><small>#{item.id} · {item.region.toUpperCase()} · {new Date(item.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</small><strong>{item.projectName}</strong><em>{item.submitterName} · {item.submitterEmail}</em></span><b>Open prompt ↓</b></summary><div className="submission-body"><dl><div><dt>Intended domain</dt><dd>{item.domain}</dd></div><div><dt>Primary language</dt><dd>{item.primaryLanguage}</dd></div><div><dt>Preferred contact</dt><dd>{item.submitterContact || "Not supplied"}</dd></div><div><dt>Status</dt><dd>{item.status}</dd></div></dl><PromptActions prompt={item.generatedPrompt} projectName={item.projectName} /><pre>{item.generatedPrompt}</pre></div></details>)}</section>}
  </main>;
}
