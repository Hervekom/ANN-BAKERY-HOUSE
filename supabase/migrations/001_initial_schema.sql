-- =============================================================================
-- ANN BAKERY HOUSE — Supabase Migration 001: Initial Schema
-- -----------------------------------------------------------------------------
-- STATUS: PROPOSAL — NOT APPLIED. Prepared for owner review only.
-- Do NOT execute against the live Supabase project without explicit approval.
--
-- Authorization model (decision D1):
--   An administrator is a Supabase Auth user whose JWT claim
--   `app_metadata.role` equals 'admin'. Roles are NEVER stored in application
--   tables and NEVER read from `user_metadata` (client-writable).
--
-- No credential material is stored here. Passwords/identities are owned by
-- `auth.users` (Supabase Auth). This file creates application tables only.
--
-- Supersedes the older reference file `supabase/schema.sql` (kept untouched for
-- history). See docs/SUPABASE_MIGRATION_PLAN.md.
-- =============================================================================

begin;

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared helper: keep updated_at current on every UPDATE.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. profiles — one row per Supabase Auth user (1:1 with auth.users)
-- =============================================================================
-- NOTE: deliberately has NO `role` and NO password column. Authorization lives
-- exclusively in auth.users.app_metadata (D1).
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text check (full_name is null or char_length(trim(full_name)) between 1 and 120),
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Customer profile. Authorization roles live in auth.users.app_metadata (D1), never here.';
comment on column public.profiles.email is
  'Convenience copy of the auth email for display; auth.users.email remains authoritative.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
-- security definer so the insert runs as the function owner (bypasses RLS).
-- No name is invented: if the user supplied no full_name/name, the column stays NULL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                         new.raw_user_meta_data ->> 'name', '')), ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. categories
-- =============================================================================
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (char_length(trim(name)) between 1 and 80),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description   text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists categories_display_order_idx
  on public.categories (display_order);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. products
-- =============================================================================
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories(id) on delete restrict,
  name              text not null check (char_length(trim(name)) between 1 and 120),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text,
  full_description  text,
  image_path        text,
  price_php         numeric(10,2) check (price_php is null or price_php >= 0),
  is_available      boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.products.price_php is
  'Price in PHP. NULL means "price to be confirmed" — never invent a price.';
comment on column public.products.image_path is
  'Storage object path (ann-bakery-assets/...) or a legacy /src/assets/... reference.';

-- `on delete restrict` protects categories that still have products:
-- a category can only be deleted once its products are reassigned (requirement C).
create index if not exists products_category_display_idx
  on public.products (category_id, display_order);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. product_options — variant options (e.g. "Choose Side" -> Rice / Fried Plantain)
-- =============================================================================
-- A single table expresses one or many option groups per product: rows sharing
-- the same group_label form one group.
create table if not exists public.product_options (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  group_label   text not null check (char_length(trim(group_label)) between 1 and 60),
  name          text not null check (char_length(trim(name)) between 1 and 80),
  display_order integer not null default 0,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, group_label, name)
);

create index if not exists product_options_product_idx
  on public.product_options (product_id, display_order);

create trigger trg_product_options_updated_at
  before update on public.product_options
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. reviews
-- =============================================================================
-- Supports both new Supabase authors (user_id) and historical/legacy authors
-- (legacy_author_id + author_name snapshot). A valid author relationship is kept
-- only when a Supabase user exists (D4); otherwise the display name is preserved
-- without inventing an identity.
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete set null,
  legacy_author_id text,
  author_name      text not null check (char_length(trim(author_name)) between 1 and 120),
  author_email     text,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text,
  rating           integer not null check (rating between 1 and 5),
  comment          text not null check (char_length(trim(comment)) between 5 and 1000),
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderated_by     uuid references public.profiles(id) on delete set null,
  moderated_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.reviews.legacy_author_id is
  'Original SQLite profiles.id for historical reviews; no FK (legacy records are preserved separately).';
comment on column public.reviews.author_name is
  'Display-name snapshot at creation time; always populated (D4).';
comment on column public.reviews.product_name is
  'Product-name snapshot for historical reviews whose product may no longer exist.';

create index if not exists reviews_status_created_idx
  on public.reviews (status, created_at desc);
create index if not exists reviews_user_created_idx
  on public.reviews (user_id, created_at desc);
create index if not exists reviews_product_idx
  on public.reviews (product_id);

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. legacy_customers — staging area to PRESERVE pre-Supabase accounts (D3)
-- =============================================================================
-- Beyond the six core tables, added specifically to satisfy D3 ("existing SQLite
-- accounts must remain preserved as legacy records"). NO password material is
-- ever copied here. These rows are never tied to auth.users.
create table if not exists public.legacy_customers (
  id          text primary key,
  name        text not null,
  email       text not null,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz,
  updated_at  timestamptz,
  imported_at timestamptz not null default now()
);

comment on table public.legacy_customers is
  'Preserved identity of pre-Supabase accounts (D3). Read-only history; no credentials.';

create index if not exists legacy_customers_email_idx
  on public.legacy_customers (email);

-- =============================================================================
-- 7. site_settings — editable public website content (key/value, JSONB)
-- =============================================================================
create table if not exists public.site_settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

comment on table public.site_settings is
  'Editable public content (business info, homepage/about/contact content). Values are JSON.';

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

commit;

-- =============================================================================
-- NOTE: Row Level Security is enabled and configured in 002_rls_policies.sql.
-- NOTE: Storage bucket + policies live in 003_storage_policies.sql.
-- =============================================================================
