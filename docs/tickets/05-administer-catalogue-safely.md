# 05 — Let admins maintain the catalogue without gaining ride access

**What to build:** A manually designated admin can add, edit, and safely retire catalogue entries, while enthusiasts cannot mutate the catalogue and admin status never grants access to private rides.

**Blocked by:** 03 — Manage ride history and live detailed statistics safely.

**Covers:** R-014, R-015, R-016, R-017, R-019

**Status:** ready-for-agent

**Timebox:** 55 minutes

- [ ] Refreshed application metadata determines admin catalogue privileges; user-editable metadata cannot grant the role.
- [ ] An admin can add, edit, and soft-retire entries through the UI and direct API.
- [ ] Enthusiasts cannot create, edit, retire, or delete catalogue entries through either surface.
- [ ] Referenced coasters cannot be destructively deleted; retirement preserves historical rides and their contribution to owner statistics.
- [ ] Admin credentials cannot read or mutate another user's rides, notes, dates, or personal statistics.
- [ ] Direct-API tests prove admin catalogue access, enthusiast denial, token-refresh behavior, and continued ride isolation.
