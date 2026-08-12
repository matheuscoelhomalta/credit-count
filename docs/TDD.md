# Credit Count — Technical Design Document

**Status:** Pre-build design draft
**Date:** 12 August 2026
**Milestone:** Submission-ready v1
**Stack:** Next.js 16, TypeScript, Node.js 22, Supabase, Vercel

## 1. Purpose and scope

Credit Count is a responsive web application for rollercoaster enthusiasts to record individual rides, see their unique coaster credit count and related statistics, and optionally appear on a public leaderboard. The v1 must be small enough to deliver within the assessment's eight-hour cap while satisfying the SOW's security and acceptance criteria.

The system supports three roles:

- **Visitor:** can view the public leaderboard and sign up, but cannot access catalogue, profile, ride, or coaster-level history data.
- **Enthusiast:** can browse active coasters, log repeat rides, manage only their own ride history, view private statistics, and control leaderboard participation.
- **Admin:** can maintain the shared coaster catalogue but receives no access to other users' private rides or statistics.

The milestone excludes live RCDB integration, native applications, historic imports, commercial features, custom password-reset behavior, and localisation. The catalogue will instead be seeded with approximately 30–50 real coasters.

## 2. Architecture

The application will use the Next.js App Router on Node.js 22 and deploy to Vercel. Supabase will provide email/password authentication, Postgres, the Data API, and all authoritative access control.

`@supabase/ssr` will provide separate browser and server clients. A root `proxy.ts` will refresh authentication tokens and support optimistic redirects, but it will not authorize data access. Server Components will handle authenticated reads by default; small Client Components or server actions will handle interactive mutations where appropriate.

The browser and server application runtime require only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No secret/service-role key or database credential will be used by the deployed application. Database migrations will define schema, constraints, functions, grants, and Row Level Security together so the security model is reproducible and reviewable.

## 3. Data design

| Entity | Important fields | Purpose |
|---|---|---|
| `profiles` | `user_id`, `display_name`, `leaderboard_opt_in` | Application profile linked to Supabase Auth; leaderboard participation defaults to false. |
| `coasters` | `id`, `name`, `park`, `country`, `manufacturer`, `type`, `active` | Shared catalogue. `active = false` represents admin removal without destroying history. |
| `rides` | `id`, `user_id`, `coaster_id`, `ridden_on`, `note`, timestamps | One row per ride. Repeat rides are retained; `user_id` and `coaster_id` are immutable to the enthusiast. |

A credit is calculated as `count(distinct coaster_id)` for a user's rides. Total rides count every ride row. Country, manufacturer, and type statistics join distinct ridden coasters to catalogue attributes; the most-ridden coaster counts all ride rows per coaster.

Coaster deletion is restricted when history references it. Admin “remove” therefore means soft retirement. Retired coasters disappear from normal browsing and cannot receive new or reassigned rides, while existing rides remain visible to their owner, continue contributing to statistics, and allow edits to date or note.

## 4. Security and privacy model

Object grants and RLS jointly form the authorization boundary. Grants determine which database objects a Data API role can reach; operation-specific RLS policies determine which rows it may read or mutate. Every exposed base table will have RLS enabled, and migrations will grant only the operations needed by `anon` and `authenticated`.

### Private rides

Authenticated ride policies compare `auth.uid()` with `rides.user_id` for every operation:

- `SELECT` and `DELETE` use an ownership predicate.
- `INSERT` uses an ownership `WITH CHECK` plus an active-coaster check.
- `UPDATE` uses ownership in both `USING` and `WITH CHECK`.
- Column privileges prevent enthusiasts from changing `user_id` or `coaster_id`; only date and note are editable.

No special admin policy exists for rides. Admins therefore have the same owner-only ride access as enthusiasts.

### Catalogue administration

Admin status will be assigned manually in Supabase `app_metadata`, which users cannot edit themselves. Catalogue mutation policies will check this claim; ordinary enthusiasts receive active-catalogue read access only. Role changes take effect after the user's JWT refreshes, an accepted v1 trade-off that avoids a separate live role table and privileged lookup function.

### Public leaderboard

