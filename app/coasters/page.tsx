import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { CoasterSummary } from '@/lib/rides';
import { AppHeader } from '@/components/app-header';

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
      <AppHeader
        active="coasters"
        isAdmin={user.app_metadata?.is_admin === true}
        title="Coaster catalogue"
        subtitle={`${coasters.length} active ${coasters.length === 1 ? 'coaster' : 'coasters'}${query ? ' matching your search' : ''}.`}
      />

      {/* A plain GET form keeps browsing usable without client-side JS. */}
      <form className="mt-6 flex gap-2" action="/coasters" method="get">
        <input
          className="cc-field"
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search the catalogue"
          placeholder="Search by name, park, country, manufacturer, or type"
        />
        <button
          className="cc-btn shrink-0"
          type="submit"
        >
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="cc-alert mt-6 rounded-r">
          Could not load the catalogue: {error.message}
        </p>
      )}

      {coasters.length === 0 ? (
        <p className="mt-6 rounded border border-dashed border-[var(--rule-strong)] p-8 text-center text-sm text-[var(--ink-soft)]">
          No active coaster matches that search.
        </p>
      ) : (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {coasters.map((coaster) => (
            <li
              key={coaster.id}
              className="cc-surface p-3.5 transition-colors hover:border-[var(--ink-soft)]"
            >
              <p className="text-base font-bold">{coaster.name}</p>
              <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
                {coaster.park}, {coaster.country}
              </p>
              <p className="cc-data mt-1.5 text-xs text-[var(--ink-soft)]">
                {coaster.manufacturer} · {coaster.type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
