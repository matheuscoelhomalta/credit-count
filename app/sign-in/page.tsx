import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SignInForm } from '@/components/auth-forms';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: 'Sign in · Credit Count' };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-12">
      <div>
        <div className="flex items-center justify-between gap-4">
          <Link className="cc-display text-base" href="/">
            CREDIT COUNT
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="cc-display mt-8 text-[2rem]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Welcome back. Pick up where your credit count left off.
        </p>
      </div>
      {/* SignInForm reads search params, so it needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="text-sm text-[var(--ink-soft)]">
        Need an account?{' '}
        <Link className="font-semibold text-[var(--ink)] underline underline-offset-4" href="/sign-up">
          Create one
        </Link>
      </p>
    </main>
  );
}
