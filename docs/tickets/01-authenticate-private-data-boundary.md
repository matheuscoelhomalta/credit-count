# 01 — Authenticate into a private-by-default data boundary

**What to build:** A deployable-compatible Next.js/Supabase foundation where a visitor can create a private enthusiast profile, sign in and out through refreshed cookie sessions, and reach only data permitted by explicit grants and Row Level Security.

**Blocked by:** None — can start immediately.

**Covers:** R-002, R-003, R-017, R-019, R-020

**Status:** complete — verified 2026-08-13 against the live Supabase project (direct Data API suite and browser flows)

**Timebox:** 80 minutes

- [x] Sign-up captures email, password, and display name; the profile defaults to leaderboard opt-out.
- [x] Sign-in, session refresh, protected redirects, and sign-out work using the supported SSR pattern; RLS remains the authorization boundary.
- [x] Explicit grants and operation-specific policies establish least-privilege access for profiles, coasters, and rides, including forged-owner and catalogue-mutation rejection.
- [x] The initial raw Data API suite exercises anonymous, owner, other-user, and admin identities and is ready for later feature-specific cases.
- [x] Runtime uses only the Supabase URL and publishable key; no elevated credential or demo password appears in source or browser output.
