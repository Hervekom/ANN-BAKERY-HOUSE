-- =============================================================================
-- ANN BAKERY HOUSE — Supabase Migration 003: Storage Bucket & Policies
-- -----------------------------------------------------------------------------
-- STATUS: PROPOSAL — NOT APPLIED. Review only.
-- NOTE: this file DECLARES the bucket; it must not be executed until approved.
--
-- Bucket: ann-bakery-assets
--   * Public READ (images are shown on the public website).
--   * WRITE (upload/update/delete) restricted to administrators (app_metadata.role).
--   * Allowed types: JPEG, PNG, WebP, AVIF. Max size: 5 MiB.
--
-- Recommended path convention (enforced on insert):
--   products/<product-slug>/<file>
--   site/hero/<file>
--   site/about/<file>
--   branding/<file>
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Bucket definition (idempotent: never overwrites settings if it already exists)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ann-bakery-assets',
  'ann-bakery-assets',
  true,
  5242880, -- 5 MiB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Policies on storage.objects
-- Note: bucket-level `allowed_mime_types` and `file_size_limit` are the
-- authoritative validation; the metadata checks below are defence-in-depth.
-- -----------------------------------------------------------------------------
drop policy if exists "ann_bakery_assets_public_read" on storage.objects;
create policy "ann_bakery_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'ann-bakery-assets');

drop policy if exists "ann_bakery_assets_admin_insert" on storage.objects;
create policy "ann_bakery_assets_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'ann-bakery-assets'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products','site','branding')
    and (metadata ->> 'mimetype') in ('image/jpeg','image/png','image/webp','image/avif')
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

drop policy if exists "ann_bakery_assets_admin_update" on storage.objects;
create policy "ann_bakery_assets_admin_update"
  on storage.objects for update
  using (bucket_id = 'ann-bakery-assets' and public.is_admin())
  with check (
    bucket_id = 'ann-bakery-assets'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products','site','branding')
    and (metadata ->> 'mimetype') in ('image/jpeg','image/png','image/webp','image/avif')
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

drop policy if exists "ann_bakery_assets_admin_delete" on storage.objects;
create policy "ann_bakery_assets_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'ann-bakery-assets' and public.is_admin());

commit;
