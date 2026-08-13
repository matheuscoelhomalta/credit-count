'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type OptInState = { error: string | null; optedIn?: boolean };

/**
 * Leaderboard participation is a single boolean on the caller's own profile.
 *
 * The user id comes from the verified session, never from the request body, and
 * the profiles UPDATE policy independently scopes the statement to auth.uid() —
 * the filter below only exists because PostgREST refuses an unqualified UPDATE.
 */
export async function setLeaderboardOptIn(optIn: boolean): Promise<OptInState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sign in to change your leaderboard setting.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ leaderboard_opt_in: optIn })
    .eq('user_id', user.id)
    .select('leaderboard_opt_in')
    .single();

  if (error || !data) {
    return { error: 'Could not change your leaderboard setting.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/leaderboard');
  return { error: null, optedIn: data.leaderboard_opt_in };
}
