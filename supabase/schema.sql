-- Gig Log launch schema / migration. Safe to run more than once.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  home_city text,
  avatar_url text,
  favourite_genres text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists favourite_genres text[] default '{}';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_name text not null,
  venue_name text not null,
  festival_name text,
  event_date date not null,
  overall_rating int not null check (overall_rating between 1 and 5),
  performance_rating int check (performance_rating between 1 and 5),
  sound_rating int check (sound_rating between 1 and 5),
  crowd_rating int check (crowd_rating between 1 and 5),
  venue_rating int check (venue_rating between 1 and 5),
  value_rating int check (value_rating between 1 and 5),
  notes text,
  setlist text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gigs add column if not exists event_type text not null default 'gig';
alter table public.gigs add column if not exists city text;
alter table public.gigs add column if not exists country text;
alter table public.gigs add column if not exists ticket_url text;
alter table public.gigs add column if not exists photo_urls text[] default '{}';
alter table public.gigs add column if not exists is_public boolean not null default true;
alter table public.gigs add column if not exists festival_artists jsonb not null default '[]'::jsonb;
alter table public.gigs add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.gigs add constraint gigs_event_type_check check (event_type in ('gig','festival','club-night','comedy','other'));
exception when duplicate_object then null; end $$;

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.review_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  gig_id uuid references public.gigs(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(user_id,gig_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gigs_user_id_idx on public.gigs(user_id);
create index if not exists gigs_event_date_idx on public.gigs(event_date desc);
create index if not exists gigs_artist_name_idx on public.gigs(lower(artist_name));
create index if not exists gigs_venue_name_idx on public.gigs(lower(venue_name));
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists comments_gig_idx on public.comments(gig_id,created_at);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,display_name)
  values(
    new.id,
    coalesce(nullif(regexp_replace(lower(split_part(new.email,'@',1)),'[^a-z0-9_]','','g'),''),'fan')||'_'||substr(new.id::text,1,6),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1))
  ) on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace view public.venue_stats as
select venue_name, count(*)::int visits, avg(coalesce(venue_rating,overall_rating))::numeric(3,2) average
from public.gigs where is_public=true group by venue_name;
create or replace view public.festival_stats as
select festival_name, count(*)::int visits, avg(overall_rating)::numeric(3,2) average
from public.gigs where is_public=true and festival_name is not null and festival_name <> '' group by festival_name;

alter table public.profiles enable row level security;
alter table public.gigs enable row level security;
alter table public.follows enable row level security;
alter table public.review_likes enable row level security;
alter table public.comments enable row level security;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles public read" on public.profiles for select to anon,authenticated using(true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy "profiles own update" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

drop policy if exists "gigs public read" on public.gigs;
drop policy if exists "gigs own insert" on public.gigs;
drop policy if exists "gigs own update" on public.gigs;
drop policy if exists "gigs own delete" on public.gigs;
create policy "gigs public read" on public.gigs for select to anon,authenticated using(is_public=true or auth.uid()=user_id);
create policy "gigs own insert" on public.gigs for insert to authenticated with check(auth.uid()=user_id);
create policy "gigs own update" on public.gigs for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "gigs own delete" on public.gigs for delete to authenticated using(auth.uid()=user_id);

drop policy if exists "follows public read" on public.follows;
drop policy if exists "follows own insert" on public.follows;
drop policy if exists "follows own delete" on public.follows;
create policy "follows public read" on public.follows for select to anon,authenticated using(true);
create policy "follows own insert" on public.follows for insert to authenticated with check(auth.uid()=follower_id);
create policy "follows own delete" on public.follows for delete to authenticated using(auth.uid()=follower_id);

drop policy if exists "likes public read" on public.review_likes;
drop policy if exists "likes own insert" on public.review_likes;
drop policy if exists "likes own delete" on public.review_likes;
create policy "likes public read" on public.review_likes for select to anon,authenticated using(true);
create policy "likes own insert" on public.review_likes for insert to authenticated with check(auth.uid()=user_id);
create policy "likes own delete" on public.review_likes for delete to authenticated using(auth.uid()=user_id);

drop policy if exists "comments public read" on public.comments;
drop policy if exists "comments own insert" on public.comments;
drop policy if exists "comments own update" on public.comments;
drop policy if exists "comments own delete" on public.comments;
create policy "comments public read" on public.comments for select to anon,authenticated using(true);
create policy "comments own insert" on public.comments for insert to authenticated with check(auth.uid()=user_id);
create policy "comments own update" on public.comments for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "comments own delete" on public.comments for delete to authenticated using(auth.uid()=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gig-photos','gig-photos',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=8388608;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880;

drop policy if exists "public image read" on storage.objects;
drop policy if exists "users upload own images" on storage.objects;
drop policy if exists "users update own images" on storage.objects;
drop policy if exists "users delete own images" on storage.objects;
create policy "public image read" on storage.objects for select to public using(bucket_id in ('gig-photos','avatars'));
create policy "users upload own images" on storage.objects for insert to authenticated with check(bucket_id in ('gig-photos','avatars') and (storage.foldername(name))[1]=auth.uid()::text);
create policy "users update own images" on storage.objects for update to authenticated using(bucket_id in ('gig-photos','avatars') and owner_id=auth.uid()::text);
create policy "users delete own images" on storage.objects for delete to authenticated using(bucket_id in ('gig-photos','avatars') and owner_id=auth.uid()::text);

grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.gigs,public.venue_stats,public.festival_stats,public.follows,public.review_likes,public.comments to anon,authenticated;
grant insert,update,delete on public.profiles,public.gigs,public.follows,public.review_likes,public.comments to authenticated;
