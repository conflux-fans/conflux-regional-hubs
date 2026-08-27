# Kudi Hub / Conflux Regional Hubs

This is the single shared repository for Kudi Hub and future Conflux regional websites. Kudi Hub is the approved Africa implementation; future questionnaire prompts add a regional configuration, presentation, and assets while preserving the shared product core.

## What to open

- `/` — public Kudihub example
- `/questionnaire` — public Regional Website Creator for regional leaders; no manager access required
- `/demo` — safe, public manager training experience. Use any email and demo code `246810`; data stays in that browser.
- `/login` — application-owned manager email/password login.
- `/studio` — protected post-deployment manager using a signed server session and SQLite.
- `/insights` and `/journal/[slug]` — published Journal
- `/stake` — staking UX and production integration boundary
- `/handoff` — public developer handoff and deploy-ready ZIP

The public demo is deliberately simulated. Production managers use `/studio` with the server-side administrator credentials configured for that regional deployment.

## Run and validate

Requirements: Node.js 22.13+ and npm.

```bash
npm ci
npm run db:migrate
npm run auth:setup
npm run dev
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` first. `SQLITE_PATH` selects the database file and defaults to `./data/app.db`; `npm run db:migrate` creates it and applies every pending migration. The app also checks migrations when the server first opens the database.

`npm run auth:setup` prompts for one or more administrator email/password pairs, then prints an `ADMIN_CREDENTIALS_JSON` list containing independent PBKDF2 password hashes and a random `AUTH_SESSION_SECRET`. Add them to `.env.local` for development and to the hosting platform's secret manager for production. Up to 20 unique administrator accounts are supported. Never store plaintext passwords in an environment file.

Production requires a persistent Node.js server and a persistent disk for `SQLITE_PATH`. Do not deploy the SQLite build to an ephemeral/serverless filesystem or share one database file between multiple machines.

## Regional customization

The shared behavior lives in `app/`. The deployment registry lives in `config/regions.ts`. Initial regional content and design tokens live in `app/regional.ts`. The Kudi Hub logo masters and exports live in `public/brand/kudi-hub/`. Manager-editable content and module defaults live in `app/lib/content.ts`.

Create a new region by preserving the routes and data interfaces, replacing the regional identity/assets, and keeping Journal + Stake as core modules. Optional modules may be `live`, `set up later`, or excluded. Production visual code remains developer-controlled; managers edit content and module settings.

## Production handoff

Start with [docs/DEVELOPER-HANDOFF.md](docs/DEVELOPER-HANDOFF.md), then use [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Architecture and the questionnaire-to-deployment workflow are documented in `docs/ARCHITECTURE.md` and `docs/REGIONAL-ONBOARDING.md`.

## Safety boundary

No production wallet transaction is signed by the template. Contract addresses, network configuration, transaction simulation, error handling, and audited staking calls must be supplied and reviewed by the development team before launch.
