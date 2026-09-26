-- ============================================================================
-- Poetry AI — Supabase schema (SOURCE OF TRUTH)
-- ----------------------------------------------------------------------------
-- Apply this file in the Supabase SQL editor (Dashboard > SQL Editor).
-- It is idempotent where it matters (policies/triggers are dropped first).
-- Do NOT edit the database by hand: change this file and re-apply.
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables ---------------------------------------------------------------------

-- One profile row per auth user. Created automatically on signup (see trigger).
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  roses_balance int not null default 10,
  last_monthly_grant date,   -- last calendar month the free grant was issued
  created_at   timestamptz not null default now()
);

-- Saved people: the user describes them once, then calls them by nickname.
create table if not exists public.recipients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  nickname     text,
  relationship text,
  notes        text,
  photo_url    text,
  created_at   timestamptz not null default now()
);

-- Every generation the Emotion Engine produces.
create table if not exists public.dedications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  recipient_id   uuid references public.recipients(id) on delete set null,
  format         text not null,            -- poem | letter | video | slideshow | lovi | song | quote
  emotion_target text,                     -- e.g. "hacer llorar de felicidad"
  brief          text,                      -- the user's original brief
  output         jsonb not null default '{}'::jsonb,
  roses_spent    int not null default 0,
  lovi_id        uuid references public.lovis(id) on delete set null,
  share_id       text,                      -- -> share_links.id when published
  created_at     timestamptz not null default now()
);

