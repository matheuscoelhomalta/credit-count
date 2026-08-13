import type { Breakdown, RideStats } from '@/lib/rides';

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-sm opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-60">{hint}</p>}
    </div>
  );
}

function BreakdownList({ title, items }: { title: string; items: Breakdown[] }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">No credits yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="tabular-nums opacity-70">{item.credits}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatsPanel({ stats }: { stats: RideStats }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          label="Credits"
          value={String(stats.credits)}
          hint="Distinct coasters ridden"
        />
        <Tile
          label="Total rides"
          value={String(stats.totalRides)}
          hint="Including repeat rides"
        />
        <Tile
          label="Most ridden"
          value={stats.mostRidden ? String(stats.mostRidden.rides) : '—'}
          hint={
            stats.mostRidden
              ? `${stats.mostRidden.name}, ${stats.mostRidden.park}`
              : 'Log a ride to see this'
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <BreakdownList title="Credits by country" items={stats.byCountry} />
        <BreakdownList title="Credits by manufacturer" items={stats.byManufacturer} />
        <BreakdownList title="Credits by type" items={stats.byType} />
      </div>
    </section>
  );
}
