'use client';

import { useState, useTransition } from 'react';

import { createCoaster, setCoasterActive, updateCoaster } from '@/app/admin/actions';
import type { CoasterSummary } from '@/lib/rides';

const field =
  'w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black dark:border-white/20 dark:focus:border-white';
const smallButton =
  'rounded-md border border-black/15 px-2.5 py-1.5 text-sm dark:border-white/20';

const FIELDS = [
  { name: 'name', label: 'Name' },
  { name: 'park', label: 'Park' },
  { name: 'country', label: 'Country' },
  { name: 'manufacturer', label: 'Manufacturer' },
  { name: 'type', label: 'Type' },
] as const;

export function NewCoasterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createCoaster({ error: null }, formData);
      setError(result.error);
      if (!result.error) form.reset();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 p-4 dark:border-white/15 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Add a coaster</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mb-1.5 block text-sm font-medium" htmlFor={`new-${f.name}`}>
              {f.label}
            </label>
            <input id={`new-${f.name}`} name={f.name} className={field} type="text" required />
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        className="mt-4 w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-60 sm:w-auto"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Adding…' : 'Add coaster'}
      </button>
    </form>
  );
}

export function CoasterAdminRow({ coaster }: { coaster: CoasterSummary }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCoaster({ error: null }, formData);
      setError(result.error);
      if (!result.error) setEditing(false);
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await setCoasterActive(coaster.id, !coaster.active);
      setError(result.error);
    });
  }

  return (
    <li className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="hidden" name="coasterId" value={coaster.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <input
                key={f.name}
                name={f.name}
                aria-label={`${f.label} of ${coaster.name}`}
                className={field}
                type="text"
                required
                defaultValue={coaster[f.name]}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button className={smallButton} type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              className={smallButton}
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">
              {coaster.name}
              {!coaster.active && (
                <span className="ml-2 rounded border border-black/15 px-1.5 py-0.5 text-xs font-normal opacity-70 dark:border-white/20">
                  Retired
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm opacity-70">
              {coaster.park}, {coaster.country}
            </p>
            <p className="mt-0.5 text-sm opacity-60">
              {coaster.manufacturer} · {coaster.type}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className={smallButton}
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${coaster.name}`}
            >
              Edit
            </button>
            {/* Retirement rather than deletion: existing rides must survive. */}
            <button
              className={smallButton}
              type="button"
              onClick={toggleActive}
              disabled={pending}
              aria-label={`${coaster.active ? 'Retire' : 'Restore'} ${coaster.name}`}
            >
              {coaster.active ? 'Retire' : 'Restore'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}
