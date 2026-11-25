# ANN BAKERY HOUSE — Technical Decisions

> Record of important decisions and their reasons. Future agents must **not**
> reverse these without explicit owner approval (see §7).

Status tags: **[DECIDED]** = agreed direction · **[IMPLEMENTED]** = already in the
code · **[PLANNED]** = agreed direction, not yet built · **[PROPOSED]** = needs owner approval.

---

## 1. Target production architecture — **[DECIDED]**

**Decision.** Move from "single Express process + local SQLite" to
**Vercel (frontend + serverless functions) + Supabase (Auth + PostgreSQL)**.

**Why.** The current backend ([`server.ts`](../server.ts)) persists data to a
local SQLite file (`.data/ann_bakery.db`). On a serverless platform the filesystem
is ephemeral and per-instance, so accounts/reviews would vanish or diverge. A
hosted Postgres + Auth is required for durable, multi-instance data.

**Consequence.** The frontend becomes the primary Supabase consumer (public URL +
Publishable key). Server-only secrets never reach the browser.

---

## 2. Supabase integration — **[DECIDED]** / **[IMPLEMENTED: client + app; schema NOT applied]**

**Decision.** Use Supabase as the managed Auth + Postgres provider.

- Supabase project URL: `https://ugdjfbtqnzaccippcpwa.supabase.co` (public).
- Frontend client: [`src/lib/supabase.ts`](../src/lib/supabase.ts) reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- A read-only connectivity check exists: `npm run supabase:check`
  ([`scripts/check-supabase-connection.ts`](../scripts/check-supabase-connection.ts)).

**Implemented:** dependency, client module, env var names, connectivity check,
**admin auth via Supabase Auth**, the private `/admin` dashboard
(`src/admin/*`), and public-content loading via `usePublicContent()` with a
bundled static fallback.
**Not implemented / not applied:** the database schema, RLS policies and storage
bucket are **not applied** to the live project, so the dashboard cannot yet
persist or read data. **Customer** auth still uses the legacy Express/SQLite flow.

---

## 3. SQLite must not be the production database on Vercel — **[DECIDED]**

**Decision.** Do **not** keep `node:sqlite` / `.data/ann_bakery.db` as the
production datastore for the deployed site.

**Why.** Serverless functions have an ephemeral, non-shared filesystem: writes are
lost between invocations/instances and concurrent instances cannot see each other's
data. SQLite is acceptable only for local development.

**Constraint.** The SQLite code and the Express backend must **not be deleted**
without approval — they are the current working local implementation and the
migration may be incremental.

---

## 4. Authentication migration strategy — **[IMPLEMENTED: admin]** / **[PLANNED: customers]**

**Current state.** Custom auth in [`server.ts`](../server.ts): scrypt password
hashes, stateless HMAC-SHA256 bearer tokens (`SESSION_SECRET`, 12h TTL), tokens
kept in frontend JS memory only.

**Admin (done).** The private `/admin` dashboard authenticates with **Supabase
Auth** and authorises via the JWT claim `app_metadata.role = 'admin'`
(`src/lib/auth.ts` → `isAdminUser`). No client-supplied role flag is trusted.

**Decision.** Migrate **customer** accounts to **Supabase Auth** (email +
password). The existing custom customer auth stays in place until Supabase Auth is
fully wired, to avoid breaking the live/local site.

**Notes / requirements.**
- Map the existing `profiles` concept to a Supabase `profiles` table keyed by
  `auth.users.id`.
- Do **not** weaken current rules: reviews must still be forced to `pending` on
  create/edit; customers must not be able to approve their own reviews.
- Password reset currently has no email delivery (`forgot-password` returns a
  "provider not configured" message by design) — Supabase Auth can provide this.

---

## 5. Database security and RLS requirements — **[PROPOSED: SQL prepared, not applied]**

**Decision.** All user-data tables in Postgres must have **Row Level Security
enabled**. The full design is now written (review-only, not applied) in
[`supabase/migrations/002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql).
Admin authorization uses the JWT claim `app_metadata.role = 'admin'` via
`public.is_admin()` (decision D1).

- `profiles`: readable/updatable by the owner only; admins read all; **not public**.
- `categories` / `products` / `product_options`: public read of active/available
  content; admin-only writes.
- `reviews`: public read of `approved`; owners read/insert/update/delete their own
  and are forced to keep them `pending`; only admins approve/reject.
- `site_settings`: public read; admin writes.
- `legacy_customers`: admin-only (preserved history, contains PII).

**Hard rule.** The **service-role / secret key must never reach the frontend** or
be committed. Frontend uses the Publishable key only; RLS enforces access.
`user_metadata` is **never** trusted for authorization — only the signed JWT.

---

## 6. Deployment architecture — **[DECIDED]** / **[PARTIALLY UNVERIFIED]**

**Decision.** Deploy the frontend to **Vercel**, connected to
`Hervekom/ANN-BAKERY-HOUSE`, with environment variables configured in the
Vercel project (never committed).

**Unverified.** No `vercel.json` / `.vercel/` exists in the repo, so the exact
Vercel project, build settings and deployment URL could **not** be confirmed from
the local project. The owner states Vercel is connected (see handoff).

---

## 7. Decisions that must NOT be reversed without owner approval

1. Keep the Supabase **Publishable** key client-side only; never expose secret/service-role keys. — **[IMPLEMENTED]**
2. Never write secrets into documentation, source, or Git; `.env.local` stays git-ignored. — **[IMPLEMENTED]**
3. Do not invent product prices (all products remain `pricePhp: null`). — **[IMPLEMENTED]**
4. Do not delete the SQLite/Express backend during migration without approval. — **[DECIDED]**
5. Do not redesign/rebuild the UI or remove existing features. — **[DECIDED]**
6. Reviews must remain moderated (customer submissions are `pending`; only admins approve/reject). — **[IMPLEMENTED]**
7. Enforce RLS on all user-data tables; admin role must be server-enforced. — **[PLANNED]**
8. Do not commit, push, deploy, or apply DB migrations without explicit approval. — **[DECIDED]**

---

## 8. Owner decisions D1–D7 (approved 2026-11-25)

These were previously open questions and are now **decided**:

| # | Decision |
|---|---|
| D1 | Admin authorization uses the JWT claim **`app_metadata.role = 'admin'`** (no `profiles.role`). |
| D2 | The app talks to Supabase **directly with the Publishable key + strict RLS** (no service-role key in the frontend). |
| D3 | Customers use **Supabase Auth**; existing SQLite accounts are preserved as **legacy records**; password hashes are **not** migrated. |
| D4 | Existing reviews are **migrated**, preserving content, status, timestamps and author display info. |
| D5 | **Supabase Storage** for images (public read, admin-only write). |
| D6 | **Orders are deferred**; WhatsApp ordering must not be represented as stored orders. |
| D7 | A private **`/admin`** dashboard replaces the old public admin entry point — **[IMPLEMENTED]** (the old `AdminModerationModal` was removed; the dashboard needs the schema applied to function). |

### Remaining open questions

- Exact Vercel project name / deployment URL / build command.
- Email delivery provider for password reset (Supabase Auth default vs custom SMTP).
- When to retire the Express/SQLite backend once Supabase is wired end-to-end.
