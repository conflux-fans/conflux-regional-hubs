import Link from "next/link";
import { KudiLogo } from "../components/kudi-logo";

const completed = [
  "Kudi Hub desktop and mobile presentation with accessible light/dark contrast",
  "Editable SVG logo system plus transparent 1024px and 512px PNG symbols",
  "Protected manager, Markdown toolbar, live preview, saved drafts, and stable published URLs",
  "Canonical/Open Graph metadata and X, Telegram, Discord, and copy-link sharing",
  "Instagram, X, and YouTube server adapters with working public profile fallbacks",
  "Manager-editable content, contributors, module order, visibility, and social sources",
  "D1 schema/migrations, environment template, automated tests, and deployment scripts",
];

const connections = [
  ["Authentication", "Set REGIONAL_EDITOR_EMAILS and confirm the production email sign-in policy."],
  ["Database", "Provision one D1 database per regional deployment and apply drizzle migrations in order."],
  ["Storage", "Bind R2 or equivalent before enabling article-cover or portrait uploads."],
  ["Social APIs", "Add INSTAGRAM_ACCESS_TOKEN and X_BEARER_TOKEN. YouTube RSS needs a channel ID but no token."],
  ["Domain", "Set NEXT_PUBLIC_SITE_URL, attach the regional domain, verify DNS/HTTPS and social cards."],
  ["Staking", "Supply the audited CFX contract, RPC/network, wallet provider, simulations, limits, and security approval."],
];

export default function HandoffPage() {
  return <main className="handoff-page"><header><KudiLogo /><p>KUDI HUB / DEVELOPER HANDOFF</p><h1>One repository.<br />Every regional hub.</h1><p>Deploy Kudi Hub now, then use the same source and configuration contract for future regional questionnaire prompts. Do not fork the shared product core.</p><a href="/downloads/kudi-hub-deploy-ready.zip" download>Download deploy-ready ZIP <span>↓</span></a></header><section><div><span>IMPLEMENTED & TESTED</span><h2>What is already in the package</h2></div><ol>{completed.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2,"0")}</span><p>{item}</p></li>)}</ol></section><section className="handoff-connections"><div><span>PRODUCTION CONNECTIONS</span><h2>What the developer must supply</h2></div><div>{connections.map(([name, detail]) => <article key={name}><h3>{name}</h3><p>{detail}</p></article>)}</div></section><section className="handoff-steps"><span>DEPLOYMENT SEQUENCE</span><ol><li>Unzip and read <b>README.md</b> and <b>docs/DEVELOPER-HANDOFF.md</b>.</li><li>Run <code>npm ci</code>, <code>npm test</code>, and <code>npm run validate:artifact</code>.</li><li>Provision D1 and apply <code>drizzle/*.sql</code> in numeric order.</li><li>Copy <code>.env.example</code> values into the platform secret/configuration manager.</li><li>Deploy once with <code>NEXT_PUBLIC_REGION_SLUG=africa</code> and the Kudi Hub domain.</li><li>For a new questionnaire prompt, add only its regional config/presentation/assets and create a new deployment target from this same repository.</li></ol><Link href="/?region=africa">Open Kudi Hub review ↗</Link></section></main>;
}
