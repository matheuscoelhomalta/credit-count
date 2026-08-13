# 06 — Produce a reproducible submission candidate

**What to build:** A clean, responsive release candidate that a reviewer can reproduce from the public delivery repository and exercise through the two highest-value browser flows.

**Blocked by:** 04 — Publish a privacy-safe opt-in leaderboard; 05 — Let admins maintain the catalogue without gaining ride access.

**Covers:** R-020, R-021, R-022, R-025

**Status:** complete

**Timebox:** 65 minutes

- [x] The visitor/enthusiast Playwright flow proves leaderboard access, authentication, fast logging, repeat counting, statistics, history management, and opt-in changes.
- [x] The admin Playwright flow proves authenticated catalogue creation, editing, and soft retirement.
- [x] Both flows pass at desktop and phone-sized viewports without unfinished or broken states.
- [x] The delivery repository contains locked dependencies, reproducible migrations and seed data, automated tests, setup instructions, and environment-variable names.
- [x] Private project-control material is excluded, and repository/build scans find no secret, elevated key, or demo password.
