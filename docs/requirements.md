# Requirements: Credit Count

**Updated:** 2026-08-12
**Status:** Approved
**Core value:** Deliver a narrow, secure, and coherent Credit Count submission that demonstrably satisfies the SOW—especially database-enforced privacy and catalogue authorization—within the eight-hour assessment budget.

## Current Milestone

### Access and accounts

- [x] **R-001:** A signed-out visitor can view the public leaderboard and reach sign-up, while no private profile, catalogue, ride, note, or coaster-level history is accessible through the UI or Data API.
- [x] **R-002:** A visitor can create an enthusiast account with email, password, and display name, and the new profile is excluded from the leaderboard by default.
- [x] **R-003:** An enthusiast can sign in and out through a cookie-based session that refreshes correctly in the deployed Next.js application without being treated as the authorization boundary.

### Catalogue and ride logging

- [x] **R-004:** An authenticated enthusiast can search or browse an active catalogue seeded with roughly 30–50 real coasters spanning multiple countries, manufacturers, and types.
- [x] **R-005:** From the dashboard, an enthusiast can select an active coaster and log an individual ride with a required date and optional short note in no more than three interactions.
- [x] **R-006:** An enthusiast can log multiple rides against the same coaster, with every ride retained as its own history entry.
- [x] **R-007:** An enthusiast can edit the date or note and delete only their own rides, while ride owner and coaster identity cannot be reassigned by the user.
- [x] **R-008:** No user can create or repoint a ride against a nonexistent or soft-retired coaster through either the UI or direct API, while historical rides against retired coasters remain visible and their date/note remain editable by their owner.

### Personal statistics

- [x] **R-009:** The dashboard shows the signed-in user's credit count as distinct coasters ridden and total ride count as all ride entries, including repeat rides correctly.
- [x] **R-010:** The dashboard shows credits by country, manufacturer, and coaster type plus the user's most-ridden coaster, and reflects ride-history changes without a separate manual refresh action.
- [x] **R-011:** Each user's ride history, dates, notes, and derived personal statistics remain inaccessible to anonymous visitors, other enthusiasts, and administrators through both the UI and direct API.

### Public leaderboard

- [x] **R-012:** An enthusiast can opt into or out of public ranking, and opting out removes them from public results on the next request without revealing their ride history.
- [x] **R-013:** The anonymous leaderboard ranks opted-in profiles by distinct credit count and returns only display name and credit count through a fixed, argument-free database interface.

### Catalogue administration

- [x] **R-014:** A manually designated administrator can add and edit catalogue entries and soft-retire duplicates or obsolete coasters, while preserved historical rides continue contributing to their owners' statistics.
- [x] **R-015:** An enthusiast cannot create, edit, retire, or delete catalogue entries through the UI or direct API; administrator status is derived only from non-user-editable authorization data and takes effect after token refresh.
- [x] **R-016:** Administrator catalogue privileges do not grant access to any other user's ride history, dates, notes, or personal statistics.

### Security verification

- [x] **R-017:** Explicit database grants and operation-specific Row Level Security policies enforce the complete anonymous, enthusiast-owner, other-user, and administrator access matrix for every exposed table.
- [x] **R-018:** The public leaderboard function uses a fixed, fully qualified aggregate implementation with a safe search path and explicitly restricted execute privileges, and exposes no base-table access or fields beyond display name and credit count.
- [x] **R-019:** Automated direct-API tests prove anonymous exposure, cross-user isolation, forged ownership rejection, prohibited catalogue mutation, admin catalogue access, retired-coaster rejection, opt-out behavior, and distinct-credit counting.
- [x] **R-020:** No secret/service-role key, database credential, demo password, or other elevated secret appears in client code, the built browser bundle, or the public repository.

### Usability and delivery

- [x] **R-021:** The required visitor, enthusiast, and administrator flows are usable on desktop and phone-sized browsers and do not feel like an unfinished prototype.
- [x] **R-022:** Two focused browser tests demonstrate the visitor/enthusiast happy path and administrator catalogue-management path against the implemented UI.
- [ ] **R-023:** A stable Vercel production URL serves the signed-out leaderboard and supports authentication, ride logging, statistics, opt-in changes, and catalogue administration against the deployed Supabase project.
- [ ] **R-024:** One verified enthusiast account and one verified administrator account are ready for the reviewer, with credentials transmitted outside source control.
- [x] **R-025:** A separate public delivery repository contains the application, locked dependencies, reproducible database migrations and seed data, automated tests, setup documentation, and environment-variable names without private project-control material.
- [ ] **R-026:** A one-to-three-page TDD accurately describes the deployed architecture, data/security model, assumptions, trade-offs, material free-tier behavior, and every deviation from the SOW.
- [ ] **R-027:** A concise review-call brief provides a reliable demonstration order and explains security, AI-assisted delivery, trade-offs, next improvements, and an approach to a plausible v2 change.

## Later

- **R-101:** The catalogue synchronizes with a live RCDB integration — deferred because the SOW explicitly excludes it from v1.
- **R-102:** The product provides broader social, sharing, and analytical features — deferred until the required secure loop is proven.
- **R-103:** Administrator revocation takes effect independently of JWT refresh — deferred because immediate-revocation infrastructure does not justify its cost in this eight-hour assessment.

## Out of Scope

- Native mobile applications — the responsive web application is sufficient for v1.
- Payments, subscriptions, and commercial features — the assessment product is fictional and non-commercial.
- Historic-credit imports — all statistics derive from rides recorded in the application.
- Custom password-reset behavior — Supabase's standard flow is sufficient.
- Localisation — the v1 interface is English only.
- Hard deletion of coasters referenced by ride history — it would destroy user history or require unnecessary reconciliation.

## Coverage

- Current requirements: 27
- Each mapped to exactly one roadmap phase: Yes
