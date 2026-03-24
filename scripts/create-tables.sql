-- ============================================================
-- KL-Pay Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
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

-- ── outlets ───────────────────────────────────────────────
create table if not exists public.outlets (
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

-- ── menu_items ────────────────────────────────────────────
create table if not exists public.menu_items (
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

-- ── orders ────────────────────────────────────────────────
create table if not exists public.orders (
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

-- ── transactions ──────────────────────────────────────────
create table if not exists public.transactions (
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

-- ── support_tickets ───────────────────────────────────────
create table if not exists public.support_tickets (
  id         text primary key,
  user_id    text not null,
  subject    text not null,
  message    text not null,
  status     text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.outlets        enable row level security;
alter table public.menu_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.transactions   enable row level security;
alter table public.support_tickets enable row level security;

-- profiles: owner can read/write their own; all authenticated can read
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true);

-- outlets: public read; authenticated write
create policy "outlets_select"  on public.outlets for select using (true);
create policy "outlets_insert"  on public.outlets for insert with check (true);
create policy "outlets_update"  on public.outlets for update using (true);
create policy "outlets_delete"  on public.outlets for delete using (true);

-- menu_items: public read; authenticated write
create policy "menu_select" on public.menu_items for select using (true);
create policy "menu_insert" on public.menu_items for insert with check (true);
create policy "menu_update" on public.menu_items for update using (true);
create policy "menu_delete" on public.menu_items for delete using (true);

-- orders: authenticated read/write
create policy "orders_select" on public.orders for select using (true);
create policy "orders_insert" on public.orders for insert with check (true);
create policy "orders_update" on public.orders for update using (true);
create policy "orders_delete" on public.orders for delete using (true);

-- transactions: authenticated read/write
create policy "tx_select" on public.transactions for select using (true);
create policy "tx_insert" on public.transactions for insert with check (true);
create policy "tx_update" on public.transactions for update using (true);

-- support_tickets: authenticated read/write
create policy "support_select" on public.support_tickets for select using (true);
create policy "support_insert" on public.support_tickets for insert with check (true);
create policy "support_update" on public.support_tickets for update using (true);

-- ── Enable Realtime ───────────────────────────────────────
alter publication supabase_realtime add table public.outlets;
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.transactions;

-- ── Seed data ─────────────────────────────────────────────
insert into public.outlets (id, name, description, image_url, is_open, merchant_id, block_name, category, upi_id, timings, rating)
values
  ('friends-canteen', 'Friend''s Canteen', 'Authentic biryani and SP Curry specials.',
   'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
   true, '', 'Tulip Hostel', 'Meals', 'friends.canteen@okaxis', '7am – 10pm', 4.7),
  ('test-canteen', 'Test Canteen', 'Dev testing — Rs.1 items only.',
   'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
   true, '', 'CSE', 'Snack', 'test.canteen@okaxis', '24/7', 5.0)
on conflict (id) do nothing;

insert into public.menu_items (id, outlet_id, name, description, price, image_url, category, is_available, prep_time)
values
  ('friends-canteen_biryani', 'friends-canteen', 'Biryani', 'Classic aromatic biryani with raita',
   80, 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
   'Main', true, '15m'),
  ('friends-canteen_sp_biryani', 'friends-canteen', 'SP Curry Biryani', 'Special SP curry biryani — rich and spicy',
   100, 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',
   'Main', true, '20m'),
  ('test-canteen_chocolate', 'test-canteen', 'Chocolate', 'Rs.1 test item for Cashfree payment testing',
   1, 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',
   'Snack', true, '1m')
on conflict (id) do nothing;
