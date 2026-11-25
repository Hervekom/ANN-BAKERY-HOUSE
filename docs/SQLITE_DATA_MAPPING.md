# ANN BAKERY HOUSE — SQLite → Supabase Data Mapping

> **STATUS: PROPOSAL — NOT APPLIED.**
> Source of truth for the SQLite structures is `server.ts` → `initDatabase()`.
> **[CONFIRMED]** No `.data/` directory or `*.db` file exists in this checkout,
> so no rows could be inspected here. Row counts must be filled in from the
> real database where the Express server ran (see `SUPABASE_MIGRATION_PLAN.md` §4).

## 1. SQLite structures (as defined in code)

| Table | Columns |
|---|---|
| `profiles` | `id` TEXT PK · `name` · `email` (UNIQUE) · `password_hash` · `role` (customer/admin) · `created_at` · `updated_at` |
| `reviews` | `id` TEXT PK · `user_id` → profiles(id) · `rating` 1–5 · `product_id` · `product_name` · `comment` · `status` (pending/approved/rejected) · `moderated_by` · `moderated_at` · `created_at` · `updated_at` |
| `password_reset_tokens` | `id` · `user_id` · `token_hash` · `expires_at` · `used_at` · `created_at` |
| `app_settings` | `key` PK · `value` (holds the admin passcode hash) |

## 2. Mapping

### 2.1 `profiles` → `public.legacy_customers` (and future Supabase Auth users)

| SQLite column | Supabase target | Notes |
|---|---|---|
| `id` (TEXT) | `legacy_customers.id` (text) | Preserved as-is. |
| `name` | `legacy_customers.name` | Preserved. |
| `email` | `legacy_customers.email` | Preserved. |
| `role` | `legacy_customers.role` | Preserved for history (`customer`/`admin`). |
| `created_at` / `updated_at` | `legacy_customers.created_at` / `updated_at` | Preserved (ISO text → timestamptz). |
| `password_hash` | **NOT MIGRATED** | D3 — never copied anywhere; remains only in SQLite + backup. |

- A legacy account becomes a real Supabase Auth user only when the person
  registers again. On registration, the `on_auth_user_created` trigger creates a
  `public.profiles` row. There is **no automatic link** between a `legacy_customers`
  row and a new auth user (an email match may be used later to reconcile — owner decision).

### 2.2 `reviews` → `public.reviews`

| SQLite column | Supabase target | Notes |
|---|---|---|
| `id` (TEXT) | `reviews.id` (uuid, new) | New uuid; old id kept for traceability in the export file. |
| `user_id` | `reviews.legacy_author_id` + `reviews.user_id` | `legacy_author_id` = old id. `user_id` set only if a matching Supabase user exists, else NULL. |
| — (joined `profiles.name`) | `reviews.author_name` | Snapshot of the author's display name (always set). |
| — (joined `profiles.email`) | `reviews.author_email` | Snapshot of the author's email. |
| `rating` | `reviews.rating` | 1–5. |
| `product_id` (TEXT slug) | `reviews.product_id` (uuid) via `products.slug` | Resolved by slug; NULL if the slug no longer exists. |
| `product_name` | `reviews.product_name` | Preserved snapshot. |
| `comment` | `reviews.comment` | Preserved. |
| `status` | `reviews.status` | Preserved (`pending`/`approved`/`rejected`). |
| `moderated_by` | `reviews.moderated_by` | Set only if the moderator is a real Supabase admin user; else NULL. |
| `moderated_at` | `reviews.moderated_at` | Preserved. |
| `created_at` / `updated_at` | `reviews.created_at` / `updated_at` | Preserved. |

### 2.3 Tables intentionally not migrated

| SQLite table | Treatment | Reason |
|---|---|---|
| `password_reset_tokens` | **Not migrated** | Obsolete — Supabase Auth handles password resets. |
| `app_settings` (`admin_passcode_hash`) | **Not migrated** | Replaced by Supabase Auth + `app_metadata.role` (D1). The old passcode mechanism is retired with the public admin entry point (D7). |

## 3. Preservation guarantees

- The original SQLite DB is backed up then left untouched (§4 of the migration plan).
- No password hashes are copied into Supabase.
- Reviews keep content, rating, status, timestamps and author display name/email.
- Historical authors without a Supabase account get `user_id = NULL`, never an invented identity.
- `legacy_customers` preserves accounts that have no reviews.

## 4. Records that cannot be migrated (report separately)

These must be listed explicitly after the export; none is silently dropped:

| Case | Handling |
|---|---|
| `profiles` with missing/blank email | Cannot map cleanly → reported in a "needs review" list; still preserved in export. |
| `reviews.user_id` pointing to a non-existent/duplicate profile | Migrated with `author_name` snapshot; `legacy_author_id` kept; flagged. |
| `reviews.product_id` not matching any `products.slug` | `product_id = NULL`; `product_name` preserved; flagged. |
| `reviews` with comment outside length 5–1000 | Flagged before insert (constraint would reject). |
| `profiles` where it is unclear whether role `admin` is still intended | Preserved in `legacy_customers.role`; new admin access is granted only via the provisioning procedure (§6 of the plan). |

## 5. Row-count log (to fill in from the real DB)

| Source | Table | Rows | Notes |
|---|---|---|---|
| SQLite | `profiles` | _pending_ | Where the server ran. |
| SQLite | `reviews` | _pending_ | |
| SQLite | `password_reset_tokens` | _pending_ | Not migrated. |
| SQLite | `app_settings` | _pending_ | Not migrated. |

## 6. Products / categories (static → DB)

The 5 categories and 19 products currently live in `src/data/menu.ts`
(`MENU_CATEGORIES`, `MENU_ITEMS`) and are seeded by `supabase/seed.sql`.
`products.slug` = the existing menu item `id`; `product_options` captures
`optionLabel` / `options`. All prices remain `NULL`.
