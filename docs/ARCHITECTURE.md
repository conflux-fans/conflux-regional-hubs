# Architecture

## One source, separate regional deployments

The repository contains one shared application core and multiple typed regional configurations. Each regional domain is a separate deployment target with its own environment, D1 database, secrets, storage, editor allowlist, and domain. This prevents content or credentials from leaking between regions while keeping maintenance in one repository.

## Ownership boundaries

| Layer | Owner | Location |
|---|---|---|
| Shared routes and behavior | Core developers | `app/` |
| Deployment registry | Core developers | `config/regions.ts` |
| Regional presentation/copy defaults | Core + approved brief | `app/regional.ts` |
| Regional logo/assets | Core developers | `public/brand/<slug>/` |
| Visible copy, contributors, modules | Regional managers | D1 through `/studio` |
| Journal drafts/articles | Regional authors | D1 through `/studio` |
| Social credentials | Deployment team | Secret manager |
| Staking contracts | Blockchain/security team | Deployment configuration and reviewed integration |

## Data flow

- Public pages resolve the deployment region, then merge code-owned defaults with manager-owned D1 content.
- Journal drafts and publications use the same article record and slug; publishing does not replace the URL.
- Social adapters fetch only on the server, cache provider responses, and fall back to the configured public profile link if credentials or a provider are unavailable.
- Authentication is checked server-side before any manager mutation.
