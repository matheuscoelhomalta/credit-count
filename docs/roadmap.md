# Roadmap: Credit Count

**Updated:** 2026-08-12
**Status:** Approved
**Milestone outcome:** A reviewer can access a stable deployed app and submission package, verify every acceptance criterion—including adversarial access controls—and confidently see that the TDD matches what was shipped.

## Phases

- [ ] **Phase 1: Secure accounts and data boundary** — The deployed data model, authentication integration, and access matrix resist direct API misuse before feature breadth is added.
- [ ] **Phase 2: Complete enthusiast loop** — An enthusiast can log repeat rides, manage private history, and see accurate credits and statistics on desktop or phone.
- [ ] **Phase 3: Privacy-safe community and catalogue administration** — Anonymous ranking and admin catalogue management work without widening access to private data.
- [ ] **Phase 4: Reviewer-ready delivery** — The public repository, production deployment, tests, TDD, credentials, and review-call brief form a coherent submission.

## Phase Details

### Phase 1: Secure Accounts and Data Boundary

- **Goal:** Establish the smallest supported Next.js/Supabase foundation and prove authorization at the database boundary.
- **Depends on:** None
- **Requirements:** R-002, R-003, R-017, R-019, R-020
- **Success criteria:**
  1. A new private-by-default profile can authenticate through the deployed-compatible SSR session pattern.
  2. Explicit grants and RLS deny every unapproved anonymous, cross-user, and catalogue operation in direct-API tests.
  3. The application and repository operate without any elevated database key or committed credential.

### Phase 2: Complete Enthusiast Loop

- **Goal:** Deliver the full private ride-recording and statistics experience against a meaningful catalogue.
- **Depends on:** Phase 1
- **Requirements:** R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-021
- **Success criteria:**
  1. An enthusiast logs three coasters and a repeat ride within the required interaction limit and sees correct credit and ride totals.
  2. Country, manufacturer, type, and most-ridden statistics update with ride-history changes.
  3. Owners can manage their history—including date/note edits after coaster retirement—while every other role remains unable to read it.
  4. The main enthusiast workflow is usable at desktop and phone viewport sizes.

### Phase 3: Privacy-Safe Community and Catalogue Administration

- **Goal:** Complete the visitor leaderboard and administrator catalogue outcomes without compromising private ride data.
- **Depends on:** Phase 2
- **Requirements:** R-001, R-012, R-013, R-014, R-015, R-016, R-018
- **Success criteria:**
  1. A signed-out visitor receives only opted-in display names and distinct credit counts from the hardened leaderboard RPC.
  2. Opt-out removes a profile on the next leaderboard request, and repeat rides never inflate its credit count.
  3. An admin adds, edits, and soft-retires coasters while an enthusiast cannot perform any catalogue mutation.
  4. Admin privileges expose no foreign ride history or personal statistics.

### Phase 4: Reviewer-Ready Delivery

- **Goal:** Package and verify a clean, stable submission that can be confidently demonstrated and explained.
- **Depends on:** Phase 3
- **Requirements:** R-022, R-023, R-024, R-025, R-026, R-027
- **Success criteria:**
  1. Two focused browser flows and the direct-API suite pass against the final deployed behavior.
  2. The public repository reproduces the shipped application without exposing private planning material or secrets.
  3. The Vercel URL and both demo accounts work in a signed-out-to-admin rehearsal after the Supabase project is warmed.
  4. The one-to-three-page TDD and review brief accurately explain the shipped system, trade-offs, deviations, AI workflow, and plausible next change.
