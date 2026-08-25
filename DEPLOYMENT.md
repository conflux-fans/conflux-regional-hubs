# Deployment guide

## Recommended topology

Use one repository and one deployment target per regional domain. Every target
builds the same reviewed commit but has its own region slug, canonical URL,
database, secrets, domain and rollback history.

Shanghai Crypto and Kudi Hub are review examples, not parent templates.

## Deploy a region

1. Import this repository into the hosting provider.
2. Use Node.js 22.13 or newer and install with `npm ci`.
3. Set `NEXT_PUBLIC_REGION_SLUG` to a registered key in `config/regions.ts`.
4. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin.
5. Add the remaining values from `.env.example` to the provider secret store.
   `MANAGER_CREDENTIALS` and `MANAGER_SESSION_SECRET` are required for Manager
   sign-in. Give every administrator email its own unique password.
6. Mount a persistent disk and set `DATABASE_PATH` to an absolute path on it.
7. Back up an existing content database before cutover. Import a legacy SQLite
   file or SQL export with `npm run db:import -- /path/to/backup.sqlite-or.sql`.
   The import runs in a transaction and can be repeated safely. Skip this step
   only for a new region with no manager-authored content.
8. Run `npm run db:init`, then build with `npm run build`.
9. Start the Node server with `npm run start`. Run only one application instance
   per SQLite file unless the platform provides shared filesystem locking.
10. Attach the regional domain and verify canonical redirects/metadata.
11. Test `/`, `/journal`, a published article, `/stake`, `/manager` and `/handoff` on desktop and mobile.
12. In Manager → Connections, verify every enabled provider reports `Feed live`.

The application targets a Node.js 22+ host with a persistent filesystem. Do not
deploy the SQLite file to an ephemeral Worker or serverless filesystem.

## Production connections

- manager email allowlist, password and session secret;
- a backed-up persistent volume for the SQLite database;
- object storage for regional logos, portraits and Journal media;
- Instagram access token/user ID;
- X bearer token/user ID;
- YouTube Data API key/channel ID;
- approved Conflux network, wallet provider and staking contract;
- DNS, TLS and canonical URL for each regional target.

Never commit credentials or private keys. A profile URL alone enables a public
social link; provider credentials are required for automatic live feed posts.

## Release checklist

- [ ] The branch follows `ARCHITECTURE.md` and `REGIONAL-ONBOARDING.md`.
- [ ] The design is distinct and no shared page was copied.
- [ ] `npm test` passes.
- [ ] Text/background, surface/text and button pairs meet WCAG AA.
- [ ] Module visibility matches the questionnaire.
- [ ] Manager writes are scoped to the authenticated deployment/region.
- [ ] Draft and published Markdown articles work.
- [ ] Canonical metadata and X, Telegram, copy and Discord sharing work.
- [ ] Enabled social feeds report `Feed live`.
- [ ] Staking network and contracts are approved and allowlisted.
- [ ] Secrets are stored only in the hosting provider.
- [ ] `DATABASE_PATH` points to a backed-up persistent volume.
- [ ] Existing content is backed up, imported and checked before cutover.
- [ ] `npm run db:init` succeeds before manager writes are enabled.
- [ ] `NEXT_PUBLIC_SITE_URL` matches the final domain.
- [ ] Rollback is tested on one regional target before a broad release.
