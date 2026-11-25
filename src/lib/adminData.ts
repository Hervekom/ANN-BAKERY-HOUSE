import { requireSupabase, supabase } from './supabase';
import {
  CategoryRow,
  ProductOptionRow,
  ProductRow,
  ProductWithRelations,
  ReviewRow,
  ReviewStatus,
  SiteSettingRow,
  errorMessage,
  isMissingRelation,
} from './dbTypes';

/**
 * Admin data-access helpers for the private /admin dashboard.
 *
 * Every call runs under the caller's Supabase session, so Row Level Security is
 * the real gate: only an authenticated administrator (JWT `app_metadata.role =
 * 'admin'`) can pass the insert/update/delete policies. These helpers never
 * bypass RLS and never use the service-role key.
 *
 * When the reviewed migrations have not been applied yet, the returned result
 * carries `missingRelation = true` so the UI can show a setup notice instead of
 * a raw database error.
 */

export interface DbResult<T> {
  data: T | null;
  error: string | null;
  missingRelation: boolean;
}

async function q<T>(
  fn: (client: NonNullable<typeof supabase>) => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<DbResult<T>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  }
  try {
    const { data, error } = await fn(supabase);
    if (error) {
      return {
        data: null,
        error: errorMessage(error, 'Database request failed.'),
        missingRelation: isMissingRelation(error),
      };
    }
    return { data, error: null, missingRelation: false };
  } catch (e) {
    return {
      data: null,
      error: errorMessage(e, 'Unexpected database error.'),
      missingRelation: isMissingRelation(e),
    };
  }
}

export const ASSETS_BUCKET = 'ann-bakery-assets';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryInput {
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export function listCategories(): Promise<DbResult<CategoryRow[]>> {
  return q<CategoryRow[]>((c) =>
    c.from('categories').select('*').order('display_order', { ascending: true }).order('name'),
  );
}

export function createCategory(input: CategoryInput): Promise<DbResult<CategoryRow>> {
  return q<CategoryRow>((c) => c.from('categories').insert(input).select('*').single());
}

export function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<DbResult<CategoryRow>> {
  return q<CategoryRow>((c) =>
    c.from('categories').update(input).eq('id', id).select('*').single(),
  );
}

/** Deletion is protected by `products.category_id ON DELETE RESTRICT` on the DB. */
export function deleteCategory(id: string): Promise<DbResult<null>> {
  return q<null>((c) => c.from('categories').delete().eq('id', id).then(() => ({ data: null, error: null })));
}

export async function reorderCategories(orderedIds: string[]): Promise<DbResult<null>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase
        .from('categories')
        .update({ display_order: i + 1 })
        .eq('id', orderedIds[i]);
      if (error) {
        return { data: null, error: errorMessage(error, 'Unable to reorder categories.'), missingRelation: isMissingRelation(error) };
      }
    }
    return { data: null, error: null, missingRelation: false };
  } catch (e) {
    return { data: null, error: errorMessage(e, 'Unable to reorder categories.'), missingRelation: isMissingRelation(e) };
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductInput {
  category_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  image_path: string | null;
  price_php: number | null;
  is_available: boolean;
  display_order: number;
}

export interface OptionGroupInput {
  group_label: string;
  names: string[];
  is_available?: boolean;
}

export function listProducts(): Promise<DbResult<ProductWithRelations[]>> {
  return q<ProductWithRelations[]>((c) =>
    c
      .from('products')
      .select('*, categories(id,name,slug), product_options(*)')
      .order('display_order', { ascending: true })
      .order('name'),
  );
}

export function createProduct(input: ProductInput): Promise<DbResult<ProductRow>> {
  return q<ProductRow>((c) => c.from('products').insert(input).select('*').single());
}

export function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<DbResult<ProductRow>> {
  return q<ProductRow>((c) => c.from('products').update(input).eq('id', id).select('*').single());
}

export function deleteProduct(id: string): Promise<DbResult<null>> {
  return q<null>((c) => c.from('products').delete().eq('id', id).then(() => ({ data: null, error: null })));
}

export async function reorderProducts(orderedIds: string[]): Promise<DbResult<null>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  try {
    for (let i = 0; i < orderedIds.length; i += 1) {
      const { error } = await supabase
        .from('products')
        .update({ display_order: i + 1 })
        .eq('id', orderedIds[i]);
      if (error) {
        return { data: null, error: errorMessage(error, 'Unable to reorder products.'), missingRelation: isMissingRelation(error) };
      }
    }
    return { data: null, error: null, missingRelation: false };
  } catch (e) {
    return { data: null, error: errorMessage(e, 'Unable to reorder products.'), missingRelation: isMissingRelation(e) };
  }
}

/**
 * Replaces all variant options of a product with the supplied groups.
 * Existing option rows are deleted first, then re-inserted in order.
 */
export async function replaceProductOptions(
  productId: string,
  groups: OptionGroupInput[],
): Promise<DbResult<ProductOptionRow[]>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  try {
    const del = await supabase.from('product_options').delete().eq('product_id', productId);
    if (del.error) {
      return { data: null, error: errorMessage(del.error, 'Unable to update product variants.'), missingRelation: isMissingRelation(del.error) };
    }

    const rows: Array<Omit<ProductOptionRow, 'id' | 'created_at' | 'updated_at'>> = [];
    for (const group of groups) {
      const label = group.group_label.trim();
      if (!label) continue;
      let order = 1;
      for (const rawName of group.names) {
        const name = rawName.trim();
        if (!name) continue;
        rows.push({
          product_id: productId,
          group_label: label,
          name,
          display_order: order,
          is_available: group.is_available ?? true,
        });
        order += 1;
      }
    }

    if (rows.length === 0) {
      return { data: [], error: null, missingRelation: false };
    }

    const ins = await supabase.from('product_options').insert(rows).select('*');
    if (ins.error) {
      return { data: null, error: errorMessage(ins.error, 'Unable to save product variants.'), missingRelation: isMissingRelation(ins.error) };
    }
    return { data: ins.data as ProductOptionRow[], error: null, missingRelation: false };
  } catch (e) {
    return { data: null, error: errorMessage(e, 'Unable to save product variants.'), missingRelation: isMissingRelation(e) };
  }
}

