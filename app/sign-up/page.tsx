import type { Metadata } from 'next';
import Link from 'next/link';

import { SignUpForm } from '@/components/auth-forms';

export const metadata: Metadata = { title: 'Create account · Credit Count' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1.5 text-sm opacity-70">
          Your rides and statistics are private by default.
        </p>
      </div>
      <SignUpForm />
      <p className="text-sm opacity-70">
        Already have an account?{' '}
        <Link className="underline underline-offset-4" href="/sign-in">
          Sign in
        </Link>
      </p>
    </main>
  );
}
