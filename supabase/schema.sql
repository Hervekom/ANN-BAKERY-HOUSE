-- ANN BAKERY HOUSE — Reference Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Use this SQL migration if you later connect an external Supabase project
-- (configured via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  email text not null unique,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  product_id text,
  product_name text,
  comment text not null check (char_length(trim(comment)) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references public.profiles(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_status_created_idx on public.reviews (status, created_at desc);
create index if not exists reviews_user_id_idx on public.reviews (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.reviews enable row level security;

-- Helper function to check admin role from profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles RLS Policies
create policy "Public can read reviewer display names for approved reviews"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin()
    or exists (
      select 1 from public.reviews r
      where r.user_id = profiles.id and r.status = 'approved'
    )
  );

create policy "Customers can insert own profile as customer"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'customer');

create policy "Customers can update own display name without escalating role"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Reviews RLS Policies
create policy "Public can read approved reviews"
  on public.reviews for select
  using (status = 'approved' or auth.uid() = user_id or public.is_admin());

create policy "Authenticated customers can insert pending reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "Customers can update own reviews keeping status pending"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending');

create policy "Customers can delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

create policy "Admins can moderate any review"
  on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete any inappropriate review"
  on public.reviews for delete
  using (public.is_admin());
