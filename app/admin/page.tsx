import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { CoasterSummary } from '@/lib/rides';
import { CoasterAdminRow, NewCoasterForm } from '@/components/coaster-admin';
import { AppHeader } from '@/components/app-header';

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
        <AppHeader
          active="admin"
          title="Catalogue admin"
          subtitle="Catalogue administration is restricted to designated administrators."
        />
        <p className="cc-surface mt-6 p-4 text-sm text-[var(--ink-soft)]">
          This area is for catalogue administrators. If your role was granted
          recently, sign out and back in so your session picks it up.
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
      <AppHeader
        active="admin"
        isAdmin
        title="Catalogue admin"
        subtitle={`${coasters.length} ${coasters.length === 1 ? 'entry' : 'entries'}, ${retired} retired.`}
      />

      <div className="mt-6">
        <NewCoasterForm />
      </div>

      <form className="mt-8 flex gap-2" action="/admin" method="get">
        <input
          className="cc-field"
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search the catalogue"
          placeholder="Search by name, park, or country"
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
