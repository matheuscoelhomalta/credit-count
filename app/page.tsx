import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-5 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Credit Count
        </h1>
        <p className="mt-3 max-w-prose text-base opacity-70">
          Log every rollercoaster you ride, track your credits, and share your
          total only if you choose to.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {user ? (
          <Link
            className="rounded-md bg-foreground px-4 py-2.5 font-medium text-background"
            href="/dashboard"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              className="rounded-md bg-foreground px-4 py-2.5 font-medium text-background"
              href="/sign-up"
            >
              Create account
            </Link>
            <Link
              className="rounded-md border border-black/15 px-4 py-2.5 font-medium dark:border-white/20"
              href="/sign-in"
            >
              Sign in
            </Link>
          </>
        )}
      </div>

      <p className="text-sm opacity-60">
        The public leaderboard arrives in a later slice.
      </p>
    </main>
  );
}
