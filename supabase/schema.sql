-- Algebra Teacher AI schema. Run in the Supabase SQL editor.
-- Every table is protected by row level security: a user can only touch their own rows.

create extension if not exists "pgcrypto";

-- Profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_date date,
  skill_mastery jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Folders --------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create index if not exists folders_user_idx on public.folders (user_id);

alter table public.folders enable row level security;
drop policy if exists "folders_all_own" on public.folders;
create policy "folders_all_own" on public.folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Solutions ------------------------------------------------------------------
create table if not exists public.solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  title text not null,
  problem_latex text not null,
  topic text not null default '',
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists solutions_user_idx on public.solutions (user_id, created_at desc);
create index if not exists solutions_folder_idx on public.solutions (folder_id);

alter table public.solutions enable row level security;
drop policy if exists "solutions_all_own" on public.solutions;
create policy "solutions_all_own" on public.solutions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Practice tests -------------------------------------------------------------
create table if not exists public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  level text not null check (level in ('same', 'hard', 'ap')),
  questions jsonb not null,
  responses jsonb not null default '{}'::jsonb,
  score numeric,
  max_score numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists practice_tests_user_idx on public.practice_tests (user_id, created_at desc);

alter table public.practice_tests enable row level security;
drop policy if exists "practice_tests_all_own" on public.practice_tests;
create policy "practice_tests_all_own" on public.practice_tests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