// ---------------------------------------------------------------------------
// Reviews (moderation)
// ---------------------------------------------------------------------------

export interface AdminReviewSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export async function listReviews(
  filter: ReviewStatus | 'all' = 'all',
): Promise<DbResult<ReviewRow[]>> {
  return q<ReviewRow[]>((c) => {
    let request = c.from('reviews').select('*');
    if (filter !== 'all') request = request.eq('status', filter);
    return request.order('created_at', { ascending: false });
  });
}

export async function countReviewsByStatus(): Promise<DbResult<AdminReviewSummary>> {
  const res = await q<Array<{ status: ReviewStatus }>>((c) => c.from('reviews').select('status'));
  if (res.error || !res.data) {
    return { data: null, error: res.error, missingRelation: res.missingRelation };
  }
  const summary: AdminReviewSummary = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of res.data) {
    if (row.status === 'pending' || row.status === 'approved' || row.status === 'rejected') {
      summary[row.status] += 1;
      summary.total += 1;
    }
  }
  return { data: summary, error: null, missingRelation: false };
}

export function setReviewStatus(
  id: string,
  status: ReviewStatus,
  moderatorId: string,
): Promise<DbResult<ReviewRow>> {
  return q<ReviewRow>((c) =>
    c
      .from('reviews')
      .update({ status, moderated_by: moderatorId, moderated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single(),
  );
}

export function deleteReview(id: string): Promise<DbResult<null>> {
  return q<null>((c) => c.from('reviews').delete().eq('id', id).then(() => ({ data: null, error: null })));
}

// ---------------------------------------------------------------------------
// Site settings (public editable content)
// ---------------------------------------------------------------------------

export function listSiteSettings(): Promise<DbResult<SiteSettingRow[]>> {
  return q<SiteSettingRow[]>((c) => c.from('site_settings').select('*').order('key'));
}

export function upsertSiteSetting(
  key: string,
  value: unknown,
  adminId: string,
  description?: string | null,
): Promise<DbResult<SiteSettingRow>> {
  return q<SiteSettingRow>((c) =>
    c
      .from('site_settings')
      .upsert(
        {
          key,
          value,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
          ...(description !== undefined ? { description } : {}),
        },
        { onConflict: 'key' },
      )
      .select('*')
      .single(),
  );
}

// ---------------------------------------------------------------------------
// Media library (Supabase Storage)
// ---------------------------------------------------------------------------

export interface MediaObject {
  name: string;
  path: string;
  updatedAt: string | null;
  mimeType: string | null;
  size: number | null;
  publicUrl: string;
}

export async function listMedia(folder = ''): Promise<DbResult<MediaObject[]>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  try {
    const client = requireSupabase();
    const { data, error } = await client.storage.from(ASSETS_BUCKET).list(folder, {
      limit: 200,
      sortBy: { column: 'updated_at', order: 'desc' },
    });
    if (error) {
      return { data: null, error: errorMessage(error, 'Unable to list media.'), missingRelation: false };
    }
    const objects: MediaObject[] = (data ?? [])
      .filter((entry) => entry.name && entry.id)
      .map((entry) => {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        return {
          name: entry.name,
          path,
          updatedAt: entry.updated_at ?? null,
          mimeType: (entry.metadata as { mimetype?: string } | null)?.mimetype ?? null,
          size: (entry.metadata as { size?: number } | null)?.size ?? null,
          publicUrl: client.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl,
        };
      });
    return { data: objects, error: null, missingRelation: false };
  } catch (e) {
    return { data: null, error: errorMessage(e, 'Unable to list media.'), missingRelation: false };
  }
}

export async function uploadMedia(
  path: string,
  file: File,
  options: { upsert?: boolean } = {},
): Promise<DbResult<MediaObject>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  const client = requireSupabase();
  const { error } = await client.storage.from(ASSETS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: options.upsert ?? false,
    contentType: file.type || undefined,
  });
  if (error) {
    return { data: null, error: errorMessage(error, 'Upload failed.'), missingRelation: false };
  }
  return {
    data: {
      name: path.split('/').pop() ?? path,
      path,
      updatedAt: new Date().toISOString(),
      mimeType: file.type || null,
      size: file.size,
      publicUrl: client.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl,
    },
    error: null,
    missingRelation: false,
  };
}

export async function deleteMedia(path: string): Promise<DbResult<null>> {
  if (!supabase) return { data: null, error: 'Supabase is not configured.', missingRelation: false };
  const { error } = await supabase.storage.from(ASSETS_BUCKET).remove([path]);
  if (error) {
    return { data: null, error: errorMessage(error, 'Unable to delete file.'), missingRelation: false };
  }
  return { data: null, error: null, missingRelation: false };
}

export function publicAssetUrl(path: string): string {
  if (!supabase) return path;
  return supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Turns a public storage URL back into its bucket-relative path so the media
 * library can tell whether a stored file is still referenced by a product or a
 * site setting. Returns null for bundled/static assets (e.g. `/src/assets/...`).
 */
export function storagePathFromUrl(url: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${ASSETS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
}
