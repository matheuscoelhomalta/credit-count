import Link from 'next/link';

import { signOut } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/theme-toggle';

type Destination = 'dashboard' | 'history' | 'coasters' | 'leaderboard' | 'admin';

const destinations: Array<{ id: Destination; href: string; label: string }> = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { id: 'history', href: '/history', label: 'History' },
  { id: 'coasters', href: '/coasters', label: 'Catalogue' },
  { id: 'leaderboard', href: '/leaderboard', label: 'Leaderboard' },
  { id: 'admin', href: '/admin', label: 'Admin' },
];

export function AppHeader({
  title,
  subtitle,
  active,
  isAdmin = false,
}: {
  title: string;
  subtitle: string;
  active: Destination;
  isAdmin?: boolean;
}) {
  const visibleDestinations = destinations.filter(
    (destination) => destination.id !== 'admin' || isAdmin,
  );

  return (
    <header>
      {/* The chrome is an ink plate rather than an edge-to-edge bar: it stays
          inside the content column, so it cannot overflow at phone width. */}
      <div className="flex flex-col gap-2.5 rounded bg-[var(--plate)] px-4 py-3 text-[var(--on-plate)] sm:flex-row sm:items-center sm:gap-5">
        <Link
          className="cc-display w-fit shrink-0 whitespace-nowrap text-base text-[var(--on-plate)]"
          href="/dashboard"
        >
          CREDIT COUNT
        </Link>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:ml-auto">
          <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-1">
            {visibleDestinations.map((destination) => {
              const current = destination.id === active;
              return (
                <Link
                  key={destination.id}
                  aria-current={current ? 'page' : undefined}
                  className={`rounded-[3px] px-2.5 py-1.5 text-[13px] transition-colors sm:text-sm ${
                    current
                      ? 'bg-[var(--signal)] font-bold text-[var(--on-signal)]'
                      : 'text-[var(--on-plate)]/75 hover:bg-white/10 hover:text-[var(--on-plate)]'
                  }`}
                  href={destination.href}
                >
                  {destination.label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle onPlate />

          {/* Set apart by treatment rather than by a divider rule: the row wraps
              on narrow containers as well as narrow viewports, and a rule left
              hanging at the start of a wrapped line separates nothing. */}
          <form action={signOut}>
            <button
              className="rounded-[3px] border border-white/40 px-2.5 py-1 text-[13px] text-[var(--on-plate)]/80 transition-colors hover:border-white/70 hover:bg-white/10 hover:text-[var(--on-plate)] sm:text-sm"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <h1 className="cc-display text-[1.75rem] sm:text-[2.125rem]">{title}</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--ink-soft)]">{subtitle}</p>
      </div>
    </header>
  );
}
