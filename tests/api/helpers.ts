import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. These tests run against a real Supabase project; see .env.example.`,
    );
  }
  return value;
}

const url = required('NEXT_PUBLIC_SUPABASE_URL');
const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

// Every identity below is built from the publishable key alone. The suite has no
// service-role key on purpose: it must only be able to prove what a real Data API
// caller can reach.
function rawClient(): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return rawClient();
}

export type Identity = {
  client: SupabaseClient;
  userId: string;
  email: string;
};

// Supabase caps password sign-ins at 30 per five minutes per IP. Each identity
// is therefore signed in once and shared: the api suite runs with
// --no-file-parallelism --no-isolate so this cache spans all of its files.
const sessions = new Map<string, Promise<Identity>>();

export function signInAs(emailVar: string, passwordVar: string): Promise<Identity> {
  const cached = sessions.get(emailVar);
  if (cached) return cached;

  const pending = (async () => {
    const email = required(emailVar);
    const password = required(passwordVar);
    const client = rawClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      throw new Error(`Could not sign in ${emailVar}: ${error?.message}`);
    }

    return { client, userId: data.user.id, email };
  })();

  sessions.set(emailVar, pending);
  return pending;
}

export const enthusiast = () =>
  signInAs('TEST_ENTHUSIAST_EMAIL', 'TEST_ENTHUSIAST_PASSWORD');
export const otherUser = () => signInAs('TEST_OTHER_EMAIL', 'TEST_OTHER_PASSWORD');
export const admin = () => signInAs('TEST_ADMIN_EMAIL', 'TEST_ADMIN_PASSWORD');

/**
 * PostgREST reports a denied write as an error, but a denied *read* usually
 * arrives as a successful response with zero rows, because RLS filters rather
 * than rejects. Treating "no rows" as a pass is what makes cross-user read
 * isolation testable at all.
 */
export function deniedRead(result: { data: unknown; error: unknown }): boolean {
  return result.error === null && Array.isArray(result.data) && result.data.length === 0;
}
