import type { RideWithCoaster } from '@/lib/rides';
import { RideRowActions } from '@/components/ride-row-actions';

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function RideList({
  rides,
  editable,
}: {
  rides: RideWithCoaster[];
  editable: boolean;
}) {
  if (rides.length === 0) {
    return (
      <p className="rounded border border-dashed border-[var(--rule-strong)] p-8 text-center text-sm text-[var(--ink-soft)]">
        No rides yet. Log one above and it lands here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rides.map((ride) => (
        <li
          key={ride.id}
          className="cc-surface p-3 transition-colors hover:border-[var(--ink-soft)] sm:p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold">
                {ride.coasters?.name ?? 'Unknown coaster'}
                {/* A retired coaster keeps its history visible and editable. */}
                {ride.coasters && !ride.coasters.active && (
                  <span className="cc-eyebrow ml-2 inline-block rounded-[2px] border border-[var(--rule-strong)] px-1.5 py-0.5 align-middle">
                    retired
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
                {ride.coasters
                  ? `${ride.coasters.park}, ${ride.coasters.country}`
                  : 'Catalogue entry unavailable'}
              </p>
              <p className="cc-data mt-1.5 text-xs text-[var(--ink-soft)]">
                {formatDate(ride.ridden_on)}
              </p>
              {ride.note && (
                <p className="mt-2 border-l-2 border-[var(--signal)] pl-2.5 text-sm">
                  {ride.note}
                </p>
              )}
            </div>

            {editable && <RideRowActions ride={ride} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
