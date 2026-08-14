import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { computeStats, type CoasterSummary, type RideWithCoaster } from '@/lib/rides';
import { localToday } from '@/lib/dates';
import { LogRideForm } from '@/components/log-ride-form';
import { StatsPanel } from '@/components/stats';
import { LeaderboardToggle } from '@/components/leaderboard-toggle';
import { RideList } from '@/components/ride-list';
import { AppHeader } from '@/components/app-header';

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
      <AppHeader
        active="dashboard"
        isAdmin={user.app_metadata?.is_admin === true}
        title={profile?.display_name ?? 'Dashboard'}
        subtitle={
          profile?.leaderboard_opt_in
            ? 'Listed on the public leaderboard.'
            : 'Private — not listed on the public leaderboard.'
        }
      />

      {problems.length > 0 && (
        <div role="alert" className="cc-notice cc-alert mt-6">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8">
        <LogRideForm coasters={coasters} today={today} />
        <StatsPanel stats={stats} />

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="cc-section-title text-lg">Recent rides</h2>
            {rides.length > 5 && (
              <Link
                className="text-sm font-semibold underline underline-offset-4"
                href="/history"
              >
                View all {rides.length}
              </Link>
            )}
          </div>
          <div className="mt-4">
            <RideList rides={rides.slice(0, 5)} editable={false} />
          </div>
        </section>

        {/* Sharing is an account setting rather than a dashboard action, so it
            sits below the log. Only rendered from a profile that actually
            loaded: a toggle defaulted from missing data could misreport
            participation. */}
        {profile && (
          <div className="cc-surface flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <h2 className="cc-section-title text-sm">Public leaderboard</h2>
              <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                Your rides, dates, and notes are never shared.
              </p>
            </div>
            <LeaderboardToggle optedIn={profile.leaderboard_opt_in} />
          </div>
        )}
      </div>
    </main>
  );
}
