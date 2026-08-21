# Conflux Regional Hubs

One deployable platform repository for every current and future Conflux regional
hub. The repository shares product behavior—not one fixed visual website.

Shanghai Crypto and Kudi Hub are **reference implementations only**. A new
questionnaire response must create its own regional presentation: composition,
hero treatment, typography, section order, visual assets, language and module
choices. It must not copy either example or merely recolor one of them.

## What is shared and what is regional

| Shared once in this repository | Generated for each region |
| --- | --- |
| Manager authentication and permissions | Logo and approved brand assets |
| Markdown Journal editor and publishing | Theme tokens and contrast-safe color pairs |
| Stable article URLs and social sharing | Typography and spacing character |
| Instagram, X and YouTube adapters | Hero layout and visual treatment |
| Database schema and migrations | Homepage section order and variants |
| Staking integration boundary | Regional copy, languages and contributors |
| Accessibility and responsive primitives | Module states and local navigation labels |

See `ARCHITECTURE.md` for the code boundary and `REGIONAL-ONBOARDING.md` for
the exact questionnaire-to-deployment workflow.

## Included references

- `china` — Shanghai Crypto: split skyline/editorial reference
- `africa` — Kudi Hub: stacked monogram/community reference
- `config/region-template.ts` — neutral typed schema example, not a visual template

## Requirements and local setup

- Node.js 22.13 or newer
- npm 10 or newer

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Set `NEXT_PUBLIC_REGION_SLUG=china` or `africa` in `.env.local`. Every
production regional target sets its own slug, canonical URL, database and
secrets while building the same repository commit.

## Add a regional hub

1. Send the leader the [Regional Website Creator questionnaire](https://conflux-community-hub.christian-oertel.chatgpt.site).
2. Collect the generated website prompt and logo prompt.
3. Add the implementation guardrail from `REGIONAL-ONBOARDING.md` before that prompt.
4. Create a short-lived branch in this repository; never create another hub repository.
5. Add a typed region entry, presentation choices and approved assets.
6. Reuse shared behavior. Add a new reusable presentation variant only when the approved design needs one.
7. Run `npm test`, review desktop/mobile, merge, and deploy one target for that region.

## Commands

```bash
npm run dev
npm run build
npm test
npm run lint
npm run package:source
```

The build produces a Cloudflare Worker-compatible application in `dist/`.

## Repository map

- `app/` — shared routes and product behavior
- `app/home-sections.tsx` — config-driven homepage section registry
- `app/manager/` — authenticated Markdown editor and connections
- `app/api/` — publishing and normalized social-feed endpoints
- `config/region-types.ts` — neutral regional contract
- `config/regions.ts` — registered reference and production regions
- `config/region-template.ts` — neutral schema example
- `public/brand/` — approved assets, organized by region for production additions
- `drizzle/` — shared database migrations
- `tests/` — publishing, sharing, provider, rendering and architecture checks
- `DEPLOYMENT.md` — production target and release instructions

## Connections deliberately not included

Secrets, domains and production contract addresses are not committed. The
developer must add the values documented in `.env.example`: manager access,
D1, Instagram, X, YouTube, canonical domain, wallet provider and approved
staking contract. Social profile links work without API credentials; live feed
posts require provider credentials.
