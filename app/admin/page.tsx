import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { CoasterSummary } from '@/lib/rides';
import { CoasterAdminRow, NewCoasterForm } from '@/components/coaster-admin';

export const metadata: Metadata = { title: 'Catalogue admin · Credit Count' };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?next=/admin');
  }

  // Cosmetic only. This decides what to render, never what is permitted: the
  // coasters policies re-check the same claim from the verified JWT, so a
  // non-admin who reaches the forms below still cannot change anything.
  const isAdmin = user.app_metadata?.is_admin === true;

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Catalogue admin</h1>
        <p className="mt-3 text-sm opacity-70">
          This area is for catalogue administrators. If your role was granted
          recently, sign out and back in so your session picks it up.
        </p>
        <p className="mt-6 text-sm">
          <Link className="underline underline-offset-4" href="/dashboard">
            Back to dashboard
          </Link>
        </p>
      </main>
    );
  }

  // Retired entries are included here — administration is precisely where they
  // must stay visible so they can be reviewed or restored.
  let request = supabase.from('coasters').select('*');
  if (query) {
    const safe = query.replace(/[(),*]/g, ' ').trim();
    if (safe) {
      request = request.or(
        [`name.ilike.%${safe}%`, `park.ilike.%${safe}%`, `country.ilike.%${safe}%`].join(
          ',',
        ),
      );
    }
  }

  const { data, error } = await request.order('active', { ascending: false }).order('name');
  const coasters = (data ?? []) as CoasterSummary[];
  const retired = coasters.filter((c) => !c.active).length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalogue admin</h1>
          <p className="mt-1.5 text-sm opacity-70">
            {coasters.length} {coasters.length === 1 ? 'entry' : 'entries'}, {retired}{' '}
            retired.
          </p>
        </div>
        <Link
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          href="/dashboard"
        >
          Dashboard
        </Link>
      </header>

      <div className="mt-6">
        <NewCoasterForm />
      </div>

      <form className="mt-8 flex gap-2" action="/admin" method="get">
        <input
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search the catalogue"
          placeholder="Search by name, park, or country"
        />
        <button
          className="shrink-0 rounded-md bg-foreground px-4 py-2 font-medium text-background"
          type="submit"
        >
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load the catalogue: {error.message}
        </p>
      )}

      {coasters.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-black/15 p-6 text-center text-sm opacity-70 dark:border-white/20">
          No coaster matches that search.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {coasters.map((coaster) => (
            <CoasterAdminRow key={coaster.id} coaster={coaster} />
          ))}
        </ul>
      )}
    </main>
  );
}
