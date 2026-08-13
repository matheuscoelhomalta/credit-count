# 02 — Log active coasters and see correct core counts

**What to build:** An enthusiast can browse a meaningful active catalogue, record individual and repeat rides quickly, and immediately see distinct credits and total rides without exposing private history.

**Blocked by:** 01 — Authenticate into a private-by-default data boundary.

**Covers:** R-004, R-005, R-006, R-009, R-011, R-021

**Status:** complete — verified 2026-08-13 (direct Data API suite, unit tests, browser flows at both viewports)

**Timebox:** 75 minutes

- [x] The catalogue contains roughly 30–50 real coasters spanning multiple countries, manufacturers, and types, with useful browse/search behavior.
- [x] From the dashboard, an active coaster can be logged with required date and optional short note in no more than three interactions.
- [x] Repeat rides create separate history entries, increase total rides, and do not increase distinct credits.
- [x] The dashboard updates counts after logging without a separate manual refresh.
- [x] Ride rows and derived private totals remain unavailable to anonymous users, other enthusiasts, and admins through UI and direct API.
- [x] The primary logging path is usable at desktop and phone viewport sizes.
