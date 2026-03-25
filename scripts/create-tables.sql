-- ============================================================
-- KL-Pay Supabase Schema — FULL RESET
-- Paste this ENTIRE file into Supabase SQL Editor → Run
-- This drops everything and rebuilds correctly.
-- ============================================================

-- Step 1: Drop all existing tables (cascade removes foreign keys too)
drop table if exists public.support_tickets cascade;
drop table if exists public.transactions    cascade;
drop table if exists public.orders          cascade;
drop table if exists public.menu_items      cascade;
drop table if exists public.outlets         cascade;
drop table if exists public.profiles        cascade;

-- Step 2: Create tables with correct schema

create table public.profiles (
  id                 text primary key,
  email              text not null,
  display_name       text,
  role               text not null default 'student' check (role in ('student','merchant','admin')),
  phone              text,
  student_id         text,
  gender             text,
  hostel             text,
  k_coins            integer not null default 0,
  streak             integer not null default 0,
  block              text default 'CSE',
  merchant_outlet_id text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table public.outlets (
  id          text primary key,
  name        text not null,
  description text default '',
  image_url   text default '',
  is_open     boolean not null default true,
  merchant_id text default '',
  block_name  text default '',
  category    text default 'Meals',
  upi_id      text default '',
  timings     text,
  rating      numeric(3,1) default 4.0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.menu_items (
  id           text primary key,
  outlet_id    text not null references public.outlets(id) on delete cascade,
  name         text not null,
  description  text default '',
  price        numeric(10,2) not null,
  image_url    text default '',
  category     text default 'Main',
  is_available boolean not null default true,
  prep_time    text default '10m',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.orders (
  id               text primary key,
  student_id       text not null,
  outlet_id        text not null,
  user_name        text default '',
  user_phone       text default '',
  items            jsonb not null default '[]',
  total_amount     numeric(10,2) not null default 0,
  convenience_fee  numeric(10,2) default 0,
  vendor_amount    numeric(10,2) default 0,
  status           text not null default 'pending'
                     check (status in ('pending','preparing','ready','picked_up','cancelled')),
  payment_status   text not null default 'unpaid'
                     check (payment_status in ('unpaid','paid','failed')),
  token            text,
  created_at       timestamptz default now()
);

create table public.transactions (
  id                   text primary key,
  flow                 text not null check (flow in ('Food_Order','Peer_to_Merchant_Pay')),
  student_id           text not null,
  student_name         text default '',
  student_phone        text default '',
  outlet_id            text default '',
  outlet_name          text default '',
  merchant_vpa         text default '',
  total_amount         numeric(10,2) not null default 0,
  platform_fee         numeric(10,2) default 0,
  vendor_amount        numeric(10,2) default 0,
  payment_status       text not null default 'pending'
                         check (payment_status in ('pending','paid','failed')),
  cashfree_order_id    text,
  cashfree_payment_id  text,
  k_coins_awarded      integer default 0,
  order_id             text,
  token                text,
  note                 text,
  created_at           timestamptz default now()
);

create table public.support_tickets (
  id         text primary key,
  user_id    text not null,
  subject    text not null,
  message    text not null,
  status     text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz default now()
);

-- Step 3: Grant access to anon and authenticated roles
grant usage on schema public to anon, authenticated;
grant all on public.profiles        to anon, authenticated;
grant all on public.outlets         to anon, authenticated;
grant all on public.menu_items      to anon, authenticated;
grant all on public.orders          to anon, authenticated;
grant all on public.transactions    to anon, authenticated;
grant all on public.support_tickets to anon, authenticated;

-- Step 4: Enable Row Level Security
alter table public.profiles        enable row level security;
alter table public.outlets         enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;
alter table public.support_tickets enable row level security;

-- Step 5: Drop old policies and recreate
do $$ begin
  drop policy if exists "profiles_select" on public.profiles;
  drop policy if exists "profiles_insert" on public.profiles;
  drop policy if exists "profiles_update" on public.profiles;
  drop policy if exists "outlets_select"  on public.outlets;
  drop policy if exists "outlets_insert"  on public.outlets;
  drop policy if exists "outlets_update"  on public.outlets;
  drop policy if exists "outlets_delete"  on public.outlets;
  drop policy if exists "menu_select"     on public.menu_items;
  drop policy if exists "menu_insert"     on public.menu_items;
  drop policy if exists "menu_update"     on public.menu_items;
  drop policy if exists "menu_delete"     on public.menu_items;
  drop policy if exists "orders_select"   on public.orders;
  drop policy if exists "orders_insert"   on public.orders;
  drop policy if exists "orders_update"   on public.orders;
  drop policy if exists "orders_delete"   on public.orders;
  drop policy if exists "tx_select"       on public.transactions;
  drop policy if exists "tx_insert"       on public.transactions;
  drop policy if exists "tx_update"       on public.transactions;
  drop policy if exists "support_select"  on public.support_tickets;
  drop policy if exists "support_insert"  on public.support_tickets;
  drop policy if exists "support_update"  on public.support_tickets;
end $$;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true);
create policy "outlets_select"  on public.outlets  for select using (true);
create policy "outlets_insert"  on public.outlets  for insert with check (true);
create policy "outlets_update"  on public.outlets  for update using (true);
create policy "outlets_delete"  on public.outlets  for delete using (true);
create policy "menu_select"     on public.menu_items for select using (true);
create policy "menu_insert"     on public.menu_items for insert with check (true);
create policy "menu_update"     on public.menu_items for update using (true);
create policy "menu_delete"     on public.menu_items for delete using (true);
create policy "orders_select"   on public.orders   for select using (true);
create policy "orders_insert"   on public.orders   for insert with check (true);
create policy "orders_update"   on public.orders   for update using (true);
create policy "orders_delete"   on public.orders   for delete using (true);
create policy "tx_select"       on public.transactions for select using (true);
create policy "tx_insert"       on public.transactions for insert with check (true);
create policy "tx_update"       on public.transactions for update using (true);
create policy "support_select"  on public.support_tickets for select using (true);
create policy "support_insert"  on public.support_tickets for insert with check (true);
create policy "support_update"  on public.support_tickets for update using (true);

-- Step 6: Enable Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.outlets;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.menu_items;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.orders;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.transactions; exception when others then null; end;
end $$;

-- Step 7: Seed data
insert into public.outlets (id, name, description, image_url, is_open, merchant_id, block_name, category, upi_id, timings, rating)
values
  ('friends-canteen', 'Friend''s Canteen', 'Authentic biryani and SP Curry specials.',
   'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
   true, '', 'Tulip Hostel', 'Meals', 'friends.canteen@okaxis', '7am – 10pm', 4.7),
  ('test-canteen', 'Test Canteen', 'Dev testing — Rs.1 items only.',
   'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
   true, '', 'Tulip Hostel', 'Meals', 'test.canteen@okaxis', '24/7', 5.0)
on conflict (id) do nothing;

insert into public.menu_items (id, outlet_id, name, description, price, image_url, category, is_available, prep_time)
values
  ('friends-canteen_biryani',    'friends-canteen', 'Biryani',          'Classic aromatic biryani with raita',
   80,  'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', 'Main', true, '15m'),
  ('friends-canteen_sp_biryani', 'friends-canteen', 'SP Curry Biryani', 'Special SP curry biryani — rich and spicy',
   100, 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',   'Main', true, '20m'),
  ('test-canteen_chocolate',     'test-canteen',    'Chocolate',        'Rs.1 test item for payment testing',
   1,   'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',    'Snack', true, '1m')
on conflict (id) do nothing;
