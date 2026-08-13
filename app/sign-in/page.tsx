import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SignInForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Sign in · Credit Count' };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm opacity-70">
          Welcome back. Pick up where your credit count left off.
        </p>
      </div>
      {/* SignInForm reads search params, so it needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
      <p className="text-sm opacity-70">
        Need an account?{' '}
        <Link className="underline underline-offset-4" href="/sign-up">
          Create one
        </Link>
      </p>
    </main>
  );
}
