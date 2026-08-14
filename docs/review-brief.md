# Credit Count — review brief

**Production:** https://credit-count-one.vercel.app
**Repository:** this one. **Design:** [docs/TDD.md](TDD.md).

Two accounts are provided separately: one enthusiast, one administrator.
Credentials are never in this repository.

## Demonstration order

Roughly ten minutes, signed-out to admin, in one pass.

1. **Signed out.** Open `/leaderboard`. This is the only page a stranger can
   see: display names and credit counts, nothing else. Then try `/dashboard` —
   it bounces to sign-in.
2. **The real boundary.** Before signing in, show that this is not a UI trick.
   `npm run test:api` authenticates with the publishable key alone and proves
   the same denials at the Data API. Anonymous reads of `profiles`, `coasters`,
   and `rides` return `42501` — a privilege error, not an empty result.
3. **Sign in as the enthusiast.** The account arrives with history already:
   **11 rides but 9 credits**, with the breakdowns and most-ridden tile
   populated. The gap between those two numbers is the product's whole idea.
4. **Log a ride.** Type-ahead, pick, submit — three interactions. Credits go to
   10 and rides to 12. Now log a *repeat* of a coaster already ridden: rides go
   to 13 and credits stay at 10, and the breakdowns do not move either, because
   a credit is a distinct coaster.
5. **Manage history.** Edit a note, delete a ride, watch the statistics follow.
   Note what the edit form does *not* offer: the coaster cannot be changed.
6. **Leave and rejoin the leaderboard.** The account is already listed. Open
   `/leaderboard` in a private window — name and count appear, no ride, date,
   note, or coaster does. Opt out, reload the private window: the entry is gone.
   Opt back in so the board is populated for the next demo.
7. **Sign in as the admin.** `/admin` appears in the nav. Add a coaster, edit
   it, retire it. It vanishes from the enthusiast catalogue while any existing
   rides against it survive.
8. **The admin's limits.** The admin has their own 5 rides and sees only those.
   The enthusiast's 13 are invisible — there is no admin policy on `rides` at
   all. The direct-API suite asserts this.

The two demo accounts are seeded and kept separate from the accounts the test
suite uses, which it empties on every run. Re-seed with
`node scripts/create-reviewer-accounts.mjs` if a demo leaves them thin.

If time is short, steps 1, 2, 4, 6, and 8 carry the argument.

## Security model in one minute

Authorization lives in the database, not the application. Two independent
mechanisms must both allow an operation: grants decide what a Data API role may
attempt, RLS decides which rows it may touch.

Three details are worth pausing on:

- **Ownership is a column grant, not just a policy.** `rides.user_id` defaults
  to `auth.uid()` and is withheld from the INSERT grant entirely, so a payload
  naming another user is refused before RLS is consulted.
- **Anonymous callers hold no table privileges at all.** The public leaderboard
  is a single zero-argument `SECURITY DEFINER` function with an empty
  `search_path` and declared scalar columns — adding a column to `profiles`
  cannot accidentally publish it.
- **`proxy.ts` is not the boundary.** It refreshes sessions and redirects
  optimistically. Bypassing it gains nothing.

## How this was built with AI assistance

Specification first: requirements, a dependency-ordered roadmap, eight
implementation tickets, and a pre-build TDD, all written before any code. Each
ticket then shipped as a vertical slice — migration, policy, UI, and proof
together — followed by a review pass whose findings were fixed before commit.
The TDD was reconciled against the shipped system at the end rather than left as
an aspiration.

The interesting part is what that process caught, because it is what an unaided
fast build tends to miss:

- **Vacuous tests, three times.** Assertions that passed because data was
  absent, not because access was denied. Each was fixed by seeding a real row
  and a positive control first.
- **An open redirect** in the sign-in `next` parameter, via a backslash, and a
  second traversal form (`/..//evil`) that normalized into a protocol-relative
  URL.
- **A SECURITY DEFINER function executable by `anon`,** because Supabase's
  default privileges grant EXECUTE explicitly and `revoke ... from public` does
  not remove them.
- **A silently failing opt-in toggle** in production-shaped conditions:
  PostgREST rejects an unfiltered UPDATE. The API test had passed because it
  happened to filter; the browser flow caught it.

## Prioritization and trade-offs

The budget went to security evidence first, required behavior second, styling
last. Concretely: no admin bypass anywhere, soft retirement instead of deletion,
and no feature outside the SOW. The deliberate trade-offs — admin claims
refreshing with the JWT rather than immediately, duplicate display names
allowed, a one-day timezone slack on ride dates — are each listed in section 7
of the TDD with their reasoning.

## What I would do next

1. **Immediate admin revocation.** Today a demoted admin keeps the claim until
   their token refreshes. A role table plus a `SECURITY DEFINER` lookup would
   close that, at the cost of a query per policy evaluation.
2. **Pagination on history and the leaderboard.** The dashboard already detects
   PostgREST truncation and warns rather than reporting quietly wrong numbers,
   but a user with thousands of rides deserves real paging, and the statistics
   should move into a database aggregate rather than being computed in Node.
3. **Leaked-password protection**, a one-toggle Supabase setting currently off.

## A plausible v2: sharing history with specific people

Suppose enthusiasts want to share their ride history with chosen friends rather
than the whole internet.

This is a good stress test because it directly contradicts the invariant the
whole system is built on — rides are owner-only. The change would be a new
`ride_shares` table (`owner_id`, `viewer_id`, both immutable to the viewer) and
exactly one extra clause in the rides `SELECT` policy: owner, **or** an accepted
share exists. Nothing else moves. Notably it would *not* be an admin bypass,
which stays permanently unavailable, and it would not touch the `INSERT`,
`UPDATE`, or `DELETE` policies — visibility is not authorship.

The leaderboard would not change at all. That is the payoff of having made the
one public surface a fixed aggregate function rather than a grant: a new sharing
relationship cannot leak through it, because there is nothing there to widen.

The parts that need care are the ones the current design already makes visible:
the share invitation is a write by one user against another user's row, so it
needs its own ownership column grant, and the test matrix grows a fifth
identity — "a viewer with an accepted share" — with negative cases for revoked
and pending shares.
