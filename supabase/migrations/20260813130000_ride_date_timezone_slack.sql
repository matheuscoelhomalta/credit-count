-- A ride date is a calendar day in the rider's own timezone, but the database
-- only knows UTC. Pinning the constraint to the UTC date made it impossible for
-- anyone east of UTC to log a ride taken today: at 09:00 in New Zealand it is
-- still the previous day in UTC, so the row was rejected outright.
--
-- One day of slack is the smallest correct fix. It still prevents a ride being
-- backdated into the future in any meaningful sense, because no timezone is
-- more than roughly 14 hours ahead of UTC.

alter table public.rides
  drop constraint rides_ridden_on_not_future;

alter table public.rides
  add constraint rides_ridden_on_not_future
  check (ridden_on <= ((now() at time zone 'utc')::date + 1));
