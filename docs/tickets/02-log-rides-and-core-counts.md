# 02 — Log active coasters and see correct core counts

**What to build:** An enthusiast can browse a meaningful active catalogue, record individual and repeat rides quickly, and immediately see distinct credits and total rides without exposing private history.

**Blocked by:** 01 — Authenticate into a private-by-default data boundary.

**Covers:** R-004, R-005, R-006, R-009, R-011, R-021

**Status:** ready-for-agent

**Timebox:** 75 minutes

- [ ] The catalogue contains roughly 30–50 real coasters spanning multiple countries, manufacturers, and types, with useful browse/search behavior.
- [ ] From the dashboard, an active coaster can be logged with required date and optional short note in no more than three interactions.
- [ ] Repeat rides create separate history entries, increase total rides, and do not increase distinct credits.
- [ ] The dashboard updates counts after logging without a separate manual refresh.
- [ ] Ride rows and derived private totals remain unavailable to anonymous users, other enthusiasts, and admins through UI and direct API.
- [ ] The primary logging path is usable at desktop and phone viewport sizes.
