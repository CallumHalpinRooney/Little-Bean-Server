-- Lonrú Design — Supabase schema
-- Run in the Supabase SQL editor (or via the CLI) before seeding.

-- ── Catalogue ──────────────────────────────────────────────────────────────
create table if not exists public.products (
  id          text primary key,
  slug        text unique not null,
  title       text not null,
  collection  text not null check (collection in ('motorsport','sports-moments','motivation')),
  story       text not null,
  blurb       text not null,
  images      jsonb not null default '[]'::jsonb,
  art_seed    text,
  variants    jsonb not null default '[]'::jsonb,
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists products_collection_idx on public.products (collection);

-- ── Order log (record kept outside Stripe/Printful) ─────────────────────────
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text unique not null,
  product_id          text,
  variant_id          text,
  printful_variant_id bigint,
  printful_order_id    bigint,
  title               text,
  amount_total        bigint,
  currency            text default 'eur',
  customer_email      text,
  customer_name       text,
  status              text not null default 'pending'
                        check (status in ('pending','fulfilled','failed')),
  error               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- Public, read-only catalogue access for the anon key used by the site.
drop policy if exists "products are public" on public.products;
create policy "products are public"
  on public.products for select
  using (true);

-- Orders are NOT readable/writable by anon. Only the service role (which
-- bypasses RLS) touches them, from the Netlify webhook. No anon policy = locked.
