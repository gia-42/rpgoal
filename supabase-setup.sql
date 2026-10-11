-- RPGoal: one save per player (current career + Hall of Fame).
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.

create table if not exists public.rpgoal_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  career     jsonb,
  hof        jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rpgoal_saves enable row level security;

drop policy if exists "rpgoal read own save"   on public.rpgoal_saves;
drop policy if exists "rpgoal insert own save" on public.rpgoal_saves;
drop policy if exists "rpgoal update own save" on public.rpgoal_saves;
drop policy if exists "rpgoal delete own save" on public.rpgoal_saves;

create policy "rpgoal read own save"   on public.rpgoal_saves for select using (auth.uid() = user_id);
create policy "rpgoal insert own save" on public.rpgoal_saves for insert with check (auth.uid() = user_id);
create policy "rpgoal update own save" on public.rpgoal_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rpgoal delete own save" on public.rpgoal_saves for delete using (auth.uid() = user_id);
