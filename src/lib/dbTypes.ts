/**
 * Row shapes for the Supabase (PostgreSQL) tables defined in
 * `supabase/migrations/001_initial_schema.sql`.
 *
 * These mirror the reviewed migration exactly. Nothing here is applied to any
 * database — the types simply describe the prepared schema.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  image_path: string | null;
  price_php: number | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductOptionRow {
  id: string;
  product_id: string;
  group_label: string;
  name: string;
  display_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  id: string;
  user_id: string | null;
  legacy_author_id: string | null;
  author_name: string;
  author_email: string | null;
  product_id: string | null;
  product_name: string | null;
  rating: number;
  comment: string;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyCustomerRow {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  created_at: string | null;
  updated_at: string | null;
  imported_at: string;
}

/** A product joined with its category and variant options (admin listings). */
export interface ProductWithRelations extends ProductRow {
  categories: Pick<CategoryRow, 'id' | 'name' | 'slug'> | null;
  product_options: ProductOptionRow[];
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * True when an error means "the table/relation does not exist yet" — i.e. the
 * reviewed migrations have not been applied to the live project. Used to show a
 * helpful setup notice instead of a raw database error.
 */
export function isMissingRelation(error: unknown): boolean {
  if (!error) return false;
  const e = error as PostgrestLikeError;
  if (e.code === '42P01' || e.code === 'PGRST205') return true;
  return typeof e.message === 'string' && /does not exist|schema cache|could not find the table/i.test(e.message);
}

/** Extracts a human-readable message from a Supabase/PostgREST error. */
export function errorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const e = error as PostgrestLikeError;
  if (typeof e.message === 'string' && e.message.trim()) return e.message;
  return fallback;
}
