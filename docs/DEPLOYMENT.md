# Production deployment checklist

## Package contents

This repository is the shared regional application. It includes the responsive Kudi Hub presentation, Markdown Journal with drafts and sharing, manager content/modules/contributors/connections UI, official social-feed adapters with public profile fallbacks, the Kudi Hub logo system, database schema/migrations, safe manager demo, and staking integration boundaries.

## Deployment team sequence

1. Create the frontend project from this repository and run `npm ci && npm run build`.
   The same deployment serves Kudihub at `/`, the public questionnaire at `/questionnaire`, and the protected manager at `/studio`.
2. Provision a SQL database compatible with the tables in `db/schema.ts`; apply the SQL files in `drizzle/` in order. Cloudflare D1 is already supported. Postgres/Supabase can be used by replacing the data adapter while keeping the exported functions in `app/lib/content.ts`.
3. Provision media storage for article covers, contributor portraits, and regional assets. Markdown publishing works now; add the storage adapter before enabling direct image uploads.
4. Connect email magic-link or OTP authentication. Preserve the server-side editor check and configure an allowlist/role table. Do not authorize editors only in client code.
5. Set `REGIONAL_EDITOR_EMAILS` (or replace it with a database-backed regional role model).
6. Supply `INSTAGRAM_ACCESS_TOKEN` and `X_BEARER_TOKEN` for the included server adapters. YouTube uses its public Atom feed when a `/channel/UC…` URL is supplied. The configured Instagram/X profile links and fallback cards work without credentials. Never put social access tokens in browser code.
7. Connect an audited CFX staking contract, Conflux-compatible wallet provider, network ID, read-only pool statistics, transaction simulation, and explicit user confirmation. Complete security review before enabling staking writes.
8. Connect the approved domain, configure HTTPS, set canonical metadata, and verify DNS.
9. Run responsive, accessibility, editorial-permission, content, wallet, transaction, and rollback tests.

## Recommended production architecture

- Frontend: this Vinext/React application on Cloudflare Workers or equivalent.
- Database and storage: Cloudflare D1 + R2, or Supabase Postgres + Storage.
- Authentication: email magic link/OTP with regional roles (`owner`, `manager`, `author`).
- Social ingestion: scheduled server jobs, official APIs, cached normalized feed items.
- Staking: audited onchain contract calls isolated behind `app/lib/staking` (to be added by the blockchain team).

## Per-region configuration

Use one deployment per regional domain and keep this single upstream repository. Select the deployment with `NEXT_PUBLIC_REGION_SLUG`; do not create regional repositories or long-lived forks. Manager-editable fields belong in the database; brand styles and production assets stay in code review.

## Environment variables

Copy `.env.example` into the deployment environment. Supply secrets through the platform's secret manager, never committed files.
