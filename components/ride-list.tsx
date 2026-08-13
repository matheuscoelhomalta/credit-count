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
      <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm opacity-70 dark:border-white/20">
        No rides logged yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rides.map((ride) => (
        <li
          key={ride.id}
          className="rounded-lg border border-black/10 p-3 dark:border-white/15 sm:p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">
                {ride.coasters?.name ?? 'Unknown coaster'}
                {/* A retired coaster keeps its history visible and editable. */}
                {ride.coasters && !ride.coasters.active && (
                  <span className="ml-2 rounded border border-black/15 px-1.5 py-0.5 align-middle text-xs font-normal opacity-70 dark:border-white/20">
                    retired
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm opacity-70">
                {ride.coasters
                  ? `${ride.coasters.park}, ${ride.coasters.country}`
                  : 'Catalogue entry unavailable'}
              </p>
              <p className="mt-1 text-sm tabular-nums opacity-70">
                {formatDate(ride.ridden_on)}
              </p>
              {ride.note && <p className="mt-1.5 text-sm">{ride.note}</p>}
            </div>

            {editable && <RideRowActions ride={ride} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
