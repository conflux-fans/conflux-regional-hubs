# Architecture

## One source, separate regional deployments

The repository contains one shared application core and multiple typed regional configurations. Each regional domain is a separate persistent Node.js deployment target with its own environment, SQLite file/volume, secrets, storage, administrator list, and domain. This prevents content or credentials from leaking between regions while keeping maintenance in one repository.

## Ownership boundaries

| Layer | Owner | Location |
|---|---|---|
| Shared routes and behavior | Core developers | `app/` |
| Deployment registry | Core developers | `config/regions.ts` |
| Regional presentation/copy defaults | Core + approved brief | `app/regional.ts` |
| Regional logo/assets | Core developers | `public/brand/<slug>/` |
| Visible copy, contributors, modules | Regional managers | SQLite through `/studio` |
| Journal drafts/articles | Regional authors | SQLite through `/studio` |
| Social credentials | Deployment team | Secret manager |
| Staking contracts | Blockchain/security team | Deployment configuration and reviewed integration |

## Data flow

- Public pages resolve the deployment region, then merge code-owned defaults with manager-owned SQLite content.
- Journal drafts and publications use the same article record and slug; publishing does not replace the URL.
- Social adapters fetch only on the server, cache provider responses, and fall back to the configured public profile link if credentials or a provider are unavailable.
- Authentication is checked server-side before any manager mutation.
- Staking copy and presentation remain regional, while chain ID, proxy/implementation allowlists, units, minimal ABI, transaction state, and wallet calls stay in the shared `app/lib/staking/` core. The feature flag fails closed before any wallet write request.

The `sqlite3` adapter opens the file configured by `SQLITE_PATH`, enables foreign keys and WAL journaling, and automatically applies the ordered SQL files in `db/migrations/`. Database work is serialized inside the Node.js process. Each file is owned by one application instance; horizontal scaling requires moving to a client/server database.
