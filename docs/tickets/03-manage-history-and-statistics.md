# 03 — Manage ride history and live detailed statistics safely

**What to build:** An enthusiast can manage only their own history and see all required statistics, while retired-coaster history is preserved without allowing invalid new or reassigned rides.

**Blocked by:** 02 — Log active coasters and see correct core counts.

**Covers:** R-007, R-008, R-010, R-011, R-017, R-019, R-021

**Status:** ready-for-agent

**Timebox:** 65 minutes

- [ ] Owners can edit only ride date/note and delete their rides; owner and coaster identity cannot be reassigned through UI or API.
- [ ] New or repointed rides against nonexistent or retired coasters are rejected.
- [ ] Historical rides against retired coasters remain visible, keep contributing to statistics, and allow owner edits to date/note.
- [ ] Country, manufacturer, type, and most-ridden statistics update after create, edit, and delete operations.
- [ ] Direct-API regression cases prove foreign reads/mutations, forged ownership, bulk mutation, and invalid coaster associations remain denied.
- [ ] History and statistics remain usable on phone and desktop layouts.
