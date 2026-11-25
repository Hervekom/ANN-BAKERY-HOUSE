# ANN BAKERY HOUSE — Changelog

> Chronological history of project changes. Newest at the top of each date.
> Entries reflect work actually performed; nothing is back-dated or invented.
> Dates use **Asia/Shanghai**.

Legend: **[IMPLEMENTED]** change present in the working tree ·
**[PUSHED]** already on GitHub · **[LOCAL ONLY]** not yet committed/pushed.

---

## 2026-11-26

### Owner Admin Dashboard implemented (Supabase) — [IMPLEMENTED] [LOCAL ONLY]
- **What:** Implemented the private `/admin` dashboard and wired the public site
  to load content from Supabase, per approved decisions D1–D7. Admin access is
  gated by Supabase Auth and `app_metadata.role = 'admin'`. The old public admin
  moderation modal entry point was removed. **No SQL was executed; no Supabase
  tables/RLS exist yet; nothing was committed, pushed or deployed.**
- **Files created (admin):** `src/admin/AdminApp.tsx`, `AdminLogin.tsx`,
  `AdminDashboard.tsx`, `ui.tsx`, `notices.tsx`, and
  `src/admin/sections/{OverviewSection,ProductsSection,CategoriesSection,ReviewsSection,ContentSection,SettingsSection,MediaSection}.tsx`.
- **Files created (data layer):** `src/lib/dbTypes.ts`, `src/lib/auth.ts`,
  `src/lib/adminData.ts`, `src/lib/content.ts`, `src/lib/format.ts`,
  `src/hooks/usePublicContent.ts`.
- **Files modified:** `src/main.tsx` (`/admin` conditional render; no router dep),
  `src/App.tsx` (consumes `usePublicContent()`; removed old admin modal + button),
  `src/components/HeroSection.tsx`, `AboutSection.tsx`, `ContactSection.tsx`,
  `ReviewsSection.tsx` (removed admin entry point), `src/data/menu.ts`
  (`buildWhatsAppUrl(message, digits)` optional param).
- **Files deleted:** `src/components/AdminModerationModal.tsx`.
- **Tests performed:** `npm run lint` (`tsc --noEmit`) → **PASS (exit 0)**;
  `npm run build` → **PASS (exit 0)**. Runtime smoke test on `tsx server.ts`:
  `GET /` → 200, `GET /admin` → 200, `GET /api/reviews/public` → 200,
  `GET /api/admin/status` → 200. Bundle secret scan → **no** `service_role` /
  real `sb_secret_` / `eyJ` values; only the public project URL and the
  Publishable key are inlined (the `sb_secret_` string appears only inside
  `@supabase/supabase-js` key-detection code).
- **Remaining issues:** the Supabase schema is **not applied** (apply steps in
  `SUPABASE_MIGRATION_PLAN.md` §10; requires owner approval). **No real SQLite
  data exists here** — `.data/ann_bakery.db` is a fresh, 0-row DB created by a
  local run (tables `profiles`/`reviews`/`app_settings`/`password_reset_tokens`
  all empty), so no customer/review data could be or was migrated. `/admin`
  protection and RLS cannot be end-to-end verified without a live schema.

## 2026-11-25

### Supabase migration design — Phase 1 (REVIEW-ONLY) — [LOCAL ONLY]
- **What:** Prepared the complete Supabase database + security design for review,
  per approved decisions D1–D7. **No SQL was executed, no database was touched,
  no application code was changed, nothing was deployed or pushed.**
- **Files created:** `supabase/migrations/001_initial_schema.sql` (7 tables +
  triggers + `handle_new_user`), `supabase/migrations/002_rls_policies.sql`
  (RLS enabled + explicit policies for every table; admin via
  `app_metadata.role`), `supabase/migrations/003_storage_policies.sql`
  (bucket `ann-bakery-assets` + storage policies), `supabase/seed.sql`
  (idempotent: 5 categories, 19 products, 8 variant options, 13 site_settings),
  `docs/SUPABASE_MIGRATION_PLAN.md`, `docs/SUPABASE_SECURITY_REVIEW.md`,
  `docs/SQLITE_DATA_MAPPING.md`.
- **Files modified:** `docs/TECHNICAL_DECISIONS.md` (§5 → [PROPOSED]; §8 → D1–D7
  decisions table), `docs/PROJECT_HANDOFF.md` (§3 item 6, §6, §13), this CHANGELOG.
- **Tests performed:** static review only — all 7 files present; secret-pattern
  grep (`sb_publishable|sb_secret|service_role|eyJ|ghp_|sk-`) returns **no
  matches** across the new files. No build/DB test was run (out of scope).
- **Remaining issues:** the proposal is **not applied**. **[CONFIRMED]** there is
  no `.data/` directory or `*.db` file in this checkout, so the real SQLite data
  must be exported where the Express server ran before any import. Applying the
  migration requires explicit owner approval (see `SUPABASE_MIGRATION_PLAN.md`
  §2 prerequisites P1–P5).

### Repository switched to `Hervekom/ANN-BAKERY-HOUSE` — [PUSHED]
- **What:** By owner request, `origin` was repointed from
  `lucdev01234-png/ANN-BAKERY-HOUSE` to `Hervekom/ANN-BAKERY-HOUSE`, and the
  existing history was pushed to the new (previously empty) repo.
