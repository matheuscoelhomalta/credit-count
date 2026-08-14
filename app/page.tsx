import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

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
        <Link
          className="text-sm font-semibold underline decoration-[var(--signal)] decoration-2 underline-offset-4"
          href="/leaderboard"
        >
          Leaderboard
        </Link>
      </div>

      {/* The hero is the count itself, not a claim about it. */}
      <div className="relative overflow-hidden rounded bg-[var(--plate)] pb-6 text-[var(--on-plate)] shadow-[5px_5px_0_var(--plate-edge)]">
        <div className="px-6 pt-7 sm:px-8 sm:pt-9">
          <h1 className="cc-display max-w-[16ch] text-[2.25rem] sm:text-[3.25rem]">
            Every coaster you ride, counted once.
          </h1>
          <p className="mt-4 max-w-prose text-base text-[var(--on-plate)]/75">
            Log a ride in two taps. Your history, dates, and notes stay private —
            share only your total, and only if you want to.
          </p>

          {sharedCredits > 0 && (
            <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="cc-display text-[3.5rem] tabular-nums text-[var(--signal)] sm:text-[4.5rem]"
                style={{ fontStretch: '125%' }}
              >
                {sharedCredits}
              </span>
              <span className="cc-eyebrow text-[var(--on-plate)]/65">
                credits shared by {rows.length} {rows.length === 1 ? 'rider' : 'riders'}
              </span>
            </p>
          )}
        </div>
        <div aria-hidden className="cc-chevrons absolute inset-x-0 bottom-0 h-2" />
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
