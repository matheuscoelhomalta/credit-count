# Credit Count — Technical Design Document

**Status:** Reconciled with the deployed system
**Date:** 13 August 2026
**Milestone:** Submission-ready v1
**Stack:** Next.js 16.3, TypeScript, Node.js 22, Supabase, Vercel
**Production:** https://credit-count-one.vercel.app

This document describes the system as deployed. Section 7 lists every
assumption, trade-off, and deviation from the SOW or from the pre-build design.

## 1. Purpose and scope

Credit Count is a responsive web application for rollercoaster enthusiasts to
record individual rides, see their credit count and related statistics, and
optionally appear on a public leaderboard. The v1 was sized to fit the
assessment's eight-hour cap while satisfying the SOW's acceptance criteria.

The three SOW roles are implemented as specified: a **visitor** sees only the
public leaderboard and sign-up; an **enthusiast** logs and manages their own
rides and controls leaderboard participation; an **admin** maintains the shared
catalogue and gains no access to anyone's rides.

Excluded, per the SOW: live RCDB integration, native applications, historic
imports, commercial features, custom password-reset behavior, localisation. The
catalogue is seeded with 40 real coasters across several countries,
manufacturers, and types.

## 2. Architecture

Next.js App Router on Node.js 22, deployed on Vercel from the `main` branch.
Supabase provides email/password authentication, Postgres, the Data API, and all
authoritative access control.