- **Files modified:** `.git/config` (remote `origin` URL), `docs/PROJECT_HANDOFF.md`,
  `docs/PROJECT_OVERVIEW.md`, `docs/TECHNICAL_DECISIONS.md`.
- **Tests performed:** `ssh -T github-hervekom` → authenticated as `Hervekom`;
  `git push -u origin main` → **PASS** (`* [new branch] main -> main`); `gh repo view`
  confirmed `Hervekom/ANN-BAKERY-HOUSE` default branch `main`.
- **Remaining issues:** the plain `git@github.com:...` URL does **not** work (the
  default SSH key resolves to `hervekom37`, which is read-only here); the remote
  must stay on the `github-hervekom` SSH alias. Supabase setup + docs still uncommitted.

### Documentation system created — [IMPLEMENTED] [LOCAL ONLY]
- **What:** Added a permanent documentation/handoff system so any future agent can
  recover full context.
- **Files created:** `docs/PROJECT_OVERVIEW.md`, `docs/PROJECT_HANDOFF.md`,
  `docs/TECHNICAL_DECISIONS.md`, `docs/CHANGELOG.md`.
- **Tests performed:** `npm run lint` → PASS (exit 0); `npm run build` → PASS
  (exit 0; JS 470.16 kB, CSS 48.95 kB).
- **Remaining issues:** docs are untracked (not on GitHub); Vercel state still
  unverified; git identity still unconfigured.

### Supabase connectivity check corrected — [IMPLEMENTED] [LOCAL ONLY]
- **What:** The first version of `scripts/check-supabase-connection.ts` probed
  `GET /rest/v1/`, which returns `401 {"message":"Secret API key required"}` for a
  publishable key (that endpoint needs a **secret** key). Switched the probe to the
  public `GET /auth/v1/settings` (200 with a valid key, 401 with an invalid one) and
  removed a `process.exit` that caused a Node crash on failure.
- **Files modified:** `scripts/check-supabase-connection.ts`.
- **Tests performed:** `npm run supabase:check` → **PASS**; `/auth/v1/settings`
  returned HTTP 200 (valid key) vs HTTP 401 (invalid key, verified with a throwaway probe).
- **Remaining issues:** none for this check. The `/rest/v1/` root must **not** be
  used as a publishable-key probe.

### Supabase client configuration prepared — [IMPLEMENTED] [LOCAL ONLY]
- **What:** Installed the Supabase client and added a centralized, credential-safe
  client module plus environment variable names. No app functionality changed.
- **Files created:** `src/lib/supabase.ts`, `scripts/check-supabase-connection.ts`,
  `.env.local` (git-ignored, holds real values), `package.json` script `supabase:check`.
- **Files modified:** `package.json` (added `@supabase/supabase-js` ^2.119.2),
  `package-lock.json`, `.env.example` (added `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`).
- **Tests performed:** `npm install` → 13 packages added, **0 vulnerabilities**;
  `npm run lint` → PASS; `npm run build` → PASS (bundle size unchanged, confirming
  the client is not yet imported).
- **Remaining issues:** the module is not imported anywhere; no Supabase tables/RLS.

### First commit pushed; `.gitignore` hardened — [PUSHED]
- **What:** Ignored the local `gh` CLI config directory to prevent ever committing
  credentials.
- **Files modified:** `.gitignore` (added `.ghcli-config/`).
- **Commits / push:** `6947d42` "chore: ignore local gh CLI config directory"
  pushed to `origin/main` (2026-11-25 23:03 +0800).
- **Tests performed:** `git status -sb` → `main...origin/main`, clean at the time.
- **Remaining issues:** git author identity was supplied via env vars (not config).

### Initial commit pushed — [PUSHED]
- **What:** Initialized the Git repository and pushed the whole project.
- **Commit:** `c20fc4d` "Initial commit: ANN BAKERY HOUSE website"
  (2026-11-25 22:40 +0800), 62 files.
- **Tests performed:** `git ls-remote` confirmed `refs/heads/main == c20fc4d`.
- **Remaining issues:** initial `git push` over HTTPS required switching the
  authenticated GitHub account (see handoff §7).

### Technical audit and dependency fixes — [IMPLEMENTED] [PUSHED via c20fc4d]
- **What:** Audited the AI-Studio-imported project. Removed `esbuild` and
  `autoprefixer` from `devDependencies` (they conflicted with Vite 8 during
  `npm install` and were unreferenced in the code). Added `SESSION_SECRET` and
  `PORT` placeholders to `.env.example`.
- **Files modified:** `package.json`, `.env.example`.
- **Tests performed:** `npm install` → 0 vulnerabilities; `tsc --noEmit` → PASS;
  `vite build` → PASS (25 images copied to `dist/src/assets/images/`).
- **Remaining issues:** `@google/genai` left in place (unused but not blocking).

---

## How to add entries (maintenance rule)

After every significant change, prepend a dated section at the top with:
**What changed**, **Files created/modified**, **Tests performed and results**,
**Remaining issues**. Record failures honestly. Then update
`PROJECT_HANDOFF.md` (and `TECHNICAL_DECISIONS.md` if a decision changed).
