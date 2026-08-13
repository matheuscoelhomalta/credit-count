/**
 * Date handling for ride dates.
 *
 * A ride date is a calendar day in the rider's own timezone, not an instant.
 * The server and database only know UTC, so anywhere east of UTC would other-
 * wise be unable to log a ride taken "today": at 09:00 in New Zealand it is
 * still yesterday in UTC. Every layer therefore allows one day of slack ahead
 * of the UTC date rather than pinning to it exactly.
 */

/** Today's calendar date in the caller's own timezone, as YYYY-MM-DD. */
export function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** The latest date any timezone could currently call "today", as YYYY-MM-DD. */
export function maxAcceptableRideDate(): string {
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrowUtc.toISOString().slice(0, 10);
}

export function isValidRideDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Reject a malformed-but-parseable value like 2026-02-31.
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  return value <= maxAcceptableRideDate();
}
