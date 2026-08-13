'use client';

import { useMemo, useRef, useState, useTransition } from 'react';

import { logRide } from '@/app/rides/actions';
import type { CoasterSummary } from '@/lib/rides';

// R-005 caps this at three interactions from the dashboard. The date is
// pre-filled with today and the note is optional, so the floor is:
// pick a coaster (1) -> submit (2).
export function LogRideForm({
  coasters,
  today,
}: {
  coasters: CoasterSummary[];
  today: string;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CoasterSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coasters.slice(0, 8);
    return coasters
      .filter((c) =>
        `${c.name} ${c.park} ${c.country} ${c.manufacturer}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [coasters, query]);

  // Invoked directly rather than via useActionState so the form reset happens
  // in the async callback instead of an effect reacting to the result.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await logRide({ error: null }, formData);
      setError(result.error);
      if (!result.error) {
        form.reset();
        setSelected(null);
        setQuery('');
        setOpen(false);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 p-4 dark:border-white/15 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Log a ride</h2>

      <input type="hidden" name="coasterId" value={selected?.id ?? ''} />

      <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
        {/* Closing on blur needs to survive focus moving to an option button
            inside this same container, so the handler checks the new target. */}
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
        >
          <label className="mb-1.5 block text-sm font-medium" htmlFor="coaster-search">
            Coaster
          </label>
          <input
            id="coaster-search"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            type="text"
            autoComplete="off"
            placeholder="Search by name, park, country…"
            // The input always shows the raw search text. Rendering a decorated
            // "Name — Park" label here instead meant one backspace left an
            // em-dash in the query, which matches nothing and stranded the user.
            value={query}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && !selected && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-black/15 bg-background shadow-lg dark:border-white/20">
              {matches.map((coaster) => (
                <li key={coaster.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => {
                      setSelected(coaster);
                      // Keep the query in sync with the selection so editing it
                      // degrades into an ordinary search rather than a dead end.
                      setQuery(coaster.name);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{coaster.name}</span>
                    <span className="opacity-70">
                      {' '}
                      — {coaster.park}, {coaster.country}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && !selected && query.trim() && matches.length === 0 && (
            <p className="mt-1.5 text-sm opacity-70">No active coaster matches that.</p>
          )}
          {selected && (
            <p className="mt-1.5 text-sm opacity-70">
              Selected: {selected.park}, {selected.country}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="riddenOn">
            Date
          </label>
          <input
            id="riddenOn"
            name="riddenOn"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            type="date"
            required
            max={today}
            defaultValue={today}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium" htmlFor="note">
          Note <span className="font-normal opacity-60">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
          type="text"
          maxLength={280}
          placeholder="Front row at sunset"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        className="mt-4 w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-60 sm:w-auto"
        type="submit"
        disabled={pending || !selected}
      >
        {pending ? 'Logging…' : 'Log ride'}
      </button>
    </form>
  );
}
