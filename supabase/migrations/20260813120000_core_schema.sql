-- Credit Count core schema: profiles, coasters, rides.
-- Grants and Row Level Security are established separately in the next migration;
-- this file defines only structure, constraints, and supporting triggers.

create extension if not exists pgcrypto with schema extensions;

-- Shared updated_at maintenance. Empty search_path keeps the function immune to
-- resolution hijacking if a caller sets a permissive path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    char_length(trim(display_name)) between 2 and 40
  )
);

comment on column public.profiles.leaderboard_opt_in is
  'Public ranking participation. Defaults to false so every new profile is private until the user opts in.';

create table public.coasters (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  park text not null,
  country text not null,
  manufacturer text not null,
  type text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coasters_name_length check (char_length(trim(name)) between 1 and 120),
  constraint coasters_park_length check (char_length(trim(park)) between 1 and 120),
  constraint coasters_country_length check (char_length(trim(country)) between 1 and 80),
  constraint coasters_manufacturer_length check (char_length(trim(manufacturer)) between 1 and 80),
  constraint coasters_type_length check (char_length(trim(type)) between 1 and 40),
  constraint coasters_unique_name_per_park unique (name, park)
);

comment on column public.coasters.active is
  'Soft-retirement flag. Admin removal sets this false so referencing ride history survives.';

create table public.rides (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Defaulting to auth.uid() lets us withhold the INSERT column privilege on
  -- user_id entirely, so ownership cannot be forged from the Data API.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Restricted, not cascaded: a referenced coaster must be retired, never deleted.
  coaster_id uuid not null references public.coasters (id) on delete restrict,
  ridden_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rides_note_length check (note is null or char_length(note) <= 280),
  constraint rides_ridden_on_not_future check (ridden_on <= (now() at time zone 'utc')::date)
);

create index profiles_leaderboard_opt_in_idx
  on public.profiles (leaderboard_opt_in)
  where leaderboard_opt_in;

create index coasters_active_idx on public.coasters (active) where active;

create index rides_user_id_idx on public.rides (user_id);
create index rides_user_coaster_idx on public.rides (user_id, coaster_id);
create index rides_coaster_id_idx on public.rides (coaster_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger coasters_set_updated_at
  before update on public.coasters
  for each row execute function public.set_updated_at();

create trigger rides_set_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

-- Sign-up creates the auth user before any session exists, so the profile row is
-- created here rather than from the client. SECURITY DEFINER is required to write
-- public.profiles from the auth trigger context.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
