import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { CoasterSummary } from '@/lib/rides';

export const metadata: Metadata = { title: 'Catalogue · Credit Count' };

export default async function CoastersPage({
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
    redirect('/sign-in?next=/coasters');
  }

  // Browsing shows the active catalogue only; retired entries survive in ride
  // history but must not be discoverable as something new to ride.
  let request = supabase.from('coasters').select('*').eq('active', true);
  if (query) {
    // Escape PostgREST's or() delimiters so a crafted query cannot break out
    // of the filter expression.
    const safe = query.replace(/[(),*]/g, ' ').trim();
    if (safe) {
      request = request.or(
        [
          `name.ilike.%${safe}%`,
          `park.ilike.%${safe}%`,
          `country.ilike.%${safe}%`,
          `manufacturer.ilike.%${safe}%`,
          `type.ilike.%${safe}%`,
        ].join(','),
      );
    }
  }

  const { data, error } = await request.order('name');
  const coasters = (data ?? []) as CoasterSummary[];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coaster catalogue</h1>
          <p className="mt-1.5 text-sm opacity-70">
            {coasters.length} active {coasters.length === 1 ? 'coaster' : 'coasters'}
            {query ? ' matching your search' : ''}.
          </p>
        </div>
        <Link
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          href="/dashboard"
        >
          Dashboard
        </Link>
      </header>

      {/* A plain GET form keeps browsing usable without client-side JS. */}
      <form className="mt-6 flex gap-2" action="/coasters" method="get">
        <input
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search the catalogue"
          placeholder="Search by name, park, country, manufacturer, or type"
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
          No active coaster matches that search.
        </p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {coasters.map((coaster) => (
            <li
              key={coaster.id}
              className="rounded-lg border border-black/10 p-3 dark:border-white/15"
            >
              <p className="font-medium">{coaster.name}</p>
              <p className="mt-0.5 text-sm opacity-70">
                {coaster.park}, {coaster.country}
              </p>
              <p className="mt-0.5 text-sm opacity-60">
                {coaster.manufacturer} · {coaster.type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
