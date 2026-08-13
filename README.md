# Credit Count

Credit Count is a secure, responsive web application for rollercoaster enthusiasts to log individual rides, track unique coaster credits, explore personal statistics, and optionally appear on a public leaderboard.

This repository contains the delivery implementation for the Koin Limited AI Product Engineer candidate assessment. The product is fictional and is not affiliated with a commercial Koin product.

## Status

In progress. Authentication, ride logging, personal statistics, history management, the opt-in public leaderboard, and catalogue administration are implemented and verified against a live Supabase project. Deployment and the final design reconciliation follow.

## Stack

- Next.js 16 and TypeScript
- Node.js 22
- Supabase Auth and Postgres
- Vercel
- Playwright and direct Supabase Data API tests

## Design

The pre-build Technical Design Document is available at [docs/TDD.md](docs/TDD.md). It will be reconciled with the deployed implementation before submission so any design changes or SOW deviations remain explicit.

## Delivery plan

- [Requirements](docs/requirements.md) — observable, testable outcomes traced from the SOW.
- [Roadmap](docs/roadmap.md) — dependency-ordered outcome phases.
- [Implementation tickets](docs/tickets/) — vertical slices with blockers, acceptance criteria, and requirement coverage.

These documents are the implementation source of truth and will be updated when delivered behavior changes.

## Security priorities

- Database-enforced private ride histories
- Explicit grants and operation-specific Row Level Security
- Admin-only catalogue mutation without access to users' rides
- A narrowly scoped anonymous leaderboard interface
- No elevated database keys or reviewer credentials in source control

## Setup

Requires Node.js 22 (see `.nvmrc`) and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
nvm use            # Node 22
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project URL and **publishable** key
(`Project Settings → API`). The application never needs a service-role key or
database credential — Row Level Security is the authorization boundary, so the
client is only ever trusted with what an anonymous caller may already see.

Apply the database schema, grants, policies, and seed catalogue:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Then create the test identities and grant the admin claim:

```bash
node scripts/create-test-users.mjs
supabase db query --linked \
  "update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{\"is_admin\": true}'::jsonb
   where email = '<admin email>';"
```

Administrator status lives only in `app_metadata`, which users cannot edit
through the auth API. It takes effect on the account's next token refresh.

```bash
npm run dev
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm test            # unit, then direct-API, then browser flows
```

The individual suites are `test:unit`, `test:api`, and `test:e2e`. Run them
through `npm test` rather than in parallel: the direct-API and browser suites
share the same demo accounts, and the browser suite resets that account's rides
between flows, so overlapping runs would destroy each other's fixtures.

`test:api` deliberately authenticates with the publishable key alone, so it can
only prove what a real Data API caller can reach. It is the primary security
evidence; the browser flows prove the visible SOW behavior.

`tests/e2e/journeys.spec.ts` holds the two flows the assessment asks for — the
visitor/enthusiast happy path and administrator catalogue management — and both
run at desktop and phone viewports. The other browser specs are narrower
regressions around them.

Supabase caps password sign-ins at 30 per five minutes per IP address. A full
`npm test` run sits under that, but two runs in quick succession can trip it and
surface as `Request rate limit reached`; wait a few minutes and re-run.

Supabase's own linter should also stay clean:

```bash
supabase db advisors --linked --type security
```
