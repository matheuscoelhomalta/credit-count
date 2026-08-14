-- Narrow the catalogue write grants to the columns an administrator actually
-- edits. The policies already restrict these operations to admins, but the
-- grant was table-wide, so an admin calling the Data API directly could set
-- `id`, `created_at`, or `updated_at` on a coaster. Reassigning `id` is the
-- damaging one: rides reference it, so it would either fail the foreign key or
-- silently repoint history.
--
-- This is the same rule already applied to rides: the columns a role may write
-- are a privilege, not something the application is trusted to leave alone.

revoke insert, update on public.coasters from authenticated;

grant insert (name, park, country, manufacturer, type)
  on public.coasters to authenticated;

-- `active` is update-only: retirement is a later decision, and a coaster is
-- always created active.
grant update (name, park, country, manufacturer, type, active)
  on public.coasters to authenticated;
