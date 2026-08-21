# Architecture: one platform, many distinct regional websites

## Core rule

One repository does not mean one visual template. It means one maintained
product core with multiple region-specific presentation definitions.

Shanghai Crypto and Kudi Hub are examples used to prove that the same Journal,
manager, social, database and staking foundations can support different visual
systems. Neither example is the default design for future hubs.

## Boundaries

### Shared product core

Keep these in shared code:

- authentication, authorization and manager navigation;
- Markdown parsing, preview, drafts, publishing and article routes;
- canonical metadata and X, Telegram, Discord/copy sharing behavior;
- Instagram, X and YouTube API adapters and diagnostics;
- contributor data behavior and accessible modal interaction;
- database schema, migrations and storage contracts;
- staking wallet/contract boundary;
- responsive, keyboard, touch-target and contrast tests.

### Regional presentation

Put these in a typed region definition or approved regional assets:

- identity, languages, logo and local marks;
- background/text pairs, surfaces, primary actions and dark-mode pairs;
- body/display typography and corner character;
- hero composition and artwork treatment;
- homepage section order;
- section variants for Journal, Stake, contributors and social channels;
- Journal and Stake page variants;
- all visible labels, introductions, profiles and module states.

`config/region-types.ts` is the contract. `config/regions.ts` registers regions.
`app/home-sections.tsx` maps descriptors to shared, tested section renderers.

## When a generated prompt needs a new design

1. First express the approved direction through tokens, copy, section order and
   existing presentation variants.
2. If those cannot faithfully represent the prompt, add a new named reusable
   variant to the union in `config/region-types.ts` and implement it in the
   shared section registry/CSS.
3. Do not add local words, colors or assets to a shared component.
4. Do not copy `app/page.tsx`, Journal, manager, APIs or database code.
5. Preserve every registered region and run the architecture tests.

This permits genuinely different regional websites while keeping fixes to
publishing, social APIs, sharing and security centralized.

## Deployment topology

Every region gets a separate deployment target and domain, all tracking the
same main branch. Per-target environment values select the region and isolate
its canonical URL, database, credentials and rollback history.

| Setting | Shared or per region |
| --- | --- |
| Git repository and application code | Shared |
| `NEXT_PUBLIC_REGION_SLUG` | Per region |
| `NEXT_PUBLIC_SITE_URL` and domain | Per region |
| D1 database | Per region recommended |
| Social API credentials | Per region |
| Staking network/contracts | Per region or centrally allowlisted |

## Non-negotiable checks

- No locality names in shared homepage renderers.
- Background/text, surface/text and primary/action pairs meet WCAG AA for normal text.
- Every homepage section appears at most once and respects its module state.
- `Set up later` remains hidden until a valid source is connected.
- Every registered region passes the same publishing, sharing and provider tests.
- New presentation work stays in this repository and does not fork the product core.
