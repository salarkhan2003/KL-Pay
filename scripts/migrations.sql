-- ============================================================
-- KL-Pay: Cumulative Migrations
-- Run this in Supabase SQL Editor → Run
-- Safe to re-run — uses IF NOT EXISTS / DO $$ blocks throughout
-- ============================================================

-- ── 1. profiles — add all missing columns ────────────────────────────────────
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
