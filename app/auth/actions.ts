'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type AuthState = { error: string | null };

// Only allow relative in-app paths back from the sign-in redirect, so the `next`
// parameter cannot be used as an open redirect.
//
// Checking the string prefix alone is not enough: browsers and the URL parser
// normalize a backslash to a forward slash, so "/\evil.example" starts with a
// single "/" but resolves to https://evil.example. Resolve the candidate against
// a dummy origin and require that the origin survives unchanged.
function safeNext(value: FormDataEntryValue | null): string {
  const fallback = '/dashboard';
  const next = typeof value === 'string' ? value : '';

  if (!next.startsWith('/') || next.includes('\\')) {
    return fallback;
  }

  try {
    const base = 'https://credit-count.invalid';
    const resolved = new URL(next, base);
    if (resolved.origin !== base) {
      return fallback;
    }
    // Path traversal can normalize into a protocol-relative "//host" pathname,
    // which the browser would follow off-site even though the origin check above
    // passed against the dummy base.
    if (resolved.pathname.startsWith('//')) {
      return fallback;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (!email || !password || !displayName) {
    return { error: 'Email, password, and display name are all required.' };
  }
  if (displayName.length < 2 || displayName.length > 40) {
    return { error: 'Display name must be between 2 and 40 characters.' };
  }

  const supabase = await createClient();
  // display_name travels in user metadata; the on_auth_user_created trigger
  // reads it to create the private-by-default profile row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    redirect('/sign-in?pending=1');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Those credentials did not match an account.' };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