`@supabase/ssr` provides the server client used by Server Components, server
actions, and `proxy.ts` (Next.js 16's rename of `middleware.ts`). `proxy.ts`
refreshes tokens and performs optimistic redirects; it is **not** an
authorization layer, because every route it guards is independently protected by
grants and RLS. Bypassing it gains an attacker nothing.

Server Components perform all reads and Client Components mutate through server
actions. As delivered no Client Component constructs a Supabase browser client,
so the publishable key never reaches the browser bundle — verified by scanning
the deployed chunks (see section 7).

The runtime uses only `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service-role key or database
credential exists in the application, the repository, or the Vercel project.
Schema, constraints, functions, grants, policies, and seed data live in six
ordered migrations under `supabase/migrations/`, so the security model is
reproducible from a clean project with `supabase db push`.

## 3. Data design

| Entity | Important fields | Purpose |
|---|---|---|
| `profiles` | `user_id`, `display_name`, `leaderboard_opt_in` | Application profile linked to Supabase Auth; participation defaults to false. Created by an `on_auth_user_created` trigger, so a profile exists before any session does. |
| `coasters` | `id`, `name`, `park`, `country`, `manufacturer`, `type`, `active` | Shared catalogue, unique on `(name, park)`. `active = false` is admin removal without destroying history. |
| `rides` | `id`, `user_id`, `coaster_id`, `ridden_on`, `note`, timestamps | One row per ride. Repeat rides are retained; `user_id` and `coaster_id` are immutable to the enthusiast. |

A credit is `count(distinct coaster_id)` over a user's rides; total rides counts
every row. The country, manufacturer, and type breakdowns group **distinct
ridden coasters**, not rides, so repeat rides cannot inflate them. The
most-ridden coaster counts all ride rows per coaster.

`rides.coaster_id` references `coasters` with `ON DELETE RESTRICT`, and no API
role holds `DELETE` on `coasters` at all. Admin "remove" is therefore soft
retirement: retired coasters disappear from browsing and reject new rides, while
existing rides stay visible, keep contributing to statistics, and remain
editable in date and note.

## 4. Security and privacy model

Object and **column** grants plus operation-specific RLS jointly form the
authorization boundary. Grants decide which operations a Data API role may
attempt; policies decide which rows it may touch. Supabase's default privileges
are revoked explicitly first, so every privilege in the system is deliberate.

### Private rides

Ride policies compare `auth.uid()` with `rides.user_id` for every operation:
`SELECT` and `DELETE` use an ownership predicate, `INSERT` adds an
active-coaster existence check, and `UPDATE` uses ownership in both `USING` and
`WITH CHECK`.

Ownership is unforgeable below the policy layer too. `rides.user_id` defaults to
`auth.uid()` and is **withheld from the INSERT column grant**, so a payload
naming another user is refused by PostgREST before RLS is consulted. `user_id`
and `coaster_id` are withheld from the UPDATE grant and frozen by a
`BEFORE UPDATE` trigger; only date and note are user-editable.

There is deliberately no admin policy on `rides`. Admins have exactly the
owner-only access an enthusiast has.

### Catalogue administration

Admin status is stored in Supabase `app_metadata`, which users cannot write
through the auth API, and is read from the verified JWT by `public.is_admin()`.
The catalogue INSERT and UPDATE policies check it; enthusiasts get read access
only. The UI also reads the claim, but only to decide what to render — the
policies re-derive it independently, so the hidden UI grants nothing. A direct
test confirms that an enthusiast writing `is_admin: true` into their own
*user*_metadata still cannot mutate the catalogue.

Role changes take effect on the account's next token refresh: an accepted v1
trade-off that avoids a live role table and a privileged lookup function.

### Public leaderboard

Anonymous callers hold no privilege on any base table — attempts return
PostgreSQL `42501`, a privilege error, not merely an empty result. The sole
public interface is `public.leaderboard()`, a fixed, zero-argument aggregate
returning only `display_name` and distinct `credit_count` for opted-in profiles.

That narrow `SECURITY DEFINER` exception:

- fully qualifies every object and sets an empty `search_path`;
- uses fixed SQL with no dynamic input and no arguments to widen;
- declares scalar return columns rather than a base-table row type, so a new
  column on `profiles` or `rides` cannot silently become public;
- revokes EXECUTE **by name** from every role before granting it to `anon` and
  `authenticated`, because a plain `revoke ... from public` does not remove
  Supabase's explicit default grants;
- excludes user ids, ride ids, dates, notes, and coaster identities entirely.

Opting out updates the profile row and removes that user from the next response.
Participants are `LEFT JOIN`ed to their rides so an opted-in enthusiast with no
rides appears at zero rather than vanishing from a board they just joined.
Opted-out profiles are excluded entirely — never shown as a zero — so absence
never distinguishes "no rides" from "not participating".

## 5. Verification

The highest-risk behavior is authorization bypass through the Data API, so
testing prioritizes security evidence over component coverage, and every suite
runs against the real hosted project.

**45 direct-API tests** authenticate with the publishable key alone as
anonymous, enthusiast, second enthusiast, and admin. They prove that anonymous
access is limited to the two leaderboard fields; that cross-user reads, edits,
deletes, forged ownership, bulk mutation, and ownership reassignment all fail;
that enthusiasts cannot mutate the catalogue while a refreshed admin can; that
admins cannot reach another user's rides or profile; that nonexistent and
retired coasters reject new rides; and that opt-out and distinct-credit counting
behave correctly. **12 unit tests** cover statistics and date handling.

**18 browser tests** run at both viewports; two of them are the focused flows
the SOW asks for. Isolation assertions seed a real row and a positive control
first, because "no rows returned" would otherwise pass vacuously against an
empty table.

The whole suite was re-run against the production deployment via `E2E_BASE_URL`
before submission. `supabase db advisors --type security` reports no schema
findings.

## 6. Deployment and operations

Vercel hosts the Next.js deployment; Supabase is the system of record. Node is
pinned to 22 in `.nvmrc`, `engines`, and the Vercel project runtime, and only
the two `NEXT_PUBLIC_*` values are configured in Vercel. Supabase `site_url` and
the redirect allow-list point at the production origin and are version-
controlled in `supabase/config.toml`. Email confirmation is disabled so the
demonstration does not depend on Supabase's rate-limited mailer. Two reviewer
accounts are verified against production; their credentials live outside the
repository and are transmitted separately.

## 7. Assumptions, trade-offs, and deviations

- **Soft retirement.** The SOW says admins can remove coasters but does not
  define referenced-history behavior. Hard deletion of a referenced coaster is
  intentionally unavailable to every API role; removal is `active = false`.
- **Admin claim freshness.** Role changes require a JWT refresh. Immediate
  revocation is deferred; it does not justify extra infrastructure here.
- **Duplicate display names.** Accepted as specified. Two participants may be
  visually indistinguishable on the leaderboard; unique naming is not in v1.
- **Ride-date timezone slack.** The `ridden_on` CHECK permits up to one day past
  the UTC date. Pinning it to the UTC date made it impossible for anyone east of
  UTC to log a ride taken today — at 09:00 in New Zealand it is still yesterday
  in UTC. One day is the smallest correct fix, and no timezone is more than
  ~14 hours ahead.
- **Zero-credit participants appear**, as described in section 4, so that
  opting in always has a visible effect.
- **No browser Supabase client.** Stricter than the pre-build design, which
  anticipated one. Nothing in the SOW needs a direct browser query; a feature
  that did would reintroduce one safely, since the key is publishable.
- **Race behavior.** A simultaneous ride insert and coaster retirement relies on
  normal transaction behavior; no serialization was added because none is
  needed. The insert either sees the coaster active and succeeds, or sees it
  retired and is refused by the policy.
- **Free-tier behavior.** Data and traffic limits are far above this
  demonstration's scale. The operationally material limits are project pausing
  after inactivity (hence the pre-call rehearsal), email throttling (hence
  disabled confirmations), and **30 password sign-ins per five minutes per IP** —
  a full test run sits under this, but two runs in quick succession can trip it.
  Both suites cache one signed-in client per identity to stay within it.
