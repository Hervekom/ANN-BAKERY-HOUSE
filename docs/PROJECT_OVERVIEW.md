# ANN BAKERY HOUSE — Project Overview

> High-level reference for the project. For current status, blockers and the next
> action, read [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

## 1. Project name

**ANN BAKERY HOUSE**

## 2. Business purpose and website objectives

ANN BAKERY HOUSE is an African homemade food and bakery business located in
Taguig City, Philippines. The website is a **marketing + ordering-intent** site
(brand presence, menu browsing, WhatsApp ordering), not a transactional
e-commerce store. There is no online payment and no server-side order management:
an order is completed by opening a pre-filled WhatsApp conversation.

Objectives:

- Present the brand and the 19-product menu.
- Let visitors build a "bag" and send an order request to WhatsApp.
- Collect customer accounts and moderated product reviews (trust signal).
- Give the owner an admin moderation panel for reviews.

## 3. Confirmed technology stack

Confirmed by reading `package.json`, `vite.config.ts`, `tsconfig.json` and `server.ts`.

| Layer | Technology |
| --- | --- |
| UI library | React 19 (`react`, `react-dom` ^19.0.1) |
| Language | TypeScript ^7.0.2 |
| Build tool | Vite ^8.3.0 (Rolldown-based) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (no `postcss.config`, no `tailwind.config`) |
| Animation | `motion` ^12.23.24 (`motion/react`) |
| Icons | `lucide-react` ^0.546.0 |
| Backend | Express ^4.21.2 in `server.ts` (single file) |
| Runtime DB | `node:sqlite` (`DatabaseSync`, built into Node) |
| Env loading | `dotenv` ^17.2.3 |
| Supabase client | `@supabase/supabase-js` ^2.119.2 (installed; **not yet used by the app**) |
| Unused dependency | `@google/genai` ^2.4.0 — declared but **never imported** (see §11) |

Node is required (`node:sqlite` and `tsx`). Scripts in `package.json`:

- `dev` → `tsx server.ts` (Express + Vite middleware, dev mode)
- `start` → `node server.ts`
- `build` → `vite build`
- `preview` → `vite preview`
- `clean` → `rm -rf dist server.js`
- `lint` → `tsc --noEmit`
- `supabase:check` → `tsx scripts/check-supabase-connection.ts`

## 4. Project architecture

```
Browser (React SPA)
   │  fetch("/api/...", Authorization: Bearer <token>)
   ▼
Express server (server.ts)
   ├── /api/auth/*      customer accounts (register/login/profile/password)
   ├── /api/reviews/*   public approved reviews + own reviews (CRUD)
   ├── /api/admin/*     admin passcode login + review moderation
   ├── production: serves ./dist as static SPA
   └── development: mounts Vite middleware (HMR disabled, WebSocket-free client)
   ▼
node:sqlite database  .data/ann_bakery.db  (created at runtime)
```

- The frontend is a **single-page app**; all data flows through the Express API
  in [`src/services/api.ts`](../src/services/api.ts). There is no direct database
  access from the browser today.
- Session tokens are **stateless HMAC-SHA256 tokens** (`payload.signature`,
  base64url) signed with `SESSION_SECRET`, TTL 12h, carrying `{ sub, role, exp }`.
- Passwords are hashed with **scrypt** (`salt:derivedHex`, 64-byte key).
- Frontend keeps tokens **in JS memory only** (never localStorage/sessionStorage).

## 5. Main folders and important files

| Path | Role |
| --- | --- |
| [`server.ts`](../server.ts) | Entire Express backend: DB init, auth, reviews, admin, static/Vite serving |
| [`src/App.tsx`](../src/App.tsx) | Top-level state/orchestration and section composition |
| [`src/data/menu.ts`](../src/data/menu.ts) | Menu types, `MENU_CATEGORIES`, `MENU_ITEMS` (19 products), `BUSINESS_INFO`, WhatsApp/price helpers |
| [`src/services/api.ts`](../src/services/api.ts) | Typed `fetch` client for every API route; in-memory token handling |
| [`src/types/account.ts`](../src/types/account.ts) | Types for user, reviews, admin responses |
| [`src/lib/supabase.ts`](../src/lib/supabase.ts) | Centralized Supabase client (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`); **not imported by the app yet** |
| `src/components/*` | UI sections/modals (see §6) |
| [`src/utils/lastOrderStorage.ts`](../src/utils/lastOrderStorage.ts) | Persists the last WhatsApp order draft |
| `src/assets/images/` | 25 product/hero/brand images (referenced as `/src/assets/images/...`) |
| `public/assets/aistudio/` | AI Studio logos/illustrations |
| [`supabase/schema.sql`](../supabase/schema.sql) | **Reference** Postgres schema + RLS for a future Supabase project (not applied anywhere) |
| [`scripts/check-supabase-connection.ts`](../scripts/check-supabase-connection.ts) | Read-only connectivity check for the Supabase project |
| [`vite.config.ts`](../vite.config.ts) | React + Tailwind plugins; custom plugin copies `src/assets` into `dist/` on build; `@` → project root alias |
| [`tsconfig.json`](../tsconfig.json) | `types: ["vite/client", "node"]`, path alias `@/*` |
| [`.env.example`](../.env.example) | Environment variable **names** (placeholders only) |
| `bun.lock` | Present from AI Studio origin; the project is driven by **npm** (`package-lock.json`) |

## 6. Existing features and how they work

- **Menu browsing** — category filter + search over `MENU_ITEMS`
  (`MenuCard`, `DishModal`, `CategoryShowcase`).
- **Bag / order request** — `OrderDrawer` builds a WhatsApp deep link via
  `buildWhatsAppUrl()`; opened with `window.open` to `wa.me/<digits>`. The last
  draft is kept via `lastOrderStorage`.
- **Pre-order / custom request form** — name, phone, date, Pickup/Delivery, message,
  also routed to WhatsApp.
- **Customer accounts** — `AuthModal` (register/login) → `api.ts` →
  Express `/api/auth/*`; profile editing + password change in
  `CustomerProfileModal`. Tokens live in memory only.
- **Reviews** — `ReviewsSection` shows approved reviews + stats (count, average).
  Signed-in customers submit reviews (status forced to `pending`) and can edit /
  delete their own; editing re-resets status to `pending`.
- **Admin moderation** — `AdminModerationModal` → `/api/admin/*`. Admin is a
  **passcode**, either from `ADMIN_PASSCODE` (env) or "claimed" on first use and
  stored hashed in `app_settings`. Moderators approve/reject/delete reviews.
- **Branding** — `BrandLogo`, `HeroSection`, `AboutSection`, `ContactSection`.

## 7. Business information and branding

Source of truth: `BUSINESS_INFO` in [`src/data/menu.ts`](../src/data/menu.ts).

- Name: **ANN BAKERY HOUSE**
- Tagline: **"Authentic Flavors. Homemade with Love."**
- Type: African Homemade Food & Bakery
- Address: 1203 St Peter Street, Holy Family Village, Taguig City, Philippines
- Short address: Holy Family Village, Taguig City
- WhatsApp: +63 954 143 8031
- Currency: **₱** (PHP)
- Fallback price text: "Price to be confirmed"

## 8. Menu structure and all 19 products

5 categories (`MENU_CATEGORIES`). **Every product currently has `pricePhp: null`** →
the UI shows "Price to be confirmed" and directs users to WhatsApp. Prices must
**not** be invented.

**Soups & Traditional Meals**
1. Beef Leg Pepper Soup
2. Bitter Leaf Soup with Rice or Fried Plantain — options: *Rice* / *Fried Plantain*
3. Pepper Soup Catfish

**Grilled & Roasted**
4. Roasted Fish
5. Roasted Chicken
6. Roasted Bars
7. Brocette Soya

**Rice & Main Dishes**
8. Fried Rice with Chicken or Fish — options: *Chicken* / *Fish*
9. Vegetable with Fried Plantain or Rice — options: *Fried Plantain* / *Rice*

**Bakery & Snacks**
10. Donut with Sugar / Without Sugar — options: *With Sugar* / *Without Sugar*
11. Pain Soya
12. French Baguettes
13. Empanada
14. Neems Beef
15. Beef Rolls

**Cakes & Desserts**
16. Lemon Cake
17. Mabre Cake
18. Yaourt Cake
19. Coconut Cake

## 9. External services

- **GitHub** — repository `Hervekom/ANN-BAKERY-HOUSE` (see handoff for exact
  commit state).
- **Vercel** — reportedly connected to the GitHub repo. **Not verifiable from the
  local project** (no `vercel.json`, no `.vercel/`); see handoff.
- **Supabase** — project URL `https://ugdjfbtqnzaccippcpwa.supabase.co`.
  Only the frontend `@supabase/supabase-js` client and a connectivity check exist.
  No tables/policies created from this project, and no app code uses it yet.
- **WhatsApp** — ordering channel via `wa.me` deep links (no API integration).

## 10. Important technical constraints

- **Do not invent prices** — all products are `null` until the business confirms.
- **Do not redesign or rebuild UI**, and **do not remove features**.
- **Secrets never in source or docs** — only variable *names* are documented;
  real values live in `.env.local` (git-ignored).
- **Never expose the Supabase service-role / secret key** to the frontend. Only
  the public URL + Publishable key are allowed client-side.
- `ADMIN_PASSCODE` / admin token = server-side only.
- `.env.local`, `.data/`, `dist/`, `node_modules/` must stay out of Git.
- `sqlite` (`node:sqlite`) is a **runtime/ephemeral** store — not suitable as the
  production database on a serverless host (see `TECHNICAL_DECISIONS.md`).
- `@google/genai` / Gemini is declared but unused; the AI Studio metadata still
  advertises `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.

## 11. Known anomalies (observed)

- `@google/genai` is a dependency but is **never imported** anywhere in the source.
- `metadata.json` advertises a server-side Gemini capability that the code does not use.
- `bun.lock` coexists with `package-lock.json`; the project is run with **npm**.
- The image paths in `MENU_ITEMS` point at `/src/assets/images/...`, which only
  resolves in production because a custom Vite plugin copies `src/assets` into `dist/`.
