'use client';

import { useState, useTransition } from 'react';

import { setLeaderboardOptIn } from '@/app/account/actions';

export function LeaderboardToggle({ optedIn }: { optedIn: boolean }) {
  const [current, setCurrent] = useState(optedIn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !current;
    startTransition(async () => {
      const result = await setLeaderboardOptIn(next);
      setError(result.error);
      // Trust the value the database returned rather than the one we requested.
      if (typeof result.optedIn === 'boolean') setCurrent(result.optedIn);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={current}
        className="cc-btn-quiet"
      >
        {pending
          ? 'Saving…'
          : current
            ? 'Leave the public leaderboard'
            : 'Join the public leaderboard'}
      </button>
      <p className="text-xs text-[var(--ink-soft)]">
        {current
          ? 'Your display name and credit count are public.'
          : 'Only your display name and credit count would ever be shared.'}
      </p>
      {error && (
        <p role="alert" className="cc-notice cc-alert">
          {error}
        </p>
      )}
    </div>
  );
}
