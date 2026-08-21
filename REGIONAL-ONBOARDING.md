# Regional onboarding: questionnaire to one shared repository

## Operating model

1. Send the regional leader the questionnaire:
   <https://conflux-community-hub.christian-oertel.chatgpt.site>
2. Receive two outputs: the website implementation prompt and logo prompt.
3. Create the logo assets and obtain approval.
4. Create a short-lived branch such as `region/latam` in this repository.
5. Give the developer or coding agent the guardrail below followed by both
   generated prompts.
6. Implement a new regional definition and approved assets. Select or extend
   the presentation variants required by the prompt.
7. Review with `NEXT_PUBLIC_REGION_SLUG=<slug>`, run `npm test`, and check
   desktop/mobile, keyboard use and contrast.
8. Merge the branch, then create a separate deployment target from that same
   main-branch commit.

## Guardrail to prepend to every generated prompt

> Implement this hub inside the existing Conflux Regional Hubs repository.
> Shanghai Crypto and Kudi Hub are reference examples only; do not copy either
> layout and do not merely recolor an example. Translate the approved
> questionnaire into a distinct regional presentation using the typed schema,
> section registry and approved regional assets. Keep authentication, manager,
> Journal publishing, article sharing, social adapters, database and staking
> boundaries in shared code. Add a reusable presentation variant when the
> approved design cannot be represented by existing variants. Do not create a
> new repository or duplicate shared pages. Preserve all existing regions and
> make the full test suite pass.

## Prompt-to-code map

| Questionnaire output | Destination |
| --- | --- |
| Region, languages, site name and domain | Regional definition in `config/regions.ts` |
| Palette | Contrast-safe pairs in `theme` |
| Personality and references | Typography, hero, page and section variants |
| Homepage priority | `presentation.home.sectionOrder` |
| Local labels and introductions | Regional copy fields |
| Logo and visual assets | `public/brand/<region-slug>/` |
| Contributors | Regional config, manager-editable after launch |
| Use now / Set up later / Not needed | Regional `modules` states |
| New visual treatment | New reusable variant in shared registry/CSS |
| Journal, social, sharing or staking behavior | Shared code only |

## Required developer decisions per region

- unique slug and final canonical domain;
- approved light/dark logo assets and favicon;
- contrast-safe color pairs, not isolated color values;
- hero layout/visual and section/page variants;
- section order that matches the stated homepage priority;
- module states and connection ownership;
- languages, locale metadata and translation scope;
- manager access list, database, storage and provider secrets;
- approved network, wallet and staking contracts.

## Acceptance checklist

- [ ] The result is recognizably designed from the new prompt, not Shanghai or Kudi.
- [ ] Only one application repository is used.
- [ ] Shared routes, APIs, manager and database code were not copied.
- [ ] All visible regional text is in the regional definition or manager content.
- [ ] `Use now`, `Set up later` and `Not needed` states behave correctly.
- [ ] Journal draft, Markdown preview, publish and article URL work.
- [ ] X and Telegram links contain the exact canonical article URL.
- [ ] Copy link works; Discord opens only after copying the article URL.
- [ ] Social profiles open and configured feeds report `Feed live`.
- [ ] Desktop/mobile contrast, typography, keyboard and touch checks pass.
- [ ] The deployment has its own slug, canonical URL, D1 binding and secrets.
- [ ] `npm test` passes before merge and release.
