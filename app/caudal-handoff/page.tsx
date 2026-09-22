import Link from "next/link";

export const metadata = {
  title: "Caudal — Developer handoff",
  description: "Implementation and launch checklist for Caudal LATAM inside the shared Conflux regional hubs repository.",
};

export default function CaudalHandoff() {
  return (
    <main style={{ maxWidth: 900, margin: "60px auto", padding: 24, fontSize: 18, lineHeight: 1.7, background: "white", color: "#26221f" }}>
      <Link href="/?region=latam">← Caudal home</Link>
      <h1>Caudal: developer handoff</h1>
      <p>LATAM is a region in the shared hub repository alongside Africa and Korea. Keep one repository; deploy each regional domain from it with its own <code>NEXT_PUBLIC_REGION_SLUG</code>, origin, database, and secrets.</p>

      <h2>Routes</h2>
      <ul>
        <li><Link href="/?region=latam">Caudal home</Link></li>
        <li><Link href="/journal?region=latam">Actualidad</Link></li>
        <li><Link href="/stake?region=latam">Staking — disabled until integration</Link></li>
        <li><Link href="/studio?region=latam">Protected manager studio</Link></li>
        <li><Link href="/?region=africa">Kudi Hub reference</Link></li>
      </ul>

      <h2>Launch steps</h2>
      <ol>
        <li>Create a manager account with <code>npm run auth:setup</code> and store the generated <code>ADMIN_CREDENTIALS_JSON</code> and <code>AUTH_SESSION_SECRET</code> as deployment secrets.</li>
        <li>Set <code>NEXT_PUBLIC_REGION_SLUG=latam</code> and the confirmed production <code>NEXT_PUBLIC_SITE_URL</code> before building.</li>
        <li>Give the deployment its own persistent disk and <code>SQLITE_PATH</code>, then run <code>npm run db:migrate</code>. The Caudal UI copy edited in Studio is stored in the shared <code>regional_content</code> table.</li>
        <li>Run <code>npm run lint</code> and <code>npm test</code> (which includes the production build).</li>
      </ol>

      <h2>Production connections still required</h2>
      <ul>
        <li>Confirmed domain, DNS and HTTPS. The requested <code>caudal.hub</code> name is an intention, not a registered or connected domain.</li>
        <li>X credentials for automatic posts. Public profile links work without credentials. Instagram and YouTube remain hidden for LATAM until connected.</li>
        <li>Media storage if managers need direct portrait or cover uploads; portraits currently use supplied URLs or initials.</li>
        <li>Audited staking integration: wallet, network, contracts and risk disclosures. Staking stays disabled for LATAM; the region renders a non-transactional placeholder page by design.</li>
      </ul>

      <h2>Content and assets</h2>
      <p>Logo SVGs, PNGs, the hero reference and moodboard live under <code>public/brand/caudal</code>. The hero artwork is displayed as a CSS crop of the supplied mockup; request a clean illustration export before final design sign-off. Spanish is the default language and English interface copy is available through the language toggle; supplied contributor biographies and articles remain in their original language — publication translation is not automatic.</p>

      <h2>Approval before launch</h2>
      <p>Check desktop and mobile widths, both languages, contributor dialogs (Escape and focus return), manager permissions, and the save/publish/reopen article flow. Verify that the Africa and Korea presentations are unchanged. Do not interpret adapter unit tests as proof that external services are connected.</p>
    </main>
  );
}
