import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';

export const enthusiastEmail = process.env.TEST_ENTHUSIAST_EMAIL!;
export const enthusiastPassword = process.env.TEST_ENTHUSIAST_PASSWORD!;
export const adminEmail = process.env.TEST_ADMIN_EMAIL!;
export const adminPassword = process.env.TEST_ADMIN_PASSWORD!;

// Supabase caps password sign-ins at 30 per five minutes per IP, and the
// browser flows spend most of that budget signing in through the real form.
// The out-of-band fixture clients below are therefore signed in once each.
const clients = new Map<string, Promise<SupabaseClient>>();

function apiClient(email: string, password: string): Promise<SupabaseClient> {
  const cached = clients.get(email);
  if (cached) return cached;

  const pending = (async () => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`fixture sign-in failed for ${email}: ${error.message}`);
    return client;
  })();

  clients.set(email, pending);
  return pending;
}

/**
 * Removes every ride belonging to the given account so a flow starts from a
 * known state. This runs as the account itself with the publishable key, so it
 * is only able to delete what its own RLS policy already permits.
 *
 * IMPORTANT: this wipes rides for an account that `tests/api` also seeds
 * fixtures into. The two suites must never run concurrently — use `npm test`,
 * which chains them, rather than starting them as parallel jobs.
 */
export async function resetRides(email: string, password: string): Promise<void> {
  const client = await apiClient(email, password);

  const { error } = await client
    .from('rides')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`resetRides delete failed: ${error.message}`);
}

/**
 * Reads the account's own profile through the Data API. Used to learn the
 * display name the leaderboard will publish, rather than hard-coding it.
 */
export async function readProfile(
  email: string,
  password: string,
): Promise<{ display_name: string; leaderboard_opt_in: boolean }> {
  const client = await apiClient(email, password);

  const { data, error } = await client
    .from('profiles')
    .select('display_name, leaderboard_opt_in')
    .single();
  if (error || !data) throw new Error(`readProfile failed: ${error?.message}`);
  return data;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
}

/** Logs a ride from the dashboard: pick the coaster, then submit. */
export async function logRide(page: Page, coasterName: string, note?: string) {
  const search = page.getByLabel('Coaster');
  const submit = page.getByRole('button', { name: 'Log ride' });

  await search.fill(coasterName);
  await page.getByRole('button', { name: new RegExp(`^${coasterName}`) }).click();
  if (note) {
    await page.getByLabel(/^Note/).fill(note);
  }
  // Selecting a coaster is what enables submission.
  await expect(submit).toBeEnabled();
  await submit.click();

  // The form clears itself once the action resolves. Waiting for that here
  // prevents the next fill() from being wiped by the in-flight reset.
  await expect(search).toHaveValue('');
  await expect(submit).toBeDisabled();
}
