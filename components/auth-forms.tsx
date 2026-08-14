'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';

import { signIn, signUp, type AuthState } from '@/app/auth/actions';

const initialState: AuthState = { error: null };

const fieldClass = 'cc-field';
const labelClass = 'cc-eyebrow block mb-2';
const submitClass = 'cc-btn w-full';

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="cc-alert rounded-r">
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
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
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
        <p className="rounded-[3px] border-l-[3px] border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_14%,transparent)] px-3 py-2 text-sm">
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
