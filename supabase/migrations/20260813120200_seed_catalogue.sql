-- Seed catalogue: real coasters spanning multiple countries, manufacturers, and
-- types, sized to the 30-50 range the requirements call for.
--
-- This is ticket 02's acceptance criterion, landed with ticket 01 because the
-- direct-API access-matrix tests need real catalogue rows to exercise ride
-- inserts and catalogue-mutation rejection against.
--
-- Written as a migration rather than supabase/seed.sql so `supabase db push`
-- reproduces it on a hosted project, not only on a local reset.
-- Idempotent via the (name, park) unique constraint.

insert into public.coasters (name, park, country, manufacturer, type) values
  ('Steel Vengeance', 'Cedar Point', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('Millennium Force', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  ('Maverick', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  ('Top Thrill 2', 'Cedar Point', 'United States', 'Zamperla', 'Steel'),
  ('Fury 325', 'Carowinds', 'United States', 'Bolliger & Mabillard', 'Steel'),
  ('Iron Gwazi', 'Busch Gardens Tampa Bay', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('VelociCoaster', 'Universal Islands of Adventure', 'United States', 'Intamin', 'Steel'),
  ('El Toro', 'Six Flags Great Adventure', 'United States', 'Intamin', 'Wooden'),
  ('Nitro', 'Six Flags Great Adventure', 'United States', 'Bolliger & Mabillard', 'Steel'),
  ('X2', 'Six Flags Magic Mountain', 'United States', 'Arrow Dynamics', 'Steel'),
  ('Twisted Colossus', 'Six Flags Magic Mountain', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('Lightning Rod', 'Dollywood', 'United States', 'Rocky Mountain Construction', 'Wooden'),
  ('The Voyage', 'Holiday World', 'United States', 'The Gravity Group', 'Wooden'),
  ('Boulder Dash', 'Lake Compounce', 'United States', 'Custom Coasters International', 'Wooden'),
  ('Phoenix', 'Knoebels', 'United States', 'Philadelphia Toboggan Coasters', 'Wooden'),
  ('Nemesis Reborn', 'Alton Towers', 'United Kingdom', 'Bolliger & Mabillard', 'Inverted'),
  ('The Smiler', 'Alton Towers', 'United Kingdom', 'Gerstlauer', 'Steel'),
  ('Wicker Man', 'Alton Towers', 'United Kingdom', 'Great Coasters International', 'Wooden'),
  ('Stealth', 'Thorpe Park', 'United Kingdom', 'Intamin', 'Steel'),
  ('The Big One', 'Blackpool Pleasure Beach', 'United Kingdom', 'Arrow Dynamics', 'Steel'),
  ('Icon', 'Blackpool Pleasure Beach', 'United Kingdom', 'Mack Rides', 'Steel'),
  ('Silver Star', 'Europa-Park', 'Germany', 'Bolliger & Mabillard', 'Steel'),
  ('Blue Fire Megacoaster', 'Europa-Park', 'Germany', 'Mack Rides', 'Steel'),
  ('Wodan Timbur Coaster', 'Europa-Park', 'Germany', 'Great Coasters International', 'Wooden'),
  ('Taron', 'Phantasialand', 'Germany', 'Intamin', 'Steel'),
  ('Black Mamba', 'Phantasialand', 'Germany', 'Bolliger & Mabillard', 'Inverted'),
  ('Schwur des Kärnan', 'Hansa-Park', 'Germany', 'Gerstlauer', 'Steel'),
  ('Baron 1898', 'Efteling', 'Netherlands', 'Bolliger & Mabillard', 'Dive'),
  ('Python', 'Efteling', 'Netherlands', 'Vekoma', 'Steel'),
  ('Untamed', 'Walibi Holland', 'Netherlands', 'Rocky Mountain Construction', 'Hybrid'),
  ('Kondaa', 'Walibi Belgium', 'Belgium', 'Intamin', 'Steel'),
  ('Shambhala', 'PortAventura Park', 'Spain', 'Bolliger & Mabillard', 'Steel'),
  ('Red Force', 'Ferrari Land', 'Spain', 'Intamin', 'Steel'),
  ('Zadra', 'Energylandia', 'Poland', 'Rocky Mountain Construction', 'Hybrid'),
  ('Hyperion', 'Energylandia', 'Poland', 'Intamin', 'Steel'),
  ('Helix', 'Liseberg', 'Sweden', 'Mack Rides', 'Steel'),
  ('Valkyria', 'Liseberg', 'Sweden', 'Bolliger & Mabillard', 'Dive'),
  ('Steel Dragon 2000', 'Nagashima Spa Land', 'Japan', 'Morgan', 'Steel'),
  ('Leviathan', 'Canada''s Wonderland', 'Canada', 'Bolliger & Mabillard', 'Steel'),
  ('DC Rivals HyperCoaster', 'Warner Bros. Movie World', 'Australia', 'Mack Rides', 'Steel')
on conflict (name, park) do nothing;
