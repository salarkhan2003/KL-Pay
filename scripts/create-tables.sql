-- ============================================================
-- KL-Pay Supabase Schema  (safe to re-run — idempotent)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "pgcrypto";

-- ── DROP and recreate profiles with correct schema ────────
-- The old SQL had a bug where `id` was outside CREATE TABLE.
-- This fixes it by dropping and recreating cleanly.
drop table if exists public.profiles cascade;

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

-- ── outlets ───────────────────────────────────────────────
drop table if exists public.outlets cascade;
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

-- ── menu_items ────────────────────────────────────────────
drop table if exists public.menu_items cascade;
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

-- ── orders ────────────────────────────────────────────────
drop table if exists public.orders cascade;
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

-- ── transactions ──────────────────────────────────────────
drop table if exists public.transactions cascade;
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

-- ── support_tickets ───────────────────────────────────────
drop table if exists public.support_tickets cascade;
create table public.support_tickets (
  id         text primary key,
  user_id    text not null,
  subject    text not null,
  message    text not null,
  status     text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz default now()
);

-- ── Grant anon + authenticated full access ────────────────
-- This is required for the Supabase anon key to work with RLS policies.
grant usage on schema public to anon, authenticated;

grant all on public.profiles        to anon, authenticated;
grant all on public.outlets         to anon, authenticated;
grant all on public.menu_items      to anon, authenticated;
grant all on public.orders          to anon, authenticated;
grant all on public.transactions    to anon, authenticated;
grant all on public.support_tickets to anon, authenticated;

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.outlets         enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.transactions    enable row level security;
alter table public.support_tickets enable row level security;

-- Drop existing policies so re-runs don't error
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

-- Open policies — allow all for anon/authenticated (app handles auth logic)
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true);

create policy "outlets_select"  on public.outlets for select using (true);
create policy "outlets_insert"  on public.outlets for insert with check (true);
create policy "outlets_update"  on public.outlets for update using (true);
create policy "outlets_delete"  on public.outlets for delete using (true);

create policy "menu_select"     on public.menu_items for select using (true);
create policy "menu_insert"     on public.menu_items for insert with check (true);
create policy "menu_update"     on public.menu_items for update using (true);
create policy "menu_delete"     on public.menu_items for delete using (true);

create policy "orders_select"   on public.orders for select using (true);
create policy "orders_insert"   on public.orders for insert with check (true);
create policy "orders_update"   on public.orders for update using (true);
create policy "orders_delete"   on public.orders for delete using (true);

create policy "tx_select"       on public.transactions for select using (true);
create policy "tx_insert"       on public.transactions for insert with check (true);
create policy "tx_update"       on public.transactions for update using (true);

create policy "support_select"  on public.support_tickets for select using (true);
create policy "support_insert"  on public.support_tickets for insert with check (true);
create policy "support_update"  on public.support_tickets for update using (true);

-- ── Realtime ──────────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.outlets;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.menu_items;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.orders;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.transactions; exception when others then null; end;
end $$;

-- ── Seed outlets ──────────────────────────────────────────
insert into public.outlets (id, name, description, image_url, is_open, merchant_id, block_name, category, upi_id, timings, rating)
values
  ('friends-canteen',  'Friend''s Canteen',    'Authentic biryani and SP Curry specials.',
   'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg',
   true, '', 'Tulip Hostel', 'Meals', 'friends.canteen@okaxis', '7am – 10pm', 4.7),
  ('tulip-snacks',     'Tulip Snacks Corner',  'Quick bites and evening snacks.',
   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400',
   true, '', 'Tulip Hostel', 'Snacks', 'tulip.snacks@okaxis', '4pm – 10pm', 4.3),
  ('himalaya-canteen', 'Himalaya Canteen',     'Full meals and daily specials.',
   'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
   true, '', 'Himalaya Hostel', 'Meals', 'himalaya.canteen@okaxis', '7am – 9pm', 4.5),
  ('himalaya-juice',   'Himalaya Juice Bar',   'Fresh juices and smoothies.',
   'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400',
   true, '', 'Himalaya Hostel', 'Juice', 'himalaya.juice@okaxis', '8am – 8pm', 4.6),
  ('kg-canteen',       'KG Canteen',           'Home-style meals for KG residents.',
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400',
   true, '', 'Kanchan Ganga Hostel', 'Meals', 'kg.canteen@okaxis', '7am – 9pm', 4.4),
  ('kg-snacks',        'KG Snacks',            'Evening snacks and chai.',
   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400',
   true, '', 'Kanchan Ganga Hostel', 'Snacks', 'kg.snacks@okaxis', '3pm – 9pm', 4.2),
  ('test-canteen',     'Test Canteen',         'Dev testing — Rs.1 items only.',
   'https://images.unsplash.com/photo-1567529684892-09290a1b2d05?auto=format&fit=crop&w=400',
   true, '', 'CSE', 'Snack', 'test.canteen@okaxis', '24/7', 5.0)
