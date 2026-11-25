# ANN BAKERY HOUSE — Supabase Security Review

> **STATUS: PROPOSAL — NOT APPLIED.** Describes the policies in
> `supabase/migrations/002_rls_policies.sql` and `003_storage_policies.sql`.

## 1. Threat model

| Threat | Mitigation in this design |
|---|---|
| Visitor calls admin endpoints directly | Every write is gated by RLS using `public.is_admin()`; the UI is irrelevant to authorization. |
| Client forges an admin role | Authorization reads the **signed JWT** `app_metadata.role`. `user_metadata` and any client `is_admin` value are never read. |
| Customer escalates to admin | There is **no `role` column** in application tables; a customer cannot self-insert or self-promote. |
| Customer approves their own review | Insert/update policies force `status = 'pending'` and forbid setting moderation fields. |
| Public visitor reads private data | `profiles` and `legacy_customers` are not world-readable; only approved reviews and active content are public. |
| Service-role key leaks to browser | No service-role key is used in frontend code; only the Publishable key + RLS (D2). |
| Plaintext passwords stored | No passwords are stored in application tables — Supabase Auth owns credentials. |

## 2. The admin predicate

```sql
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
```

- Reads only the JWT claim `app_metadata.role` (D1). `app_metadata` is set
  server-side and cannot be modified by the client, unlike `user_metadata`.
- Returns `false` for anonymous users (`auth.jwt()` yields no such claim).
- `security invoker` (default) — it only inspects the caller's JWT, so no privilege
  escalation is possible through it.

## 3. Policy-by-policy (plain English)

### profiles
| Policy | Operation | Who | What it means |
|---|---|---|---|
| `profiles_select_own_or_admin` | SELECT | self / admin | You can read your own profile; admins can read all. Nobody else can. |
| `profiles_insert_self` | INSERT | self | You can only create the profile row whose id equals your own auth id. |
| `profiles_update_own` | UPDATE | self | You can edit only your own profile, and cannot change it into someone else's. |
| `profiles_delete_admin` | DELETE | admin | Only admins remove profile rows. (Deleting the auth user is a separate, server-side action.) |

### categories
| Policy | Operation | Who | Meaning |
|---|---|---|---|
| `categories_select_public_or_admin` | SELECT | everyone (active) / admin (all) | Public sees active categories only; admins see inactive ones too. |
| `categories_insert_admin` / `_update_admin` / `_delete_admin` | INSERT/UPDATE/DELETE | admin | Only admins manage categories. Deletion is further blocked by `products.category_id ON DELETE RESTRICT` while products still reference the category. |

### products
| Policy | Operation | Who | Meaning |
|---|---|---|---|
| `products_select_public_or_admin` | SELECT | everyone (available) / admin (all) | Public sees only available products whose category is active. |
| `products_insert_admin` / `_update_admin` / `_delete_admin` | INSERT/UPDATE/DELETE | admin | Only admins manage products. |

### product_options
Same shape as products: public read of options belonging to available products,
admin-only writes.

### reviews
| Policy | Operation | Who | Meaning |
|---|---|---|---|
| `reviews_select_public_own_admin` | SELECT | everyone (approved) / author / admin | Public sees approved reviews; an author also sees their own (any status); admins see all. |
| `reviews_insert_own_pending` | INSERT | authenticated customer | You may add a review only for yourself, only as `pending`, with no moderation fields set. This blocks self-approval and impersonation. |
| `reviews_update_own_pending` | UPDATE | author | You may edit your own review but it must remain `pending` with empty moderation fields — so an author can never approve their own review. |
| `reviews_update_admin` | UPDATE | admin | Admins may approve/reject/edit any review. |
| `reviews_delete_own_or_admin` | DELETE | author / admin | Authors may delete their own; admins may delete any. |

> Because multiple permissive policies are OR-ed, a customer satisfies the
> customer branch (constrained) and an admin satisfies the admin branch (unconstrained).

### legacy_customers
Admin-only for every operation. Contains PII and is never public.

### site_settings
Public SELECT (it is public website content); writes are admin-only.

## 4. Storage policies (`ann-bakery-assets`)

| Policy | Operation | Rule |
|---|---|---|
| `ann_bakery_assets_public_read` | SELECT | Anyone can read objects in the bucket (images shown publicly). |
| `ann_bakery_assets_admin_insert` | INSERT | Admin only; path must start with `products/`, `site/` or `branding/`; MIME must be JPEG/PNG/WebP/AVIF; size ≤ 5 MiB. |
| `ann_bakery_assets_admin_update` | UPDATE | Admin only, same constraints. |
| `ann_bakery_assets_admin_delete` | DELETE | Admin only. |

The bucket itself enforces `allowed_mime_types` and `file_size_limit` (the
authoritative validation); the policy metadata checks are defence-in-depth.

## 5. What is deliberately NOT done

- **No `role` column** anywhere in application tables (prevents self-escalation).
- **No trust in `user_metadata`** for authorization.
- **No service-role key** in any frontend file or in these SQL files.
- **No hardcoded admin password** or passcode.
- **No "hidden page" security** — the `/admin` route is protected by RLS regardless of UI.

## 6. Residual risks / follow-ups

- A leaked **Publishable** key is safe by design (RLS applies). A leaked
  **service-role** key is not — it must remain server-side only.
- Policies rely on correct JWT propagation; the client must send the session token.
- `is_admin()` reads `app_metadata`; an admin must re-login after the role is set
  for the claim to appear in the JWT.
