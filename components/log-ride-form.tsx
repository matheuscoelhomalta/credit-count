'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { logRide } from '@/app/rides/actions';
import { localToday, maxAcceptableRideDate } from '@/lib/dates';
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  // `today` is rendered on the server, so it is the server's calendar day —
  // UTC in production. West of UTC that is already tomorrow for several hours
  // each evening, and the rider would silently log a ride dated tomorrow.
  // The corrected value is written to the DOM after hydration rather than
  // rendered, because rendering the browser's date would mismatch the server's.
  useEffect(() => {
    if (dateRef.current) dateRef.current.value = localToday();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coasters;
    return coasters.filter((c) =>
      `${c.name} ${c.park} ${c.country} ${c.manufacturer}`.toLowerCase().includes(q),
    );
  }, [coasters, query]);
  const matches = filtered.slice(0, 8);
  const popupOpen = open && !selected && matches.length > 0;
  const listboxId = 'coaster-options';
  const guidanceId = 'coaster-guidance';

  useEffect(() => {
    if (popupOpen && activeIndex !== null) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, popupOpen]);

  function chooseCoaster(coaster: CoasterSummary) {
    setSelected(coaster);
    setQuery(coaster.name);
    setOpen(false);
    setActiveIndex(null);
    setError(null);
    setStatus(null);
  }

  function handleCoasterKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(null);
      return;
    }

    if (selected || matches.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current === null ? 0 : (current + 1) % matches.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current === null ? matches.length - 1 : (current - 1 + matches.length) % matches.length,
      );
      return;
    }

    if (event.key === 'Enter' && popupOpen) {
      const exactMatches = matches.filter(
        (coaster) => coaster.name.toLowerCase() === query.trim().toLowerCase(),
      );
      let choice = activeIndex === null ? null : matches[activeIndex];
      if (!choice && exactMatches.length === 1) choice = exactMatches[0];
      if (!choice && matches.length === 1) choice = matches[0];

      if (choice) {
        event.preventDefault();
        chooseCoaster(choice);
      }
    }
  }

  // Invoked directly rather than via useActionState so the form reset happens
  // in the async callback instead of an effect reacting to the result.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const loggedCoaster = selected;
    setStatus(null);
    startTransition(async () => {
      const result = await logRide({ error: null }, formData);
      setError(result.error);
      if (!result.error) {
        form.reset();
        // reset() restores the server-rendered date, so re-apply the correction.
        if (dateRef.current) dateRef.current.value = localToday();
        setSelected(null);
        setQuery('');
        setOpen(false);
        setActiveIndex(null);
        setStatus(loggedCoaster ? `${loggedCoaster.name} logged.` : 'Ride logged.');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 p-4 dark:border-white/15 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Log a ride</h2>

      <input type="hidden" name="coasterId" value={selected?.id ?? ''} />

      <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
        {/* Pointer selection keeps focus on the combobox. If another control
            receives focus, close the popup without changing the typed value. */}
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
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base focus:border-black dark:border-white/20 dark:focus:border-white"
            type="text"
            autoComplete="off"
            placeholder="Search by name, park, country…"
            // The input always shows the raw search text. Rendering a decorated
            // "Name — Park" label here instead meant one backspace left an
            // em-dash in the query, which matches nothing and stranded the user.
            value={query}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={popupOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              popupOpen && activeIndex !== null
                ? `${listboxId}-${matches[activeIndex].id}`
                : undefined
            }
            aria-describedby={query.trim() && !selected ? guidanceId : undefined}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(null);
              setError(null);
              setStatus(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleCoasterKeyDown}
          />
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Matching coasters"
            hidden={!popupOpen}
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-black/15 bg-background shadow-lg dark:border-white/20"
          >
            {matches.map((coaster, index) => (
              <li
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                id={`${listboxId}-${coaster.id}`}
                key={coaster.id}
                role="option"
                aria-selected={activeIndex === index}
                className={`cursor-pointer px-3 py-2 text-left text-sm ${
                  activeIndex === index
                    ? 'bg-black/10 dark:bg-white/15'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCoaster(coaster)}
              >
                <span className="font-medium">{coaster.name}</span>
                <span className="opacity-70">
                  {' '}
                  — {coaster.park}, {coaster.country}
                </span>
              </li>
            ))}
          </ul>
          {open && !selected && query.trim() && matches.length === 0 && (
            <p id={guidanceId} className="mt-1.5 text-sm opacity-70">
              No active coaster matches that.
            </p>
          )}
          {query.trim() && !selected && matches.length > 0 && (
            <p id={guidanceId} className="mt-1.5 text-sm opacity-70">
              Choose a coaster from the list.
              {filtered.length > matches.length &&
                ` Showing the first ${matches.length} of ${filtered.length} matches; keep typing to narrow them.`}
            </p>
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
            ref={dateRef}
            id="riddenOn"
            name="riddenOn"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base focus:border-black dark:border-white/20 dark:focus:border-white"
            type="date"
            required
            // Capping at `today` would lock out anyone east of UTC, who is
            // already on the next day. The cap is the same one-day slack the
            // validator and the database CHECK allow. The value itself is
            // corrected to the browser's date on mount, above.
            max={maxAcceptableRideDate()}
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
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base focus:border-black dark:border-white/20 dark:focus:border-white"
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
      {status && (
        <p role="status" className="mt-3 text-sm font-medium">
          {status}
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
