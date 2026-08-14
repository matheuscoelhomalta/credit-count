import type { Breakdown, RideStats } from '@/lib/rides';
import { CreditCounter } from '@/components/credit-counter';

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="cc-surface p-4">
      <p className="cc-eyebrow">{label}</p>
      <p
        className={`cc-display mt-2 tabular-nums ${
          value === '—' ? 'text-2xl font-normal text-[var(--ink-soft)]' : 'text-4xl'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-sm text-[var(--ink-soft)]">{hint}</p>}
    </div>
  );
}

function BreakdownList({ title, items }: { title: string; items: Breakdown[] }) {
  return (
    <div className="cc-surface p-4">
      <h3 className="cc-eyebrow">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">No credits yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-baseline justify-between gap-3 border-t border-[var(--rule)] py-1.5 text-sm first:border-t-0 first:pt-0"
            >
              <span className="truncate">{item.label}</span>
              <span className="cc-data text-[var(--ink-soft)]">{item.credits}</span>
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
      {/* The one loud object on the page. Everything else stays a hairline. */}
      <div className="relative overflow-hidden rounded bg-[var(--plate)] pb-5 text-[var(--on-plate)] shadow-[4px_4px_0_var(--plate-edge)]">
        <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="cc-eyebrow text-[var(--on-plate)]/65">Credits</p>
            <p
              className="cc-display mt-1 text-[4.5rem] tabular-nums text-[var(--signal)] sm:text-[5.5rem]"
              style={{ fontStretch: '125%' }}
            >
              <CreditCounter value={stats.credits} />
            </p>
          </div>
          <p className="max-w-[26ch] text-sm text-[var(--on-plate)]/70 sm:pb-4 sm:text-right">
            Distinct coasters ridden. Repeat rides are counted separately.
          </p>
        </div>
        <div aria-hidden className="cc-chevrons absolute inset-x-0 bottom-0 h-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Tile label="Total rides" value={String(stats.totalRides)} hint="Including repeat rides" />
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
