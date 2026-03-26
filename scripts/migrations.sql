-- ============================================================
-- KL-Pay: Cumulative Migrations
-- Run this in Supabase SQL Editor → Run
-- Safe to re-run — uses IF NOT EXISTS / DO blocks throughout
-- ============================================================

-- ── 1. Add missing columns to profiles ───────────────────────────────────────
-- block column (stores hostel/block name, e.g. "Vindhya Hostel", "CSE")
alter table public.profiles
  add column if not exists block text default 'CSE';

-- gender column
alter table public.profiles
  add column if not exists gender text;

-- hostel column
alter table public.profiles
  add column if not exists hostel text;

-- student_id column
alter table public.profiles
  add column if not exists student_id text;

-- merchant_outlet_id column
alter table public.profiles
  add column if not exists merchant_outlet_id text;

-- streak column
alter table public.profiles
  add column if not exists streak integer not null default 0;

-- k_coins column
alter table public.profiles
  add column if not exists k_coins integer not null default 0;

-- updated_at column
alter table public.profiles
  add column if not exists updated_at timestamptz default now();

-- ── 2. Add missing columns to outlets ────────────────────────────────────────
alter table public.outlets
  add column if not exists block_name text default '';

alter table public.outlets
  add column if not exists upi_id text default '';

alter table public.outlets
  add column if not exists timings text;

alter table public.outlets
  add column if not exists rating numeric(3,1) default 4.0;

alter table public.outlets
  add column if not exists category text default 'Meals';

alter table public.outlets
  add column if not exists merchant_id text default '';

alter table public.outlets
  add column if not exists updated_at timestamptz default now();

-- ── 3. Add missing columns to orders ─────────────────────────────────────────
alter table public.orders
  add column if not exists convenience_fee numeric(10,2) default 0;

alter table public.orders
  add column if not exists vendor_amount numeric(10,2) default 0;

alter table public.orders
  add column if not exists user_name text default '';

alter table public.orders
  add column if not exists user_phone text default '';

alter table public.orders
  add column if not exists token text;

-- ── 4. Add missing columns to transactions ───────────────────────────────────
alter table public.transactions
  add column if not exists note text;

alter table public.transactions
  add column if not exists cashfree_payment_id text;

alter table public.transactions
  add column if not exists order_id text;

alter table public.transactions
  add column if not exists token text;

alter table public.transactions
  add column if not exists created_at timestamptz default now();

-- ── 5. Add missing columns to support_tickets ────────────────────────────────
alter table public.support_tickets
  add column if not exists user_id text;

alter table public.support_tickets
  add column if not exists subject text default '';

alter table public.support_tickets
  add column if not exists message text default '';

alter table public.support_tickets
  add column if not exists status text default 'open'
    check (status in ('open', 'resolved', 'closed'));

alter table public.support_tickets
  add column if not exists created_at timestamptz default now();

-- ── 6. Ensure RLS policies allow anon + authenticated + service_role ──────────
-- Drop all existing policies first
do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Disable RLS temporarily
alter table public.profiles        disable row level security;
alter table public.outlets         disable row level security;
alter table public.menu_items      disable row level security;
alter table public.orders          disable row level security;
alter table public.transactions    disable row level security;
alter table public.support_tickets disable row level security;

-- Grant all privileges
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

-- Re-enable RLS
alter table public.profiles        enable row level security;
alter table public.outlets         enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;
alter table public.support_tickets enable row level security;

-- Open policies (campus internal app — no per-user row filtering needed)
create policy "allow_all_profiles"        on public.profiles        for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_outlets"         on public.outlets         for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_menu_items"      on public.menu_items      for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_orders"          on public.orders          for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_transactions"    on public.transactions    for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow_all_support_tickets" on public.support_tickets for all to anon, authenticated, service_role using (true) with check (true);

-- ── 7. Enable Realtime on all tables (safe — skips if already added) ─────────
do $$
declare
  tbl text;
begin
  foreach tbl in array array['profiles','outlets','menu_items','orders','transactions','support_tickets']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when others then
      -- already a member — ignore
    end;
  end loop;
end $$;

-- ── 8. Verify ─────────────────────────────────────────────────────────────────
select
  t.table_name,
  count(c.column_name) as column_count
from information_schema.tables t
join information_schema.columns c on c.table_name = t.table_name and c.table_schema = 'public'
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
group by t.table_name
order by t.table_name;
