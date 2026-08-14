import Link from 'next/link';

import { signOut } from '@/app/auth/actions';

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
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 dark:border-white/15 sm:flex-row sm:items-center">
        <Link className="w-fit text-lg font-semibold tracking-tight" href="/dashboard">
          Credit Count
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-1">
            {visibleDestinations.map((destination) => {
              const current = destination.id === active;
              return (
                <Link
                  key={destination.id}
                  aria-current={current ? 'page' : undefined}
                  className={`rounded-md px-2.5 py-1.5 text-sm ${
                    current
                      ? 'bg-foreground font-semibold text-background'
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  href={destination.href}
                >
                  {destination.label}
                </Link>
              );
            })}
          </nav>

          <form className="border-l border-black/15 pl-3 dark:border-white/20" action={signOut}>
            <button
              className="rounded-md px-1.5 py-1.5 text-sm underline-offset-4 hover:underline"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm opacity-70">{subtitle}</p>
      </div>
    </header>
  );
}
