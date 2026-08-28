# Test report

Date: 2026-08-28

## Automated evidence

- `npm run lint` — passed with zero errors; one pre-existing navigation warning remains in `app/components/sign-out-button.tsx`.
- TypeScript/Node test suite — passed 39/39 tests.
- Next.js webpack production build — passed, including TypeScript validation and native `sqlite3` bundling. A Turbopack rerun was blocked by the verification sandbox denying its CSS worker a temporary loopback port; the same Turbopack build had passed before the review fixes.
- Production server smoke test — `/`, `/login`, and the unauthenticated `/studio` login screen returned HTTP 200.
- SQLite migration command — passed against SQLite 3.52.0; repeated runs retain one applied migration.
- Default-off and explicitly enabled staking production builds — passed.
- Next.js was upgraded to the 16.3.3 security release; `npm audit --omit=dev` reports zero vulnerabilities.
- `npm run staking:verify` — passed read-only mainnet checks for chain 1030, proxy code, approved EIP-1967 implementation, bridge readiness, periods, pool/user reads, and paginated queues.
- Enabled `/stake` HTTP smoke test — returned 200 with pool metrics, network disclosure, wallet fallback, and risk content. A connected browser instance was unavailable, so screenshot-based desktop/mobile QA remains manual.

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
12. CFX/Drip/votePower conversion remains exact at large `bigint` values and rejects invalid or overflowing input.
13. User assets derive redeemable principal from `locked`, current stake from `available`, and withdrawable principal from both unlocked votes and pool liquidity.
14. The adapter sends native value only with `increaseStake` and blocks writes on unexpected chain, proxy target, implementation, bridge state, or required read failure.
15. Wallet account/network/disconnect events invalidate the old wallet generation; transaction states retain hashes through unknown receipts and only recover wallet replacements with a definite replacement receipt.
16. Stake affordability includes the actual 120% gas limit, and malformed pool metrics degrade their own card while disabling writes.
17. Amount inputs expose accessible validation relationships, and the narrow-screen staking layout retains its single-column breakpoint.
18. Queues paginate in groups of 50, sort by end block, and determine maturity from the current block.

## Production-only tests remaining

These require credentials or infrastructure the package cannot safely invent: production administrator credentials and login rate limits, live Instagram/X provider tokens and rate limits, persistent media storage, final DNS/Open Graph crawler validation, scheduled SQLite backup/restore validation, connected-browser screenshot QA, security approval, real-wallet small-value staking transactions, and onchain rollback testing.
