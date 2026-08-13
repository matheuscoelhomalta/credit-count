import type { Metadata } from 'next';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-1.5 text-sm opacity-70">
            Enthusiasts who chose to share their credit count. Ride history stays
            private.
          </p>
        </div>
        <Link
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
          href={user ? '/dashboard' : '/sign-up'}
        >
          {user ? 'Go to dashboard' : 'Create account'}
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-600/30 p-3 text-sm text-red-600 dark:text-red-400"
        >
          The leaderboard could not be loaded.
        </p>
      )}

      {!error && rows.length === 0 ? (
        <p className="mt-8 text-sm opacity-70">
          Nobody has joined the leaderboard yet.
        </p>
      ) : (
        <ol className="mt-8 flex flex-col gap-2">
          {rows.map((row, index) => (
            <li
              key={`${index}-${row.display_name}`}
              className="flex items-baseline gap-4 rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
            >
              <span className="w-8 shrink-0 text-sm tabular-nums opacity-60">
                {index + 1}
              </span>
              <span className="flex-1 truncate font-medium">{row.display_name}</span>
              {/* One text node so the count and its unit read as a single
                  phrase to screen readers and assertions alike. */}
              <span className="shrink-0 tabular-nums">
                {`${row.credit_count} ${row.credit_count === 1 ? 'credit' : 'credits'}`}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-8 text-sm opacity-60">
        <Link className="underline underline-offset-4" href="/">
          Back to home
        </Link>
      </p>
    </main>
  );
}
