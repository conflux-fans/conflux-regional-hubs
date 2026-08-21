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
6. Apply `drizzle/0000_regional_content.sql` to that region's D1 database.
7. Build with `npm run build` and deploy the resulting Worker.
8. Attach the regional domain and verify canonical redirects/metadata.
9. Test `/`, `/journal`, a published article, `/stake`, `/manager` and `/handoff` on desktop and mobile.
10. In Manager → Connections, verify every enabled provider reports `Feed live`.

The included adapter targets Cloudflare Workers through Vinext. On another
Next-compatible provider, preserve the shared `app/`, `config/`, `lib/`,
database and test boundaries and replace only the hosting adapter.

## Production connections

- host-provided sign-in and optional `MANAGER_ALLOWED_EMAILS`;
- D1 and the shared migration;
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
- [ ] The D1 migration is applied before manager writes are enabled.
- [ ] `NEXT_PUBLIC_SITE_URL` matches the final domain.
- [ ] Rollback is tested on one regional target before a broad release.
