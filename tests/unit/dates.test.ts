import { describe, expect, it } from 'vitest';

import { isValidRideDate, localToday, maxAcceptableRideDate } from '@/lib/dates';

describe('ride date validation', () => {
  it('accepts a well-formed past date', () => {
    expect(isValidRideDate('2020-05-17')).toBe(true);
  });

  it('accepts the local date of a timezone ahead of UTC', () => {
    // The whole point of the slack: a rider east of UTC may already be on the
    // next calendar day, and must still be able to log today's ride.
    expect(isValidRideDate(maxAcceptableRideDate())).toBe(true);
    expect(isValidRideDate(localToday())).toBe(true);
  });

  it('rejects dates beyond the slack window', () => {
    const farFuture = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(isValidRideDate(farFuture)).toBe(false);
    expect(isValidRideDate('2099-01-01')).toBe(false);
  });

  it('rejects malformed input', () => {
    for (const value of ['', 'yesterday', '2026-1-1', '17/05/2020', '2026-05-17T00:00']) {
      expect(isValidRideDate(value)).toBe(false);
    }
  });

  it('rejects a parseable but nonexistent calendar date', () => {
    // Date would otherwise roll 2026-02-31 forward into March.
    expect(isValidRideDate('2026-02-31')).toBe(false);
  });

  it('formats local today as YYYY-MM-DD', () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('never caps a date input below what the validator accepts', () => {
    // The date inputs use maxAcceptableRideDate() as their `max`. If that were
    // ever earlier than a date isValidRideDate() accepts, the browser would
    // block a save the server would have allowed — which is exactly what
    // happened when the edit form capped at the browser's local today: a ride
    // logged at 21:00 in Brazil carries the UTC date, already tomorrow locally,
    // so the row silently refused to save.
    const max = maxAcceptableRideDate();
    expect(isValidRideDate(max)).toBe(true);
    expect(localToday() <= max).toBe(true);
  });
});
