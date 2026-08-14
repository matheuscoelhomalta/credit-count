'use client';

import { useState, useTransition } from 'react';

import { deleteRide, updateRide } from '@/app/rides/actions';
import { maxAcceptableRideDate } from '@/lib/dates';
import type { RideWithCoaster } from '@/lib/rides';

const smallButton = 'cc-btn-quiet';

export function RideRowActions({ ride }: { ride: RideWithCoaster }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The action is invoked directly rather than through useActionState so that
  // closing the editor happens in the async callback. Reacting to a result
  // inside an effect would set state during render commit.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateRide({ error: null }, formData);
      setError(result.error);
      if (!result.error) setEditing(false);
    });
  }

  // A rejected delete used to look identical to a successful one: the row
  // simply re-rendered unchanged. The result is now surfaced.
  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await deleteRide(formData);
      setError(result.error);
      if (!result.error) setConfirmingDelete(false);
    });
  }

  // Must match what the validator and the database CHECK accept, not the
  // browser's own "today". A ride logged at 21:00 in Brazil carries the UTC
  // date, which is already tomorrow locally; capping at the local date made
  // that row fail HTML validation and silently refuse to save.
  const latest = maxAcceptableRideDate();

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="w-full sm:w-auto">
        {/* Only the ride id, date, and note are submitted. The coaster and owner
            are not editable fields anywhere in this form. */}
        <input type="hidden" name="rideId" value={ride.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            aria-label="Ride date"
            className="cc-field py-1.5 text-sm sm:w-auto"
            type="date"
            name="riddenOn"
            required
            max={latest}
            defaultValue={ride.ridden_on}
          />
          <input
            aria-label="Ride note"
            className="cc-field py-1.5 text-sm"
            type="text"
            name="note"
            maxLength={280}
            placeholder="Note"
            defaultValue={ride.note ?? ''}
          />
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
        </div>
        {error && (
          <p role="alert" className="cc-alert mt-2 rounded-r">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
      {error && (
        <p role="alert" className="cc-alert w-full rounded-r text-right">
          {error}
        </p>
      )}
      <button
        className={smallButton}
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ride on ${ride.ridden_on}`}
      >
        Edit
      </button>

      {/* Two-step inline confirmation rather than a native dialog, which would
          block the page and is awkward to drive in tests. */}
      {confirmingDelete ? (
        <form onSubmit={handleDelete} className="flex gap-2">
          <input type="hidden" name="rideId" value={ride.id} />
          <button
            className="cc-btn-quiet cc-btn-danger"
            type="submit"
            disabled={pending}
          >
            {pending ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            className={smallButton}
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          className={smallButton}
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Delete ride on ${ride.ridden_on}`}
        >
          Delete
        </button>
      )}
    </div>
  );
}
