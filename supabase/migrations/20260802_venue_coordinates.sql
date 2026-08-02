alter table public.gigs
add column if not exists latitude double precision,
add column if not exists longitude double precision;

notify pgrst, 'reload schema';
