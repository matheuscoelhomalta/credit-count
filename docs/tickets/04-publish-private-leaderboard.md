# 04 — Publish a privacy-safe opt-in leaderboard

**What to build:** A signed-out visitor can see only opted-in display names and distinct credit counts, while enthusiasts can change participation without widening access to private data.

**Blocked by:** 03 — Manage ride history and live detailed statistics safely.

**Covers:** R-001, R-012, R-013, R-018, R-019

**Status:** complete

**Timebox:** 50 minutes

- [x] The public leaderboard uses one fixed, zero-argument aggregate function with fully qualified objects, a safe search path, revoked default execution, and narrowly granted execution.
- [x] Its response contains only display name and distinct credit count; anonymous callers retain no base-table access.
- [x] Results include only opted-in profiles, rank by distinct credits, and do not inflate counts for repeat rides.
- [x] Opting out removes the profile on the next leaderboard request.
- [x] The signed-out UI exposes the leaderboard and sign-up route without exposing profiles, catalogue rows, ride history, dates, notes, or coaster-level history.
- [x] Raw API tests cover anonymous output shape, opt-in/out, repeat rides, and denied base-table access.
