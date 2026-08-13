# Credit Count

Credit Count is a secure, responsive web application for rollercoaster enthusiasts to log individual rides, track unique coaster credits, explore personal statistics, and optionally appear on a public leaderboard.

This repository contains the delivery implementation for the Koin Limited AI Product Engineer candidate assessment. The product is fictional and is not affiliated with a commercial Koin product.

## Status

In progress. Ticket 01 (authentication and the private-by-default data boundary) is implemented and verified against a live Supabase project; ride logging, statistics, the leaderboard, and catalogue administration follow.

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
npm run test:api    # direct Supabase Data API access-matrix suite
npm run test:e2e    # Playwright flows, desktop and phone viewports
```

`test:api` deliberately authenticates with the publishable key alone, so it can
only prove what a real Data API caller can reach. It is the primary security
evidence; the browser flows prove the visible SOW behavior.

Supabase's own linter should also stay clean:

```bash
supabase db advisors --linked --type security
```
