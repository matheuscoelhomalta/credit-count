import type { Metadata } from 'next';
import Link from 'next/link';

import { SignUpForm } from '@/components/auth-forms';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: 'Create account · Credit Count' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-12">
      <div>
        <div className="flex items-center justify-between gap-4">
          <Link className="cc-display text-base" href="/">
            CREDIT COUNT
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="cc-display mt-8 text-[2rem]">Create account</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Your rides and statistics are private by default.
        </p>
      </div>
      <SignUpForm />
      <p className="text-sm text-[var(--ink-soft)]">
        Already have an account?{' '}
        <Link className="font-semibold text-[var(--ink)] underline underline-offset-4" href="/sign-in">
          Sign in
        </Link>
      </p>
    </main>
  );
}
