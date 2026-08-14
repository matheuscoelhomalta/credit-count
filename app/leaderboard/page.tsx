import type { Metadata } from 'next';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';

export const metadata: Metadata = { title: 'Leaderboard · Credit Count' };

type LeaderboardRow = { display_name: string; credit_count: number };

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // The only call on this page. Anonymous visitors hold no privilege on any
  // base table, so there is nothing else here to read — the RPC's two columns
  // are the entire public surface.
  const { data, error } = await supabase.rpc('leaderboard');
  const rows = (data ?? []) as LeaderboardRow[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      {user ? (
        <AppHeader
          active="leaderboard"
          isAdmin={user.app_metadata?.is_admin === true}
          title="Leaderboard"
          subtitle="Enthusiasts who chose to share their credit count. Ride history stays private."
        />
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link className="cc-display text-base text-[var(--ink)]" href="/">
              CREDIT COUNT
            </Link>
            <h1 className="cc-display mt-6 text-[2rem] sm:text-[2.5rem]">Leaderboard</h1>
            <p className="mt-2 max-w-prose text-sm text-[var(--ink-soft)]">
              Enthusiasts who chose to share their credit count. Ride history stays
              private.
            </p>
          </div>
          <Link className="cc-btn" href="/sign-up">
            Create account
          </Link>
        </header>
      )}

      {error && (
        <p role="alert" className="cc-alert mt-6 rounded-r">
          The leaderboard could not be loaded.
        </p>
      )}

      {!error && rows.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-[var(--rule-strong)] p-8 text-center text-sm text-[var(--ink-soft)]">
          Nobody has joined the leaderboard yet. Be the first to share a count.
        </p>
      ) : (
        <ol className="mt-8 flex flex-col gap-2">
          {rows.map((row, index) => (
            <li
              key={`${index}-${row.display_name}`}
              className="cc-surface flex items-center gap-4 px-4 py-3"
            >
              {/* Rank one gets the plate. Position is the only thing this board
                  ranks, so it is the only thing worth marking. */}
              <span
                className={`cc-data flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] text-sm ${
                  index === 0
                    ? 'border border-[var(--ink)] bg-[var(--signal)] font-bold text-[#2e2e2e]'
                    : 'text-[var(--ink-soft)]'
                }`}
              >
                {index + 1}
              </span>
              <span className="flex-1 truncate font-bold">{row.display_name}</span>
              {/* One text node so the count and its unit read as a single
                  phrase to screen readers and assertions alike. */}
              <span className="cc-data shrink-0 text-sm text-[var(--ink-soft)]">
                {`${row.credit_count} ${row.credit_count === 1 ? 'credit' : 'credits'}`}
              </span>
            </li>
          ))}
        </ol>
      )}

      {!user && (
        <p className="mt-8 text-sm">
          <Link
            className="font-semibold underline decoration-[var(--signal)] decoration-2 underline-offset-4"
            href="/"
          >
            Back to home
          </Link>
        </p>
      )}
    </main>
  );
}
