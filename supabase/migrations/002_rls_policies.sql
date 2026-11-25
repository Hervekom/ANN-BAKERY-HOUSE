-- =============================================================================
-- ANN BAKERY HOUSE — Supabase Migration 002: Row Level Security Policies
-- -----------------------------------------------------------------------------
-- STATUS: PROPOSAL — NOT APPLIED. Review only.
--
-- Principles:
--   * RLS is the real security boundary. Hiding UI is NOT security.
--   * The administrator role is proven ONLY by the signed JWT claim
--     `app_metadata.role = 'admin'` (D1). `user_metadata` is client-writable and
--     is NEVER trusted, and no client-supplied "is_admin" value is ever accepted.
--   * Customers can never grant themselves elevated privileges (there is no role
--     column to escalate in the first place).
--   * Public (anon) visitors can read only published/active public content.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Admin predicate — derived from the JWT only.
-- SECURITY: security invoker + reads auth.jwt(); cannot be spoofed by clients.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Enable RLS everywhere (default-deny once enabled without matching policy).
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_options  enable row level security;
alter table public.reviews          enable row level security;
alter table public.legacy_customers enable row level security;
alter table public.site_settings    enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
-- A customer sees/edits only their own row; admins see all. No public read
-- (public review author names come from reviews.author_name, not from here).

create policy profiles_select_own_or_admin
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- Fallback self-insert (the auth trigger normally creates the row first).
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only admins may delete a profile row (account disabling is handled separately
-- via the Supabase Auth admin API — see docs/SUPABASE_MIGRATION_PLAN.md).
create policy profiles_delete_admin
  on public.profiles for delete
  using (public.is_admin());

-- =============================================================================
-- categories
-- =============================================================================
create policy categories_select_public_or_admin
  on public.categories for select
  using (is_active or public.is_admin());

create policy categories_insert_admin
  on public.categories for insert
  with check (public.is_admin());

create policy categories_update_admin
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

create policy categories_delete_admin
  on public.categories for delete
  using (public.is_admin());

-- =============================================================================
-- products
-- =============================================================================
-- Public read only for available products inside an active category. The
-- subquery below is itself filtered by the categories policy above, so anon
-- only ever sees active categories. Admins see everything.
create policy products_select_public_or_admin
  on public.products for select
  using (
    public.is_admin()
    or (
      is_available
      and exists (
        select 1 from public.categories c
        where c.id = products.category_id and c.is_active
      )
    )
  );

create policy products_insert_admin
  on public.products for insert
  with check (public.is_admin());

create policy products_update_admin
  on public.products for update
  using (public.is_admin())
  with check (public.is_admin());

create policy products_delete_admin
  on public.products for delete
  using (public.is_admin());

-- =============================================================================
-- product_options
-- =============================================================================
create policy product_options_select_public_or_admin
  on public.product_options for select
  using (
    public.is_admin()
    or (
      is_available
      and exists (
        select 1 from public.products p
        where p.id = product_options.product_id and p.is_available
      )
    )
  );

create policy product_options_insert_admin
  on public.product_options for insert
  with check (public.is_admin());

create policy product_options_update_admin
  on public.product_options for update
  using (public.is_admin())
  with check (public.is_admin());

create policy product_options_delete_admin
  on public.product_options for delete
  using (public.is_admin());

-- =============================================================================
-- reviews
-- =============================================================================
-- Public reads approved reviews. Authors read their own. Admins read all.

create policy reviews_select_public_own_admin
  on public.reviews for select
  using (status = 'approved' or auth.uid() = user_id or public.is_admin());

-- Customers may insert only their own review, always starting as 'pending'.
-- They cannot pre-approve it or pre-fill moderation metadata.
create policy reviews_insert_own_pending
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
  );

-- Customers may edit only their own review and must keep it 'pending'
-- (so a customer can never approve their own review).
create policy reviews_update_own_pending
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
  );

-- Admins may moderate (approve/reject/edit) any review.
create policy reviews_update_admin
  on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

create policy reviews_delete_own_or_admin
  on public.reviews for delete
  using (auth.uid() = user_id or public.is_admin());

-- =============================================================================
-- legacy_customers
-- =============================================================================
-- Preserved history only. No public/customer access; admins only (contains PII).
create policy legacy_customers_select_admin
  on public.legacy_customers for select
  using (public.is_admin());

create policy legacy_customers_insert_admin
  on public.legacy_customers for insert
  with check (public.is_admin());

create policy legacy_customers_update_admin
  on public.legacy_customers for update
  using (public.is_admin())
  with check (public.is_admin());

create policy legacy_customers_delete_admin
  on public.legacy_customers for delete
  using (public.is_admin());

-- =============================================================================
-- site_settings
-- =============================================================================
-- Public website content: world-readable, admin-writable.
create policy site_settings_select_public
  on public.site_settings for select
  using (true);

create policy site_settings_insert_admin
  on public.site_settings for insert
  with check (public.is_admin());

create policy site_settings_update_admin
  on public.site_settings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy site_settings_delete_admin
  on public.site_settings for delete
  using (public.is_admin());

commit;
