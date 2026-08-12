# Credit Count

Credit Count is a secure, responsive web application for rollercoaster enthusiasts to log individual rides, track unique coaster credits, explore personal statistics, and optionally appear on a public leaderboard.

This repository contains the delivery implementation for the Koin Limited AI Product Engineer candidate assessment. The product is fictional and is not affiliated with a commercial Koin product.

## Status

Pre-build design approved. Implementation will follow the security-first tracer-bullet tickets defined during project planning.

## Planned stack

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

Setup and verification instructions will be added with the application scaffold.
