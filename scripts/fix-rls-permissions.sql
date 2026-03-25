-- ============================================================
-- KL-Pay: Fix RLS permissions so anon key can read/write
-- Run this in Supabase SQL Editor → Run
-- This fixes: data disappearing on refresh, permission denied errors
-- ============================================================

-- Drop ALL existing policies first (clean slate)
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

-- Disable RLS temporarily to ensure grants work
alter table public.profiles        disable row level security;
alter table public.outlets         disable row level security;
alter table public.menu_items      disable row level security;
alter table public.orders          disable row level security;
alter table public.transactions    disable row level security;
alter table public.support_tickets disable row level security;

-- Re-grant everything to anon and authenticated
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

-- Re-enable RLS
alter table public.profiles        enable row level security;
alter table public.outlets         enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;
alter table public.support_tickets enable row level security;

-- Create fully open policies (no auth required — campus internal app)
create policy "allow_all_profiles"        on public.profiles        for all using (true) with check (true);
create policy "allow_all_outlets"         on public.outlets         for all using (true) with check (true);
create policy "allow_all_menu_items"      on public.menu_items      for all using (true) with check (true);
create policy "allow_all_orders"          on public.orders          for all using (true) with check (true);
create policy "allow_all_transactions"    on public.transactions    for all using (true) with check (true);
create policy "allow_all_support_tickets" on public.support_tickets for all using (true) with check (true);

-- Verify policies were created
select tablename, policyname, cmd, qual 
from pg_policies 
where schemaname = 'public'
order by tablename, policyname;
