import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';

type LeaderboardRow = { display_name: string; credit_count: number };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The public RPC is the only thing an anonymous visitor may read, and it is
  // exactly the number this page is about. A failure here costs the headline
  // figure and nothing else, so the page renders without it.
  const { data } = await supabase.rpc('leaderboard');
  const rows = (data ?? []) as LeaderboardRow[];
  const sharedCredits = rows.reduce((total, row) => total + row.credit_count, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 pt-10 pb-16 sm:pt-14">
      <div className="flex items-center justify-between gap-4">
        <span className="cc-display text-base">CREDIT COUNT</span>
        <div className="flex items-center gap-2">
          <Link
            className="text-sm font-semibold underline underline-offset-4"
            href="/leaderboard"
          >
            Leaderboard
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* The hero is the count itself, not a claim about it. */}
      <div className="overflow-hidden rounded bg-[var(--plate)] pb-8 text-[var(--on-plate)]">
        <div className="px-6 pt-7 sm:px-8 sm:pt-9">
          <h1 className="cc-display max-w-[18ch] text-[1.875rem] sm:text-[2.5rem]">
            Every coaster you ride, counted once.
          </h1>
          <p className="mt-4 max-w-prose text-base text-[var(--on-plate)]/75">
            Log a ride in two taps. Your history, dates, and notes stay private —
            share only your total, and only if you want to.
          </p>

          {sharedCredits > 0 && (
            <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="cc-display text-[2.5rem] tabular-nums text-[var(--signal)] sm:text-[3rem]">
                {sharedCredits}
              </span>
              <span className="cc-eyebrow text-[var(--on-plate)]/65">
                credits shared by {rows.length} {rows.length === 1 ? 'rider' : 'riders'}
              </span>
            </p>
          )}
        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <Link className="cc-btn" href="/dashboard">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link className="cc-btn" href="/sign-up">
              Create account
            </Link>
            <Link className="cc-btn-quiet px-4 py-2.5" href="/sign-in">
              Sign in
            </Link>
          </>
        )}
      </div>

      <p className="max-w-prose text-sm text-[var(--ink-soft)]">
        The leaderboard shows only display names and credit counts, and only for
        enthusiasts who opted in.
      </p>
    </main>
  );
}
