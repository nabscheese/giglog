-- Store the lineup for festival memories and whether each act was actually seen.
alter table public.gigs
add column if not exists festival_artists jsonb not null default '[]'::jsonb;

comment on column public.gigs.festival_artists is
'Array of objects such as [{"name":"Neck Deep","seen":true,"setlist":"...","setlistUrl":"..."}]';

notify pgrst, 'reload schema';
