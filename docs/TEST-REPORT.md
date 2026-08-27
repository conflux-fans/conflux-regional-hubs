# Test report

Date: 2026-08-27

## Automated evidence

- `npm run lint` — passed with zero errors and zero warnings.
- TypeScript/Node test suite — passed 17/17 tests.
- Next.js production build — passed, including TypeScript validation and native `sqlite3` bundling.
- Production server smoke test — `/`, `/login`, and the unauthenticated `/studio` login screen returned HTTP 200.
- SQLite migration command — passed against SQLite 3.52.0; repeated runs retain one applied migration.

## Tested contracts

1. Public application renders with the required development metadata.
2. Questionnaire remains public and separate from the authenticated manager.
3. Generated regional prompt enforces one repository and reference fidelity.
4. Kudi Hub identity, palette, journal name, and all four contributors are present.
5. Markdown toolbar, preview, draft save/reopen flow, publishing, and canonical metadata exist in the production path.
6. X, Telegram, Discord, and copy-link destinations are wired to the canonical article URL.
7. Instagram and X profile sources normalize to clickable public URLs.
8. YouTube Atom, X API v2, and Instagram Graph API fixture responses normalize into the shared social-card format.
9. Multiple configured administrators authenticate only with their own PBKDF2 password hashes.
10. SQLite migrations create the expected tables and indexes in a temporary database file.
11. Regional content and article drafts persist and can be read back from SQLite.

## Production-only tests remaining

These require credentials or infrastructure the package cannot safely invent: production administrator credentials and login rate limits, live Instagram/X provider tokens and rate limits, persistent media storage, final DNS/Open Graph crawler validation, scheduled SQLite backup/restore validation, real wallets, audited staking contracts, and onchain transaction/security testing.