on conflict (id) do nothing;

-- ── Seed menu items ───────────────────────────────────────
insert into public.menu_items (id, outlet_id, name, description, price, image_url, category, is_available, prep_time)
values
  ('friends-canteen_biryani',    'friends-canteen',  'Biryani',          'Classic aromatic biryani with raita',
   80,  'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/biryani-logo.jpeg', 'Main', true, '15m'),
  ('friends-canteen_sp_biryani', 'friends-canteen',  'SP Curry Biryani', 'Special SP curry biryani — rich and spicy',
   100, 'https://hnezkwnefmjvbdwlyubj.supabase.co/storage/v1/object/public/media/sp-biryani.jpeg',   'Main', true, '20m'),
  ('friends-canteen_egg_rice',   'friends-canteen',  'Egg Fried Rice',   'Wok-tossed egg fried rice',
   60,  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400',   'Main', true, '10m'),
  ('friends-canteen_chai',       'friends-canteen',  'Masala Chai',      'Hot spiced tea',
   10,  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400',      'Beverage', true, '5m'),
  ('tulip-snacks_samosa',        'tulip-snacks',     'Samosa',           'Crispy fried samosa with chutney',
   15,  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400',   'Snack', true, '5m'),
  ('tulip-snacks_maggi',         'tulip-snacks',     'Maggi',            'Classic instant noodles',
   30,  'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400',   'Snack', true, '7m'),
  ('himalaya-canteen_thali',     'himalaya-canteen', 'Veg Thali',        'Full veg thali with rice, dal, sabzi',
   70,  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400',      'Main', true, '15m'),
  ('himalaya-canteen_roti',      'himalaya-canteen', 'Roti + Sabzi',     '3 rotis with seasonal sabzi',
   40,  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400',   'Main', true, '10m'),
  ('himalaya-juice_mango',       'himalaya-juice',   'Mango Shake',      'Fresh mango milkshake',
   50,  'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400',   'Juice', true, '5m'),
  ('himalaya-juice_sugarcane',   'himalaya-juice',   'Sugarcane Juice',  'Fresh pressed sugarcane',
   30,  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400',      'Juice', true, '3m'),
  ('kg-canteen_meals',           'kg-canteen',       'Full Meals',       'Rice, sambar, rasam, papad, pickle',
   65,  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400',      'Main', true, '10m'),
  ('kg-canteen_curd_rice',       'kg-canteen',       'Curd Rice',        'Cooling curd rice with pickle',
   40,  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400',   'Main', true, '5m'),
  ('kg-snacks_vada',             'kg-snacks',        'Medu Vada',        'Crispy vada with sambar',
   20,  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400',   'Snack', true, '5m'),
  ('kg-snacks_chai',             'kg-snacks',        'Chai',             'Hot tea',
   10,  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400',      'Beverage', true, '3m'),
  ('test-canteen_chocolate',     'test-canteen',     'Chocolate',        'Rs.1 test item for Cashfree payment testing',
   1,   'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=400',   'Snack', true, '1m')
on conflict (id) do nothing;