-- Lovis: user-created interactive dedication artifacts (community gallery).
-- `code` is a self-contained HTML document (inline CSS/JS), rendered in a
-- sandboxed iframe. `slots` declares the data contract, e.g.
-- [{"key":"photos","type":"photos[]"},{"key":"names","type":"names"},...]
-- At render time the app injects window.LOVI_DATA with the dedication's data.
create table if not exists public.lovis (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  description  text,
  code         text not null,
  slots        jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  uses_count   int not null default 0,
  likes_count  int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.lovi_uses (
  id            uuid primary key default gen_random_uuid(),
  lovi_id       uuid not null references public.lovis(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  dedication_id uuid references public.dedications(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.lovi_likes (
  lovi_id    uuid not null references public.lovis(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lovi_id, user_id)
);

-- Roses ledger: append-only. Positive delta = grant, negative = spend.
-- `profiles.roses_balance` is the cached total; keep both in sync via add_roses().
create table if not exists public.roses_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  delta      int not null,
  reason     text not null,   -- signup_bonus | subscription | topup | generation | lovi_create | ...
  ref        text,            -- polar event id, dedication id, ...
  created_at timestamptz not null default now()
);

-- Polar webhook idempotency log. Service-role only (no RLS policies).
create table if not exists public.polar_events (
  event_id     text primary key,
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

-- Public share links: /s/[id]. Unpredictable ids (use gen_random_uuid hex).
create table if not exists public.share_links (
  id            text primary key,
  dedication_id uuid references public.dedications(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- Indexes --------------------------------------------------------------------
create index if not exists recipients_user_id_idx      on public.recipients(user_id);
create index if not exists dedications_user_id_idx     on public.dedications(user_id);
create index if not exists dedications_created_at_idx  on public.dedications(created_at desc);
create index if not exists lovis_creator_id_idx        on public.lovis(creator_id);
create index if not exists lovis_created_at_idx        on public.lovis(created_at desc);
create index if not exists lovi_uses_lovi_id_idx       on public.lovi_uses(lovi_id);
create index if not exists lovi_uses_user_id_idx       on public.lovi_uses(user_id);
create index if not exists roses_ledger_user_id_idx    on public.roses_ledger(user_id);
create index if not exists roses_ledger_created_at_idx on public.roses_ledger(created_at desc);
create index if not exists share_links_dedication_idx  on public.share_links(dedication_id);

-- Helpers --------------------------------------------------------------------

-- Atomic roses mutation: appends to the ledger and updates the cached balance.
-- Call from server code with the service-role key.
create or replace function public.add_roses(
  p_user_id uuid,
  p_delta   int,
  p_reason  text,
  p_ref     text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  insert into public.roses_ledger (user_id, delta, reason, ref)
  values (p_user_id, p_delta, p_reason, p_ref);

  update public.profiles
  set roses_balance = roses_balance + p_delta
  where id = p_user_id
  returning roses_balance into v_balance;

  return v_balance;
end;
$$;

-- Auto-create a profile (with the free signup roses) on new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, last_monthly_grant)
  values (new.id, new.raw_user_meta_data ->> 'display_name', date_trunc('month', now())::date)
  on conflict (id) do nothing;

  insert into public.roses_ledger (user_id, delta, reason)
  values (new.id, 10, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic spend with insufficient-funds guard. Throws when the balance is
-- too low, so the check and the mutation can never race. Call via service role.
create or replace function public.spend_roses(
  p_user_id uuid,
  p_amount  int,
  p_reason  text,
  p_ref     text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount <= 0 then
    raise exception 'spend_roses: amount must be positive';
  end if;

  update public.profiles
  set roses_balance = roses_balance - p_amount
  where id = p_user_id
    and roses_balance >= p_amount
  returning roses_balance into v_balance;

  if not found then
    raise exception 'insufficient_roses';
  end if;

  insert into public.roses_ledger (user_id, delta, reason, ref)
  values (p_user_id, -p_amount, p_reason, p_ref);

  return v_balance;
end;
$$;

-- Monthly free grant (20 roses): idempotent per calendar month.
-- Call at the start of every spend-gated generation; no-ops when already granted.
create or replace function public.ensure_monthly_grant(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', now())::date;
  v_balance int;
begin
  update public.profiles
  set roses_balance = roses_balance + 20,
      last_monthly_grant = v_month_start
  where id = p_user_id
    and (last_monthly_grant is null or last_monthly_grant < v_month_start)
  returning roses_balance into v_balance;

  if found then
    insert into public.roses_ledger (user_id, delta, reason)
    values (p_user_id, 20, 'monthly_grant');
  else
    select roses_balance into v_balance
    from public.profiles where id = p_user_id;
  end if;

  return v_balance;
end;
$$;

-- Storage --------------------------------------------------------------------
-- Public bucket for dedication photos (slideshow uploads, Lovi photos).
-- The app uploads client-side with the anon key; files are public-read.
insert into storage.buckets (id, name, public)
values ('dedications', 'dedications', true)
on conflict (id) do nothing;

drop policy if exists "dedications_public_read" on storage.objects;
create policy "dedications_public_read" on storage.objects
  for select using (bucket_id = 'dedications');

drop policy if exists "dedications_auth_insert" on storage.objects;
create policy "dedications_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'dedications' and auth.role() = 'authenticated'
  );

drop policy if exists "dedications_auth_delete" on storage.objects;
create policy "dedications_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'dedications' and auth.role() = 'authenticated'
  );

-- Row Level Security ---------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.recipients    enable row level security;
alter table public.dedications  enable row level security;
alter table public.lovis        enable row level security;
alter table public.lovi_uses    enable row level security;
alter table public.lovi_likes   enable row level security;
alter table public.roses_ledger enable row level security;
alter table public.polar_events enable row level security;
alter table public.share_links  enable row level security;

-- profiles: users see/update/insert their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- recipients: users manage their own people
drop policy if exists "recipients_all_own" on public.recipients;
create policy "recipients_all_own" on public.recipients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- dedications: users manage their own generations
drop policy if exists "dedications_all_own" on public.dedications;
create policy "dedications_all_own" on public.dedications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- lovis: public gallery — anyone reads, creators manage their own
drop policy if exists "lovis_select_public" on public.lovis;
create policy "lovis_select_public" on public.lovis
  for select using (true);

drop policy if exists "lovis_insert_own" on public.lovis;
create policy "lovis_insert_own" on public.lovis
  for insert with check (auth.uid() = creator_id);

drop policy if exists "lovis_update_own" on public.lovis;
create policy "lovis_update_own" on public.lovis
  for update using (auth.uid() = creator_id);

drop policy if exists "lovis_delete_own" on public.lovis;
create policy "lovis_delete_own" on public.lovis
  for delete using (auth.uid() = creator_id);

-- lovi_uses: public read, users log their own uses
drop policy if exists "lovi_uses_select_public" on public.lovi_uses;
create policy "lovi_uses_select_public" on public.lovi_uses
  for select using (true);

drop policy if exists "lovi_uses_insert_own" on public.lovi_uses;
create policy "lovi_uses_insert_own" on public.lovi_uses
  for insert with check (auth.uid() = user_id);

-- lovi_likes: public read, users manage their own likes
drop policy if exists "lovi_likes_select_public" on public.lovi_likes;
create policy "lovi_likes_select_public" on public.lovi_likes
  for select using (true);

drop policy if exists "lovi_likes_all_own" on public.lovi_likes;
create policy "lovi_likes_all_own" on public.lovi_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- roses_ledger: users read their own history (writes via service role / add_roses)
drop policy if exists "roses_ledger_select_own" on public.roses_ledger;
create policy "roses_ledger_select_own" on public.roses_ledger
  for select using (auth.uid() = user_id);

-- polar_events: NO policies — service_role bypasses RLS; everyone else denied.

-- share_links: public read; users can publish links for their own dedications
drop policy if exists "share_links_select_public" on public.share_links;
create policy "share_links_select_public" on public.share_links
  for select using (true);

drop policy if exists "share_links_insert_own" on public.share_links;
create policy "share_links_insert_own" on public.share_links
  for insert with check (
    dedication_id is null
    or exists (
      select 1 from public.dedications d
      where d.id = dedication_id and d.user_id = auth.uid()
    )
  );
