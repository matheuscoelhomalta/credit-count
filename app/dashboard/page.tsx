import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Dashboard · Credit Count' };

export default async function DashboardPage() {
  const supabase = await createClient();

  // getUser() revalidates the token with Supabase rather than trusting the
  // cookie. Even so, the query below is authorized by RLS, not by this check.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?next=/dashboard');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('display_name, leaderboard_opt_in')
    .eq('user_id', user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
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
        <form action={signOut}>
          <button
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load your profile: {error.message}
        </p>
      )}

      <p className="mt-10 text-sm opacity-70">
        Ride logging and statistics arrive in the next slice.
      </p>
    </main>
  );
}
