# Credit Count

Credit Count is a secure, responsive web application for rollercoaster enthusiasts to log individual rides, track unique coaster credits, explore personal statistics, and optionally appear on a public leaderboard.

This repository contains the delivery implementation for the Koin Limited AI Product Engineer candidate assessment. The product is fictional and is not affiliated with a commercial Koin product.

## Status

Complete and deployed at **https://credit-count-one.vercel.app**.
Authentication, ride logging, personal statistics, history management, the
opt-in public leaderboard, and catalogue administration are implemented and
verified against production.

The leaderboard is public — it is the one page a signed-out visitor can see.

## Stack

- Next.js 16 and TypeScript
- Node.js 22
- Supabase Auth and Postgres
- Vercel
- Playwright and direct Supabase Data API tests

## Design

- [Technical Design Document](docs/TDD.md) — reconciled with the deployed
  system. Section 7 lists every assumption, trade-off, and SOW deviation.
- [Review brief](docs/review-brief.md) — demonstration order, the security model
  in brief, and where the design would go next.

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

## Deployment

The application is deployed on Vercel from this repository's `main` branch.

- Node is pinned to 22 in `package.json` `engines` and in the Vercel project's
  runtime setting, so production matches local.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
  configured as environment variables. There is no service-role key anywhere in
  the deployment.
- Supabase `site_url` and the redirect allow-list point at the production origin
  (`supabase/config.toml`, applied with `supabase config push`).

The browser suite can be pointed at any deployment, which is how the production
release is verified:

```bash
E2E_BASE_URL=https://credit-count-one.vercel.app npm run test:e2e
```

Because no Client Component constructs a Supabase browser client — every read
and write happens in a Server Component or server action — the publishable key
does not appear in the deployed browser bundle at all.
