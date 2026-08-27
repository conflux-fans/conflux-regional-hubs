# Developer handoff

## Outcome

This package is the deploy-ready shared Conflux Regional Hubs application. Kudi Hub is the approved Africa implementation and design example. Future regional sites are new deployment targets from this repository—not new repositories and not copies of Kudi Hub.

## Start here

```bash
npm ci
npm test
npm run validate:artifact
```

For local development, run `npm run dev`. The important routes are `/`, `/insights`, `/journal/[slug]`, `/stake`, `/questionnaire`, `/studio`, `/studio/submissions`, `/demo`, and `/handoff`.

## Deploy Kudi Hub

1. Create a deployment target backed by this repository.
2. Set `NEXT_PUBLIC_REGION_SLUG=africa` and `NEXT_PUBLIC_SITE_URL=https://kudihub.com`.
3. Create a dedicated D1 database and apply every SQL file under `drizzle/` in numeric order.
4. Bind the database as `DB`.
5. Set the regional editor allowlist with `REGIONAL_EDITOR_EMAILS`.
6. Add the social credentials listed in `.env.example` if automatic Instagram/X feeds are required. The supplied account links remain functional before credentials are connected.
7. Add storage before enabling image uploads.
8. Do not enable staking writes until the blockchain team supplies audited contracts and completes security review.
9. Attach DNS, confirm HTTPS, and validate canonical/Open Graph URLs using the final domain.

## Turn the next questionnaire prompt into a site

1. Keep the shared routes, database schema, manager, Markdown publisher, social adapters, accessibility behavior, and staking boundary unchanged.
2. Add the region to `config/regions.ts` and its complete presentation/content entry to `app/regional.ts`.
3. Add code-owned regional assets under `public/brand/<slug>` and any presentation-specific CSS/components.
4. Add default contributors and module states. Visible data can later be changed by a manager.
5. Add tests for the new configuration and verify desktop/mobile contrast.
6. Create a separate deployment target from this repository with that region’s `NEXT_PUBLIC_REGION_SLUG`, `NEXT_PUBLIC_SITE_URL`, D1 database, domain, secrets, and editor allowlist.

## Kudi Hub acceptance status

- Instagram: supplied profile is visible and clickable. Official automatic media ingestion activates with `INSTAGRAM_ACCESS_TOKEN`.
- X: supplied profile is visible and clickable. Official automatic post ingestion activates with `X_BEARER_TOKEN`.
- YouTube: hidden by default. It becomes a public automatic feed when enabled with a valid `/channel/UC…` URL.
- Journal: Markdown headings, bold, italic, links, lists, quotes and code are supported; drafts can be saved/reopened; publishing produces a stable URL.
- Sharing: every published article has canonical/Open Graph metadata plus clickable X, Telegram, Discord handoff, and copy-link actions.
- Staking: the reviewed UI and integration boundary are present. Production contract calls are intentionally not included.

## Do not do these things

- Do not create a repository for each region.
- Do not put social access tokens, editor authorization, or contract secrets in client code.
- Do not connect an unaudited staking contract.
- Do not treat the public manager demo as production persistence.
- Do not modify another region’s presentation while implementing a new questionnaire prompt.
