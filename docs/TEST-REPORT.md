# Test report

Date: 2026-08-27

## Automated evidence

- `npm run lint` — passed with zero errors and zero warnings.
- `npm test` — passed 9/9 tests.
- Vinext production build — passed.
- Sites Worker artifact validation — passed; ESM `default.fetch` and hosting manifest present.

## Tested contracts

1. Public application renders with the required development metadata.
2. Questionnaire remains public and separate from the authenticated manager.
3. Generated regional prompt enforces one repository and reference fidelity.
4. Kudi Hub identity, palette, journal name, and all four contributors are present.
5. Markdown toolbar, preview, draft save/reopen flow, publishing, and canonical metadata exist in the production path.
6. X, Telegram, Discord, and copy-link destinations are wired to the canonical article URL.
7. Instagram and X profile sources normalize to clickable public URLs.
8. YouTube Atom, X API v2, and Instagram Graph API fixture responses normalize into the shared social-card format.

## Production-only tests remaining

These require credentials or infrastructure the package cannot safely invent: authenticated email delivery/allowlists, live Instagram/X provider tokens and rate limits, R2 upload/storage, final DNS/Open Graph crawler validation, real wallets, audited staking contracts, and onchain transaction/security testing.
