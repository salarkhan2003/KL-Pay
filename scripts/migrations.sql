-- ============================================================
-- KL-Pay: Cumulative Migrations
-- Run this in Supabase SQL Editor → Run
-- Safe to re-run — uses IF NOT EXISTS / DO $$ blocks throughout
-- ============================================================

-- ── 0. Fix Supabase auth trigger conflict ────────────────────────────────────
-- Supabase creates a trigger `on_auth_user_created` that inserts into
-- public.users by default. If that table doesn't exist OR your profiles
-- table has NOT NULL constraints the trigger can't satisfy, signUp fails
-- with "Database error saving new user". This block neutralises it safely.

-- Drop the default trigger if it exists (safe — recreated below if needed)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Create a safe trigger function that upserts into profiles with only
-- the columns we know exist, using ON CONFLICT DO NOTHING as fallback
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, phone, student_id, gender, hostel, k_coins, streak, block)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'student',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'hostel',
    0,
    0,
    'CSE'
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block auth even if profile insert fails
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


alter table public.profiles add column if not exists block              text default 'CSE';
alter table public.profiles add column if not exists gender             text;
alter table public.profiles add column if not exists hostel             text;
alter table public.profiles add column if not exists student_id         text;
alter table public.profiles add column if not exists merchant_outlet_id text;
alter table public.profiles add column if not exists streak             integer not null default 0;
alter table public.profiles add column if not exists k_coins            integer not null default 0;
alter table public.profiles add column if not exists updated_at         timestamptz default now();

-- ── 2. outlets — add all missing columns ─────────────────────────────────────
alter table public.outlets add column if not exists block_name  text default '';
alter table public.outlets add column if not exists upi_id      text default '';
alter table public.outlets add column if not exists timings     text;
alter table public.outlets add column if not exists rating      numeric(3,1) default 4.0;
alter table public.outlets add column if not exists category    text default 'Meals';
alter table public.outlets add column if not exists merchant_id text default '';
alter table public.outlets add column if not exists updated_at  timestamptz default now();

-- ── 3. orders — add all missing columns ──────────────────────────────────────
alter table public.orders add column if not exists convenience_fee numeric(10,2) default 0;
alter table public.orders add column if not exists vendor_amount   numeric(10,2) default 0;
alter table public.orders add column if not exists user_name       text default '';
alter table public.orders add column if not exists user_phone      text default '';
alter table public.orders add column if not exists token           text;

-- ── 4. transactions — add all missing columns ────────────────────────────────
alter table public.transactions add column if not exists note                text;
alter table public.transactions add column if not exists cashfree_payment_id text;
alter table public.transactions add column if not exists order_id            text;
alter table public.transactions add column if not exists token               text;
alter table public.transactions add column if not exists created_at          timestamptz default now();

-- ── 5. support_tickets — add all missing columns ─────────────────────────────
alter table public.support_tickets add column if not exists user_id    text;
alter table public.support_tickets add column if not exists subject    text default '';
alter table public.support_tickets add column if not exists message    text default '';
alter table public.support_tickets add column if not exists status     text default 'open';
alter table public.support_tickets add column if not exists created_at timestamptz default now();

-- ── 6. RLS — drop all old policies, re-grant, recreate open policies ─────────
do $$
declare r record;
begin
  for r in (select schemaname, tablename, policyname from pg_policies where schemaname = 'public') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.profiles        disable row level security;
alter table public.outlets         disable row level security;
alter table public.menu_items      disable row level security;
alter table public.orders          disable row level security;
alter table public.transactions    disable row level security;
alter table public.support_tickets disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

alter table public.profiles        enable row level security;
alter table public.outlets         enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;
alter table public.support_tickets enable row level security;

create policy "allow_all_profiles"        on public.profiles        for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_outlets"         on public.outlets         for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_menu_items"      on public.menu_items      for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_orders"          on public.orders          for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_transactions"    on public.transactions    for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_support_tickets" on public.support_tickets for all to anon, authenticated, service_role using (true) with check (true);

-- ── 7. Realtime — enable on all tables (skips if already added) ──────────────
do $$
declare tbl text;
begin
  foreach tbl in array array['profiles','outlets','menu_items','orders','transactions','support_tickets'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when others then null; -- already a member, skip
    end;
  end loop;
end $$;

-- ── 8. Verify — shows table names + column counts ────────────────────────────
select t.table_name, count(c.column_name) as columns
from information_schema.tables t
join information_schema.columns c
  on c.table_name = t.table_name and c.table_schema = 'public'
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
group by t.table_name
order by t.table_name;

-- ── 9. Verify outlets + menu_items columns exist (run if saves still fail) ────
-- These are the exact columns the app writes — if any are missing, upsert fails
alter table public.outlets add column if not exists image_url   text default '';
alter table public.outlets add column if not exists is_open     boolean not null default true;
alter table public.outlets add column if not exists name        text;
alter table public.outlets add column if not exists description text default '';

alter table public.menu_items add column if not exists image_url    text default '';
alter table public.menu_items add column if not exists is_available boolean not null default true;
alter table public.menu_items add column if not exists prep_time    text default '10m';
alter table public.menu_items add column if not exists description  text default '';
alter table public.menu_items add column if not exists outlet_id    text;
alter table public.menu_items add column if not exists price        numeric(10,2);

-- Confirm what columns each table has right now
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('outlets', 'menu_items')
order by table_name, ordinal_position;
