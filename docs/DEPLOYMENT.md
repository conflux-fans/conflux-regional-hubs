# Production deployment checklist

## Package contents

This repository is the shared regional application. It includes the responsive Kudi Hub presentation, Markdown Journal with drafts and sharing, manager content/modules/contributors/connections UI, official social-feed adapters with public profile fallbacks, the Kudi Hub logo system, database schema/migrations, safe manager demo, and staking integration boundaries.

## Deployment team sequence

1. Provision a Node.js 22.13+ service with a persistent disk, then run `npm ci && npm run build`.
   The same service serves Kudihub at `/`, the public questionnaire at `/questionnaire`, and the protected manager at `/studio`.
2. Set `SQLITE_PATH` to an absolute path on the persistent disk, such as `/var/lib/kudihub/app.db`. Run `npm run db:migrate` before `npm run start`. Migrations are also checked automatically when the application opens the database.
3. Provision persistent media storage for article covers, contributor portraits, and regional assets. Markdown publishing works now; add the storage adapter before enabling direct image uploads.
4. Run `npm run auth:setup` in a trusted terminal. Add every required manager when prompted, then configure the resulting `ADMIN_CREDENTIALS_JSON` and `AUTH_SESSION_SECRET` as server-side deployment secrets. Never configure a plaintext password.
5. Protect `/api/auth/login` with the hosting provider's rate-limiting controls and rotate `AUTH_SESSION_SECRET` to revoke all active manager sessions. The environment-backed list supports up to 20 managers; replace it with a database-backed account model if self-service account management or roles are required.
6. Supply `INSTAGRAM_ACCESS_TOKEN` and `X_BEARER_TOKEN` for the included server adapters. YouTube uses its public Atom feed when a `/channel/UC…` URL is supplied. The configured Instagram/X profile links and fallback cards work without credentials. Never put social access tokens in browser code.
7. Connect an audited CFX staking contract, Conflux-compatible wallet provider, network ID, read-only pool statistics, transaction simulation, and explicit user confirmation. Complete security review before enabling staking writes.
8. Connect the approved domain, configure HTTPS, set canonical metadata, and verify DNS.
9. Run responsive, accessibility, editorial-permission, content, wallet, transaction, and rollback tests.

## Recommended production architecture

- Application: this Next.js application running as a persistent Node.js service.
- Database: the local `sqlite3` database selected by `SQLITE_PATH`, stored on a persistent volume. Run one application instance per database file.
- Storage: a persistent volume or object-storage adapter for future direct media uploads.
- Authentication: application-owned email/password login for up to 20 configured managers, with an independent PBKDF2 hash per account and signed, `HttpOnly`, `SameSite=Lax` sessions. Add a database-backed account model when roles or self-service account management are required.
- Social ingestion: scheduled server jobs, official APIs, cached normalized feed items.
- Staking: audited onchain contract calls isolated behind `app/lib/staking` (to be added by the blockchain team).

## Per-region configuration

Use one deployment per regional domain and keep this single upstream repository. Select the deployment with `NEXT_PUBLIC_REGION_SLUG`; do not create regional repositories or long-lived forks. Manager-editable fields belong in the database; brand styles and production assets stay in code review.

Give every regional deployment its own SQLite file and persistent volume. A SQLite file must not be mounted concurrently by multiple hosts or copied onto an ephemeral filesystem. If horizontal scaling or multiple writer instances become necessary, replace the database adapter with a client/server database before scaling out.

## Environment variables

Copy `.env.example` into the deployment environment. Set `SQLITE_PATH` to the mounted persistent-disk path. Generate authentication values with `npm run auth:setup`. Supply credential hashes, the session secret, and provider credentials through the platform's secret manager, never committed files.

Back up the SQLite database regularly. For a simple consistent backup, stop writes (or stop the service), copy the database file, then restart; production backup tooling may instead use SQLite's online backup API. Test restoration before launch.
