# Kudi Hub / Conflux Regional Hubs

This is the single shared repository for Kudi Hub and future Conflux regional websites. Kudi Hub is the approved Africa implementation; future questionnaire prompts add a regional configuration, presentation, and assets while preserving the shared product core.

## What to open

- `/` — public Kudihub example
- `/questionnaire` — public Regional Website Creator for regional leaders; no manager access required
- `/demo` — safe, public manager training experience. Use any email and demo code `246810`; data stays in that browser.
- `/studio` — protected post-deployment manager using authenticated identity, a D1 database, and `REGIONAL_EDITOR_EMAILS`.
- `/insights` and `/journal/[slug]` — published Journal
- `/stake` — staking UX and production integration boundary
- `/handoff` — public developer handoff and deploy-ready ZIP

The public demo is deliberately simulated. Production managers use `/studio` after the deployment team connects the chosen email authentication provider and editor allowlist.

## Run and validate

Requirements: Node.js 22.13+ and npm.

```bash
npm ci
npm run dev
npm run lint
npm run build
```

## Regional customization

The shared behavior lives in `app/`. The deployment registry lives in `config/regions.ts`. Initial regional content and design tokens live in `app/regional.ts`. The Kudi Hub logo masters and exports live in `public/brand/kudi-hub/`. Manager-editable content and module defaults live in `app/lib/content.ts`.

Create a new region by preserving the routes and data interfaces, replacing the regional identity/assets, and keeping Journal + Stake as core modules. Optional modules may be `live`, `set up later`, or excluded. Production visual code remains developer-controlled; managers edit content and module settings.

## Production handoff

Start with [docs/DEVELOPER-HANDOFF.md](docs/DEVELOPER-HANDOFF.md), then use [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Architecture and the questionnaire-to-deployment workflow are documented in `docs/ARCHITECTURE.md` and `docs/REGIONAL-ONBOARDING.md`.

## Safety boundary

No production wallet transaction is signed by the template. Contract addresses, network configuration, transaction simulation, error handling, and audited staking calls must be supplied and reviewed by the development team before launch.
