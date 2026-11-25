# ANN BAKERY HOUSE — Project Handoff

> ⚠️ The single most important file. It tells any new agent (any account, any
> session) exactly where the project stands and what to do next.

---

## READ THIS FIRST — INSTRUCTIONS FOR THE NEXT AI AGENT

1. **Read all four documentation files before making any change:**
   `PROJECT_HANDOFF.md` (this file), `PROJECT_OVERVIEW.md`,
   `TECHNICAL_DECISIONS.md`, `CHANGELOG.md`.
2. **Inspect the actual source code and Git state** (`git status`, `git log`,
   the files in `src/`, `server.ts`, `scripts/`) — trust the code, not memory.
3. **Compare the documentation with the current implementation.** If they differ,
   the code wins; then fix the docs.
4. **Identify the exact last completed milestone** in `CHANGELOG.md`.
5. **Continue from the recorded "Exact next action" (§13).** Do not restart from scratch.
6. **Never repeat completed work unnecessarily** (e.g. do not recreate
   `src/lib/supabase.ts` or re-install packages that are already present).
7. **Never overwrite existing functionality without understanding it** (auth,
   reviews, admin moderation, the WhatsApp ordering flow, menu data).
8. **Ask for explicit approval before any destructive/irreversible operation:**
   DB migrations, deletions, deployments, force pushes, or major architecture changes.

### Fact-labeling convention used below

- **[CONFIRMED]** — verified by reading code/Git or by a command run in this session.
- **[IMPLEMENTED]** — change actually present in the working tree.
- **[TESTED]** — a check was actually executed; result quoted.
- **[PLANNED]** — agreed intent, not yet built.
- **[UNVERIFIED]** — assumed/claimed but not confirmed locally. Do not treat as fact.

---

## 1. Current project status — **[CONFIRMED]**

- The React SPA + Express/SQLite backend **runs and builds successfully**.
- The project is on **GitHub** (`Hervekom/ANN-BAKERY-HOUSE`, branch `main`).
- **Supabase is now consumed by the app.** The private **`/admin`** dashboard uses
  Supabase Auth (admin via `app_metadata.role = 'admin'`), and the public site
  reads products/categories/editable content from Supabase with a bundled static
  fallback so it never appears empty.
- **No database tables or RLS policies have been created** from this project yet.
  The dashboard code is written but **cannot function until a live Supabase schema
  exists** (it degrades gracefully with a migration notice).
- **No real SQLite data exists in this checkout** — `.data/ann_bakery.db` is a
  fresh, **0-row** DB created by a local run (§8). Nothing was migrated.
- There are **uncommitted/untracked changes** that are **not yet on GitHub** (§11).

## 2. Current development phase — **[CONFIRMED]**

**Phase: application-side Supabase integration implemented; database schema NOT
applied.** The `/admin` dashboard and public-content loading are coded and build
successfully, but they need a live Supabase schema to actually store/read data.
Applying the migration is the immediate next step (owner approval required).

## 3. Completed work — **[CONFIRMED]**

1. **Technical audit** of the AI-Studio-imported project; safe dependency fixes
   (removed `esbuild` and `autoprefixer` from `devDependencies`, which conflicted
   with Vite 8 and were unreferenced).
