# 07 — Deploy and rehearse reviewer access

**What to build:** A stable Vercel production deployment backed by the intended Supabase project, with verified enthusiast/admin accounts and a rehearsed signed-out-to-admin demo path.

**Blocked by:** 06 — Produce a reproducible submission candidate.

**Covers:** R-019, R-022, R-023, R-024

**Status:** complete — verified 2026-08-13 against production

**Timebox:** 45 minutes

- [x] The production URL supports the signed-out leaderboard, authentication, ride logging, statistics, opt-in changes, and admin catalogue management.
- [x] Production auth URLs, environment values, runtime version, and session refresh behavior are verified after the final deployment.
- [x] The direct-API security suite and both focused browser flows pass against final deployed behavior.
- [x] One verified enthusiast and one verified admin account work; credentials remain outside source control and are prepared for separate secure transmission.
- [x] A rehearsal confirms the Supabase project is active and the complete reviewer path works.
