'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';

import { signIn, signUp, type AuthState } from '@/app/auth/actions';

const initialState: AuthState = { error: null };

const fieldClass =
  'w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-base focus:border-black dark:focus:border-white';
const labelClass = 'block text-sm font-medium mb-1.5';
const submitClass =
  'w-full rounded-md bg-foreground text-background px-4 py-2.5 font-medium disabled:opacity-60';

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className={labelClass} htmlFor="displayName">
          Display name
        </label>
        <input
          className={fieldClass}
          id="displayName"
          name="displayName"
          type="text"
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
        />
        <p className="mt-1.5 text-xs opacity-70">
          Shown only if you later opt into the public leaderboard.
        </p>
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          className={fieldClass}
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          className={fieldClass}
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <ErrorNote message={state.error} />
      <button className={submitClass} type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const pendingConfirmation = searchParams.get('pending') === '1';

  return (
    <form action={action} className="flex flex-col gap-4">
      {pendingConfirmation && (
        <p className="rounded-md border border-black/15 dark:border-white/20 px-3 py-2 text-sm">
          Check your inbox to confirm your email address, then sign in.
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          className={fieldClass}
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          className={fieldClass}
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <ErrorNote message={state.error} />
      <button className={submitClass} type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