2. **Git initialization** and first push.
3. **Supabase client preparation** (dependency, client module, env var names).
4. **Supabase connectivity check** script (`npm run supabase:check`).
5. **Documentation system** (`docs/` — these four files).
6. **Supabase migration design — Phase 1 (REVIEW-ONLY, not applied).** Proposed
   schema, RLS, storage policies, seed and three review docs. Files:
   [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql),
   [`002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql),
   [`003_storage_policies.sql`](../supabase/migrations/003_storage_policies.sql),
   [`supabase/seed.sql`](../supabase/seed.sql),
   [`docs/SUPABASE_MIGRATION_PLAN.md`](./SUPABASE_MIGRATION_PLAN.md),
   [`docs/SUPABASE_SECURITY_REVIEW.md`](./SUPABASE_SECURITY_REVIEW.md),
   [`docs/SQLITE_DATA_MAPPING.md`](./SQLITE_DATA_MAPPING.md).
7. **Owner Admin Dashboard implemented (2026-11-26).** Private `/admin` app with
   Supabase Auth admin gate + 7 sections (Overview, Products, Categories, Reviews,
   Website content, Business settings, Media library); public site now loads
   content from Supabase with static fallback; old public admin modal removed.
   See `CHANGELOG.md` (2026-11-26) for the full file list. **Schema not applied.**

## 4. Currently implemented in code — **[IMPLEMENTED]**

- **Public site (React SPA):** menu browsing/search, bag + WhatsApp order link,
  pre-order/custom form, customer accounts UI, reviews UI. (Details in
  `PROJECT_OVERVIEW.md` §6.) The homepage hero, about text and contact block now
  read editable values from Supabase via `usePublicContent()`, falling back to
  bundled defaults.
- **Private `/admin` dashboard (new):** rendered client-side when the path is
  `/admin` (see `src/main.tsx`). Login via Supabase Auth; access requires
  `app_metadata.role = 'admin'` (never trusted from client flags). Sections:
  Overview, Products, Categories, Reviews, Website content, Business settings,
  Media library. Uses `src/lib/adminData.ts` for all CRUD.
- **Data layer:** `src/lib/supabase.ts` (null-safe client, **now imported**),
  `src/lib/dbTypes.ts`, `src/lib/auth.ts`, `src/lib/adminData.ts`,
  `src/lib/content.ts`, `src/lib/format.ts`, `src/hooks/usePublicContent.ts`.
- **Legacy backend (`server.ts`):** custom auth (register/login/profile/
  change-password/forgot-password), public + own reviews CRUD, admin passcode +
  moderation, SQLite persistence, static-SPA serving in production. **Unchanged.**
  Its `/api/admin/*` routes still exist server-side but are **no longer used by the
  frontend** (the old `AdminModerationModal` was deleted; the Express layer was
  left intact by design — no destructive changes).
- `scripts/check-supabase-connection.ts` — read-only connectivity probe.
- `.env.example` lists all environment variable **names** (placeholders only).

## 5. Tests actually executed and results — **[TESTED]**

### Run on **2026-11-26** (admin dashboard + public integration):

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run lint` (`tsc --noEmit`) | **PASS — exit 0** |
| Production build | `npm run build` (`vite build`) | **PASS — exit 0** (`dist/assets/*.js` ≈ 741.7 kB; the Supabase URL + Publishable key are now inlined because the client is imported) |
| Runtime smoke test | `tsx server.ts --port 3999` then HTTP GETs | `GET /` → **200**, `GET /admin` → **200**, `GET /api/reviews/public` → **200**, `GET /api/admin/status` → **200** |
| Bundle secret scan | regex on `dist/assets/*.js` | **No** `service_role` / real `sb_secret_` / `eyJ` secrets. Only the public project URL (`ugdjfbtqnzaccippcpwa…`) and the Publishable key (`sb_publishable_…`) are present; the bare string `sb_secret_` occurs only inside `@supabase/supabase-js` key-detection code |

### Run on **2026-11-25** (from the working tree):

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run lint` (`tsc --noEmit`) | **PASS — exit 0, no errors** (run *after* all current code changes) |
| Production build | `npm run build` (`vite build`) | **PASS — exit 0**, `dist/index.html` 1.45 kB, `dist/assets/*.css` 48.95 kB, `dist/assets/*.js` 470.16 kB |
| Supabase connectivity | `npm run supabase:check` | **PASS** — `GET /auth/v1/settings` → **HTTP 200** (Publishable key accepted) |

Additional earlier evidence (from the previous session, **not re-run here**):
`npm install` reported **0 vulnerabilities**; a manual runtime flow
(register → submit review → admin moderation) succeeded against the local DB.
Treat this last item as **[UNVERIFIED]** for the current commit.

Notes:
- On 2026-11-25 the bundle was **470.16 kB** because nothing imported
  `src/lib/supabase.ts` (tree-shaken out). **This is now obsolete:** as of
  2026-11-26 the client **is** imported, so the bundle grew to ≈ 741.7 kB and the
  URL + Publishable key are inlined (see the 2026-11-26 table above).
- A wrong probe endpoint was tried first: `GET /rest/v1/` returns
  `401 {"message":"Secret API key required"}` — that endpoint needs a **secret**
  key, so it is **not** a valid check for the publishable key. The correct probe
  is `/auth/v1/settings` (200 valid / 401 invalid). Do not "fix" the script back
  to `/rest/v1/`.

## 6. Not yet implemented — **[PLANNED]**

- Postgres tables + RLS policies. A **complete proposal now exists** in
  `supabase/migrations/` (see §13) but is **not applied**; the older
  [`supabase/schema.sql`](../supabase/schema.sql) is a superseded reference only.
  **Until these exist, the `/admin` dashboard and the Supabase-backed public
  content cannot store or read data** (they fall back / show a migration notice).
- Supabase Auth for **customers** replacing the custom HMAC auth. (Admin auth via
  Supabase is already implemented; customer auth migration is not.)
- Serverless API layer for Vercel (the Express server is not deployed).
- Confirmed Vercel build/runtime configuration.
- Email delivery for password reset.
- Any tests/CI beyond the manual checks above.

## 7. Blockers and known issues — **[CONFIRMED]**

1. **Git author identity is not configured** (global/local `user.name`/`user.email`
   are empty). A plain `git commit` fails with *"Author identity unknown"*.
   Existing commits carry `lucdev01234-png <lucdev01234-png@users.noreply.github.com>`
   (supplied via `GIT_AUTHOR_*` / `GIT_COMMITTER_*` env vars). Any new commit
   targeting the current repo should use an identity for the **Hervekom** account
   — confirm with the owner. Do **not** change global git config without approval.
2. **Uncommitted work** — the Supabase setup and docs are **not** on GitHub yet (§11).
3. **GitHub auth is split across two identities.** The default `gh` CLI session is
   `hervekom37` (**read-only** on this repo), so `gh`-based writes fail. Pushes work
   because `origin` uses the SSH alias `github-hervekom` → the **Hervekom** account
   (see §11). A `.ghcli-config/` dir + `GH_CONFIG_DIR` were used earlier in the
   session as a sandbox workaround; a fresh shell may not carry it. (Operational
   note, not a project defect.)
4. **`@google/genai` is an unused dependency**; `metadata.json` advertises a Gemini
   capability that is not used.
5. **`bun.lock` and `package-lock.json` coexist**; the project is run with npm.
6. **Vercel state is unverified** locally (no `vercel.json` / `.vercel/`).

## 8. Database architecture

**[CONFIRMED — current runtime DB]** `node:sqlite` (`DatabaseSync`) at
`.data/ann_bakery.db` (git-ignored), created at startup by `initDatabase()` in
[`server.ts`](../server.ts).

> **Note (2026-11-26):** a fresh `.data/ann_bakery.db` now exists because a local
> server run was performed for smoke testing. It is **empty** — `profiles`,
> `reviews`, `app_settings`, `password_reset_tokens` all report **0 rows**.
> There is **no real customer/review data** in this checkout to back up or migrate.

Tables:

- `profiles` (id, name, email UNIQUE, password_hash, role customer|admin, timestamps)
- `reviews` (id, user_id → profiles, rating 1–5, product_id, product_name, comment,
  status pending|approved|rejected, moderated_by, moderated_at, timestamps)
  with indexes `(status, created_at DESC)` and `(user_id, created_at DESC)`
- `password_reset_tokens` (id, user_id, token_hash, expires_at, used_at, created_at)
- `app_settings` (key, value) — stores `admin_passcode_hash` when the admin
  passcode is "claimed"

**[PLANNED — target DB]** Supabase PostgreSQL with the same logical model plus RLS;
reference DDL in [`supabase/schema.sql`](../supabase/schema.sql) (`profiles`,
`reviews`, `is_admin()` helper, RLS policies). **Not applied.**

## 9. Supabase project — **[CONFIRMED]**

- **Project URL (public):** `https://ugdjfbtqnzaccippcpwa.supabase.co`
- **Keys:** the **Publishable** key exists only in `.env.local` (git-ignored). No
  key value is recorded in documentation or source. There is **no** service-role key here.

## 10. Environment variables (NAMES ONLY — never values)

From [`.env.example`](../.env.example) and code usage:

| Name | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend (Vite) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend (Vite) | Supabase publishable (anon) key — public-safe |
| `SESSION_SECRET` | server | signs custom auth tokens |
| `ADMIN_PASSCODE` | server | admin moderation passcode (optional; can be claimed) |
| `PORT` | server | production listen port |
| `GEMINI_API_KEY` | server | listed for AI Studio; **unused** in current code |
| `APP_URL` | server | listed for AI Studio; not read by current code |

Real values live **only** in `.env.local` (git-ignored). Never copy its contents
into docs, source, commits, or chat.

## 11. GitHub — **[CONFIRMED]**

- **Canonical repo:** `Hervekom/ANN-BAKERY-HOUSE` (owner = personal account
  `Hervekom`; public). Default branch `main`.
- **Remote:** `origin` → `git@github-hervekom:Hervekom/ANN-BAKERY-HOUSE.git`
  (SSH via the host alias `github-hervekom` in `~/.ssh/config`, which uses the key
  `~/.ssh/id_ed25519_hervekom` → authenticates as **Hervekom**).
  ⚠️ The plain `git@github.com:...` form fails: the default key (`id_ed25519`)
  resolves to `hervekom37`, which has **read-only** access (`push: false`) here.
- Branch: **`main`**, tracking `origin/main`.
- **Last pushed commit:** `6947d42` — "chore: ignore local gh CLI config directory"
  (2026-11-25). Previous: `c20fc4d` — "Initial commit: ANN BAKERY HOUSE website".
  Both were pushed to this repo on 2026-11-25 (it was empty; `main` created).
- **Working tree is NOT clean** — these changes are **local only, not pushed**:
  - Modified: `package.json`, `package-lock.json`, `.env.example`
  - Untracked: `scripts/`, `src/lib/`, `docs/`
- A **previous remote** (`lucdev01234-png/ANN-BAKERY-HOUSE`) was replaced by the
  owner's decision; it still exists on GitHub but is no longer used by this checkout.

## 12. Vercel — **[UNVERIFIED]**

The owner states the project is connected to Vercel, but **no Vercel
configuration exists in the repository** (`vercel.json` and `.vercel/` are absent),
so the project, build command, environment variables and deployment URL **could
not be confirmed** from the local checkout. Do not assume a deployment URL.
The current Express backend is **not** a serverless function and is not deployed by
`vite build`.

## 13. Exact next action — **[PLANNED]**

**Await owner approval, then apply the prepared Supabase schema and verify the
already-implemented `/admin` dashboard end-to-end.**

The application code (admin dashboard + public Supabase integration) is
implemented and builds successfully. It only needs a live schema to function.

1. Owner approves [`docs/SUPABASE_MIGRATION_PLAN.md`](./SUPABASE_MIGRATION_PLAN.md).
2. **There is no local SQLite data to migrate** — `.data/ann_bakery.db` is a fresh
   **0-row** DB (§8). Skip the SQLite import unless a real DB is supplied from
   wherever the Express server actually ran.
3. In the **Supabase SQL editor or CLI**, apply in order:
   `001_initial_schema.sql` → `002_rls_policies.sql` → `003_storage_policies.sql`
   → `supabase/seed.sql` (all under `supabase/`).
4. Provision the admin account (plan §6) — grant `app_metadata.role='admin'`
   **server-side only**; the admin must sign in again so the JWT carries the claim.
5. Verify (plan §7 + Task Step 8): anon reads public content only; anon writes
   fail; admin writes succeed; `/admin` refuses non-admins; no secrets in bundle.
6. Only afterwards (separate approvals): migrate **customer** Auth and configure
   Vercel.

Do **not** execute any SQL or create the storage bucket without explicit owner approval.

## 14. Exact instructions for the next agent

1. Run `git status` and read the untracked `docs/`, `scripts/`, `src/lib/`,
   `src/admin/`, `src/hooks/` — that is the "in-flight" work.
2. Verify the environment with: `npm install` (if needed), `npm run lint`,
   `npm run build`, `npm run supabase:check`. All should pass as in §5.
3. Confirm with the owner which of these they want first:
   (a) **apply the Supabase schema + RLS** (needed for the new `/admin` dashboard
   to work — the most likely next step), (b) migrate **customer** Auth,
   (c) fix/verify the Vercel config.
4. When committing: the repo has **no git identity**; supply
   `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env vars (see §7) and **ask before
   committing/pushing**. Pushes go to `Hervekom/ANN-BAKERY-HOUSE` via the
   `github-hervekom` SSH alias (§11); do not switch back to the plain
   `git@github.com:` URL.
5. After any significant change, update this file, add a `CHANGELOG.md` entry, and
   revise `TECHNICAL_DECISIONS.md` if a decision changed. Keep §13 actionable and
   record failures instead of hiding them.
