# Credit Count Development Guidelines

## Objective

Build the smallest secure, coherent implementation that satisfies the Credit Count SOW and can be confidently demonstrated and explained. Security, acceptance-criteria coverage, and consistency with the deployed system take priority over additional features or polish.

## Sources of truth

Use these artifacts in order:

1. The active file under `docs/tickets/` for the current implementation slice.
2. `docs/requirements.md` for observable milestone outcomes.
3. `docs/roadmap.md` for dependencies and delivery order.
4. `docs/TDD.md` for the approved architecture and security design.

If they conflict, stop and reconcile them instead of silently choosing one. The shipped implementation and verified tests must ultimately agree with the TDD.

## Delivery workflow

- Work on one dependency-ready ticket at a time. Do not begin a ticket while any listed blocker is incomplete.
- Keep each change as a vertical slice: schema, authorization, application behavior, and proof should land together when the ticket requires them.
- Stay within the SOW. Do not add live RCDB integration, native apps, historic imports, commercial features, custom password-reset behavior, localisation, or unrelated social features.
- Preserve the eight-hour assessment cap. If time is constrained, reduce optional styling before reducing security evidence, required behavior, deployment verification, or reviewer documentation.
- Do not mark a ticket or requirement complete until its observable outcome has been verified.

## Architecture boundaries

- Use Next.js 16 App Router, TypeScript, and Node.js 22.
- Use the current supported `@supabase/ssr` browser/server-client pattern and root `proxy.ts` for session refresh and optimistic redirects.
- Treat Supabase grants and Row Level Security—not Next.js routes, layouts, Proxy, or hidden UI—as the authorization boundary.
- Keep schema, constraints, grants, policies, functions, and seed data in reproducible Supabase migrations.
- Prefer Server Components for reads and add client-side code only where interaction requires it.
- Select current stable package versions when scaffolding, pin the Node major, and commit the lockfile.

## Security invariants

- Enable RLS on every table in an exposed schema and grant only the operations each API role requires.
- Use ownership predicates for every ride operation. Never add an admin bypass for private rides or personal statistics.
- Keep `rides.user_id` and `rides.coaster_id` immutable to enthusiasts; only ride date and note are user-editable.
- Permit new ride associations only with active coasters. Soft-retire referenced coasters rather than deleting user history.
- Store administrator authorization only in non-user-editable application metadata. Account for JWT refresh after role changes.
- Give anonymous users no base-table access. Expose the leaderboard only through the fixed, zero-argument aggregate RPC described in the TDD.
- Harden any `SECURITY DEFINER` function with fully qualified objects, a safe `search_path`, no dynamic SQL, a narrow return type, and explicit execute privileges.
- Application runtime may use only the Supabase URL and publishable key. Never expose or commit a secret/service-role key, database credential, demo password, or reviewer credential.

## Verification

- Add or update tests in the same ticket as the behavior they prove.
- Exercise authorization through the real Supabase Data API as anonymous, owner, other user, and admin—not only through the UI.
- Include negative tests for forged ownership, foreign reads and mutations, catalogue authorization, retired-coaster associations, leaderboard opt-out, and anonymous base-table access.
- Maintain the focused visitor/enthusiast and admin Playwright flows required by the tickets.
- Before declaring work complete, run the repository's formatting, linting, type-checking, test, build, and secret-scanning commands that are relevant to the change.
- Verify deployment-sensitive behavior against production after deployment, including authentication callbacks, session refresh, API policies, environment configuration, and both demo accounts.

## Documentation maintenance

- Keep acceptance criteria and requirement status accurate; check them off only after verification.
- Update `docs/TDD.md` whenever implementation changes architecture, schema, authorization, deployment, assumptions, or SOW behavior.
- Record every intentional deviation from the SOW or approved design with its rationale.
- Keep setup, migration, testing, and deployment instructions reproducible in the public repository.
- Do not add private recruitment analysis, credentials, personal preparation notes, or internal orchestration artifacts.

## Engineering discipline

- Prefer simple, durable solutions for current requirements over speculative abstractions or compatibility layers.
- Preserve unrelated behavior and keep changes within the active ticket.
- Use database constraints and policies for data invariants that must survive direct API access.
- Do not add comments that merely restate code; document non-obvious security reasoning and trade-offs where future maintainers need it.
- Do not push, deploy, create external services, or transmit credentials unless the user explicitly authorizes that external action.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
