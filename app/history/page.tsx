import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { RideWithCoaster } from '@/lib/rides';
import { RideList } from '@/components/ride-list';

export const metadata: Metadata = { title: 'Ride history · Credit Count' };

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?next=/history');
  }

  // Owner-only by policy; no client-side ownership filter is required.
  const { data, error } = await supabase
    .from('rides')
    .select('id, ridden_on, note, coaster_id, coasters(*)')
    .order('ridden_on', { ascending: false })
    .order('created_at', { ascending: false });

  const rides = (data ?? []) as unknown as RideWithCoaster[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ride history</h1>
          <p className="mt-1.5 text-sm opacity-70">
            {rides.length} {rides.length === 1 ? 'ride' : 'rides'} logged. Only you can
            see this.
          </p>
        </div>
        <Link
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20"
          href="/dashboard"
        >
          Dashboard
        </Link>
      </header>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load your history: {error.message}
        </p>
      )}

      <div className="mt-6">
        <RideList rides={rides} editable />
      </div>
    </main>
  );
}
