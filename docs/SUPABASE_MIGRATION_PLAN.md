# ANN BAKERY HOUSE — Supabase Migration Plan

> **STATUS: PROPOSAL — NOT APPLIED.** Nothing in this plan has been executed.
> No SQL has run against the live Supabase project and no application code was
> changed. Applying any step requires explicit owner approval.

Labels used throughout: **[PROPOSED]** (designed, not run) · **[CONFIRMED]** (verified fact) · **[OPEN]** (needs a decision).

---

## 1. Objective

Move production data off local SQLite onto Supabase (PostgreSQL + Auth + Storage)
so the website and the future `/admin` dashboard can persist data reliably across
reloads, redeployments and new visitors.

## 2. Prerequisites (must be satisfied before applying anything)

| # | Prerequisite | Status |
|---|---|---|
| P1 | Owner approval to create tables + RLS (this is a DB migration) | **[OPEN]** |
| P2 | Real Supabase project access (`https://ugdjfbtqnzaccippcpwa.supabase.co`) with `service_role` key available **server-side only** | **[OPEN]** |
| P3 | Knowledge of where the production SQLite DB lives (the working copy here has **no** `.data/` DB — see §4) | **[OPEN]** |
| P4 | Decision on legacy customer treatment (D3) | **[CONFIRMED]** — preserve as legacy records; do not migrate password hashes |
| P5 | Storage bucket creation approved | **[OPEN]** |

> **Environment note [CONFIRMED]:** in this checkout there is **no** `.data/`
> directory and **no** `*.db` / `*.sqlite*` file. The SQLite schema exists only in
> code (`server.ts` → `initDatabase()`). Any real accounts/reviews therefore live
> where the Express server actually ran. The export step (§4) must run there.

## 3. Apply order

```
001_initial_schema.sql      (tables, indexes, triggers, helper functions)
002_rls_policies.sql        (enable RLS + all policies)
003_storage_policies.sql    (bucket ann-bakery-assets + storage policies)
seed.sql                    (5 categories, 19 products, 8 options, site_settings)
<data import>               (legacy_customers + reviews — see §5)
<admin provisioning>        (see §6)
```

Run order matters: policies reference tables from 001; the seed references both
tables and the admin predicate is never needed for seeding (it runs as the DB
owner). Each file is wrapped in a transaction (`begin; … commit;`).

## 4. Safe backup / export of the existing SQLite database

**Rule: the original SQLite database is NEVER deleted, modified or overwritten.**

1. **Locate** the live DB (created by the Express server; default path is
   derived in `server.ts` — `.data/ann_bakery.db` relative to the server cwd).
2. **Byte-for-byte backup** before anything else:
   `Copy-Item .data\ann_bakery.db ".data\backup\ann_bakery_<YYYYMMDD-HHmmss>.db"`
   (or the SQLite `.backup`/`VACUUM INTO` command). Confirm the copy opens.
3. **Read-only export** to reviewable JSON/CSV (no schema change, no writes):
   - `profiles` → `export/legacy_customers.json` (**excluding `password_hash`**)
   - `reviews`  → `export/reviews.json`
   - `app_settings`, `password_reset_tokens` → `export/` for completeness only.
4. **Verify counts** (rows per table) and record them in
   [`SQLITE_DATA_MAPPING.md`](./SQLITE_DATA_MAPPING.md) before importing.
5. Only after the backup + export are verified may the import (§5) proceed.

## 5. Data import

### 5.1 Legacy customer accounts (D3)
- Export **without** `password_hash` (hashes stay only in SQLite/backup).
- Insert into `public.legacy_customers` (id, name, email, role, created_at, updated_at).
- These are **not** Supabase Auth users. They cannot log in until they register
  through Supabase Auth; nothing links old hash → new account.
- Rows that cannot be mapped (e.g. missing email) are reported separately, never
  silently dropped.

### 5.2 Historical reviews (D4)
- Insert into `public.reviews` preserving: `rating`, `comment`, `status`,
  `created_at`, `updated_at`, `moderated_at`.
- `author_name` ← snapshot of the author's display name (always set).
- `author_email` ← snapshot of the author's email (legacy visibility).
- `legacy_author_id` ← original `profiles.id` (soft link; **no** FK).
- `user_id` ← set only when a matching Supabase Auth user exists; otherwise NULL
  (never invent an identity).
- `product_id` ← resolved from the old text id via `products.slug`; if the slug
  no longer exists, leave `product_id` NULL and keep `product_name`.
- `moderated_by` ← set only when the moderator is a real Supabase admin user.

### 5.3 Legacy mapping
Full column-by-column mapping is in [`SQLITE_DATA_MAPPING.md`](./SQLITE_DATA_MAPPING.md).

## 6. Admin account provisioning (secure procedure)

The administrator role is granted **only** through a trusted server-side
mechanism. No credentials are ever hardcoded or placed in SQL files.

1. In the **Supabase Dashboard → Authentication → Users**, create the admin user
   with the owner's real email and a strong password (or via the Admin API
   `auth.admin.createUser`). Do not use the public sign-up form.
2. Grant the admin role by updating `app_metadata` (server-side only):
   ```sql
   -- Run in the Supabase SQL editor or via the Admin API with the service_role key.
   update auth.users
   set raw_app_meta_data =
         coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
   where email = '<OWNER_EMAIL>';
   ```
3. The user must sign in again so the JWT carries `app_metadata.role = 'admin'`.
4. Verify: `public.is_admin()` returns `true` for that session and `false` for
   anonymous/customer sessions.

> `app_metadata` is server-controlled and cannot be set by the client, unlike
> `user_metadata`. This is why `is_admin()` reads `app_metadata` only (D1).

## 7. Post-apply verification

- `select count(*)` per table matches the expected seed/import counts.
- An **anon** request can read `categories`/`products`/`product_options`/
  `site_settings` and `reviews` where `status='approved'` — and nothing else.
- An **anon** insert into `products` fails; an **admin** insert succeeds.
- A customer can insert a review only as `pending` and cannot approve it.
- A customer cannot read another customer's `profiles` row.

## 8. Rollback / safety

- All DDL runs in transactions; a failure rolls back that file.
- Because the SQLite DB is preserved and exported, Supabase can be dropped and
  re-seeded without data loss.
- The seed is idempotent, so partial re-runs are safe.

## 9. Risks & open questions

| # | Risk / question | Note |
|---|---|---|
| R1 | No local SQLite DB present | Real data must be exported where the server ran; counts unknown until then. |
| R2 | Photos still referenced as `/src/assets/...` | New uploads go to Storage; existing paths remain until images are migrated (later phase). |
| R3 | Account disabling | Planned via Supabase Auth admin API (ban), **not** a table flag, to avoid two sources of truth. |
| R4 | `reviews.product_id` type changes text → uuid | Old string ids preserved as `products.slug`; new app code must resolve slug → uuid. |
| R5 | Vercel runtime | Migration assumes direct client + RLS (D2); a `service_role` key, if ever used, stays server-side only. |
| R6 | Opening hours / social links | Not seeded — the project does not contain them. Do not invent. |
| R7 | `supabase/schema.sql` (old reference) | Superseded by `migrations/`; kept untouched for history. |

## 10. Exact steps required later (summary)

1. Owner approves this plan and P1–P5.
2. Backup + export SQLite (§4) where the real DB lives.
3. Run `001` → `002` → `003` → `seed.sql` in the Supabase SQL editor / CLI.
4. Import `legacy_customers` and `reviews` (§5).
5. Provision the admin account (§6).
6. Run the verification checklist (§7).
7. Only then start Phase 1 application work (auth wiring) — separate approval.
