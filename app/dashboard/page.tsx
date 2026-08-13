import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import { computeStats, type CoasterSummary, type RideWithCoaster } from '@/lib/rides';
import { localToday } from '@/lib/dates';
import { LogRideForm } from '@/components/log-ride-form';
import { StatsPanel } from '@/components/stats';
import { LeaderboardToggle } from '@/components/leaderboard-toggle';
import { RideList } from '@/components/ride-list';

export const metadata: Metadata = { title: 'Dashboard · Credit Count' };

export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser() revalidates the token with Supabase rather than trusting the
  // cookie. Even so, every query below is authorized by RLS, not by this check.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?next=/dashboard');
  }

  const [profileResult, ridesResult, coastersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, leaderboard_opt_in')
      .eq('user_id', user.id)
      .single(),
    // No user_id filter is needed: the SELECT policy already restricts this to
    // the caller's own rides. Filtering here would be cosmetic, not protective.
    // count is requested so a PostgREST max_rows truncation is detectable.
    // Silently computing credits from a truncated set would report wrong
    // numbers with no indication anything was missing.
    supabase
      .from('rides')
      .select('id, ridden_on, note, coaster_id, coasters(*)', { count: 'exact' })
      .order('ridden_on', { ascending: false })
      .order('created_at', { ascending: false }),
    // Only active coasters can receive new rides, so the picker lists those.
    supabase
      .from('coasters')
      .select('*')
      .eq('active', true)
      .order('name'),
  ]);

  const profile = profileResult.data;
  const rides = (ridesResult.data ?? []) as unknown as RideWithCoaster[];
  const coasters = (coastersResult.data ?? []) as CoasterSummary[];
  const stats = computeStats(rides);
  const today = localToday();

  const truncated =
    typeof ridesResult.count === 'number' && ridesResult.count > rides.length;

  // Each of these degrades the page in a different way, so none can be
  // swallowed: without a profile the leaderboard status line would be a claim
  // made from no data, and without a catalogue the picker silently matches
  // nothing and submission stays disabled with no explanation.
  const problems = [
    profileResult.error && 'Could not load your profile.',
    ridesResult.error && `Could not load your rides: ${ridesResult.error.message}`,
    coastersResult.error && 'Could not load the coaster catalogue, so logging is unavailable.',
    truncated &&
      `Showing ${rides.length} of ${ridesResult.count} rides; statistics below are incomplete.`,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.display_name ?? 'Dashboard'}
          </h1>
          <p className="mt-1.5 text-sm opacity-70">
            {profile?.leaderboard_opt_in
              ? 'Listed on the public leaderboard.'
              : 'Private — not listed on the public leaderboard.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Navigation convenience only — /admin and the catalogue policies
              both re-derive the role, so hiding this grants nothing. */}
          {user.app_metadata?.is_admin === true && (
            <Link
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
              href="/admin"
            >
              Admin
            </Link>
          )}
          <Link
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            href="/leaderboard"
          >
            Leaderboard
          </Link>
          <Link
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            href="/coasters"
          >
            Catalogue
          </Link>
          <Link
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            href="/history"
          >
            History
          </Link>
          <form action={signOut}>
            <button
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {problems.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-600/30 p-3 text-sm text-red-600 dark:text-red-400"
        >
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}

      {/* Only rendered from a profile that actually loaded: a toggle defaulted
          from missing data could misreport participation. */}
      {profile && (
        <div className="mt-6 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div>
            <h2 className="text-sm font-semibold">Public leaderboard</h2>
            <p className="mt-1 text-sm opacity-70">
              Your rides, dates, and notes are never shared.
            </p>
          </div>
          <LeaderboardToggle optedIn={profile.leaderboard_opt_in} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8">
        <LogRideForm coasters={coasters} today={today} />
        <StatsPanel stats={stats} />

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent rides</h2>
            {rides.length > 5 && (
              <Link className="text-sm underline underline-offset-4" href="/history">
                View all {rides.length}
              </Link>
            )}
          </div>
          <div className="mt-3">
            <RideList rides={rides.slice(0, 5)} editable={false} />
          </div>
        </section>
      </div>
    </main>
  );
}