Anonymous callers receive no base-table privileges. The sole public data interface is a fixed, zero-argument SQL function returning only `display_name` and distinct `credit_count` for opted-in profiles.

This narrow `SECURITY DEFINER` exception will:

- fully qualify every object and set an empty safe `search_path`;
- use fixed SQL with no dynamic input;
- return declared scalar columns rather than base-table row types;
- revoke default `PUBLIC` execution and grant only the exact signature to `anon` and `authenticated`;
- exclude user IDs, ride IDs, dates, notes, coaster identities, and coaster-level history.

Opting out updates the profile row and removes that user from the next leaderboard response.

## 5. User flows

1. A visitor views the leaderboard or signs up with email, password, and display name.
2. The new profile is private by default. After authentication, the enthusiast reaches the dashboard.
3. From the dashboard, the enthusiast searches or browses active coasters and records a ride with date and optional note in no more than three interactions.
4. The dashboard refreshes its derived credit count, ride count, required breakdowns, and most-ridden coaster without a separate user refresh step.
5. The enthusiast edits or deletes their own history and may opt into or out of public ranking.
6. An admin uses a separate catalogue interface to add, edit, or retire coasters without receiving broader ride access.

The interface will be English-only and responsive at desktop and phone widths. Visual work will target a coherent, intentional product rather than additional features.

## 6. Verification strategy

The highest-risk behavior is authorization bypass through the Data API, so testing prioritizes security evidence over broad component coverage.

An automated direct-API suite will act as anonymous, enthusiast A, enthusiast B, and admin. It will verify:

- anonymous access is limited to the two leaderboard output fields;
- cross-user ride reads, edits, deletes, forged ownership, bulk mutation, and ownership reassignment fail;
- enthusiasts cannot mutate catalogue data while refreshed admins can;
- admins still cannot access another user's rides or statistics;
- nonexistent or retired coasters reject new/repointed rides;
- opt-out removes leaderboard visibility and repeat rides do not inflate credits;
- object grants, function privileges, and RLS behave as designed.

Two focused Playwright flows will prove the visible SOW:

1. Visitor and enthusiast: leaderboard, sign-up/sign-in, three coasters plus a repeat ride, correct statistics, history management, and leaderboard opt-in/out.
2. Admin: sign-in, catalogue creation/editing/retirement, and preservation of historical ride behavior.

Both flows will be checked at desktop and phone-sized viewports. The final direct-API and browser suites will run against deployed behavior before submission.

## 7. Deployment and operations

Vercel will host the public Next.js deployment; Supabase will remain the system of record. Environment values will be stored in local and Vercel environment configuration, with only names documented in `.env.example`. Production auth URLs and redirects will be configured explicitly, and environment changes will be followed by redeployment.

The two reviewer accounts will be created and verified before submission, with credentials transmitted outside the repository. Before the review call, the Supabase project will be opened and the full demonstration rehearsed because free projects may pause after inactivity. The demo will not depend on repeated email sign-ups because Supabase's default email service is rate-limited.

## 8. Assumptions, trade-offs, and deviations

- **Soft retirement:** The SOW says admins can remove coasters but does not define referenced-history behavior. Soft retirement preserves user trust and accurate statistics; hard deletion of referenced coasters is intentionally unavailable.
- **Admin claim freshness:** Admin role changes require JWT refresh. Immediate revocation is deferred because it does not justify additional infrastructure for this assessment.
- **Duplicate display names:** Accepted as specified. Leaderboard rows may be visually indistinguishable; unique naming is not added in v1.
- **Race behavior:** A simultaneous ride insertion and coaster retirement will use normal transaction behavior initially. Additional serialization will be added only if implementation testing exposes a practical integrity failure.
- **Version pinning:** Exact package patch versions will be selected from current stable releases when scaffolding and committed through the lockfile.
- **Free-tier usage:** The data and traffic limits are far above this demonstration's expected scale. The operationally material concerns are project pausing, email throttling, public deployment access, and confirming that the account owner accepts Vercel Hobby eligibility for this recruitment demo.

This document is the approved pre-build design. It must be updated after implementation so every statement reflects the deployed schema, policies, tests, and configuration; any departure from the SOW or this design will be listed with its rationale.
