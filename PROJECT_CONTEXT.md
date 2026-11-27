# PROJECT_CONTEXT — ANN BAKERY HOUSE

> Handover document for a brand-new Trae account. Read this fully before touching
> anything. It describes the current, real state of the project — not a proposal.
>
> **This file contains no secrets.** No passwords, API keys, or service-role keys
> are stored here. Secret values live only in the git-ignored `.env.local` and in
> the Vercel project settings.

---

## 1. Project identification

| Item | Value |
| --- | --- |
| Project name | ANN BAKERY HOUSE |
| Repository | `Hervekom/ANN-BAKERY-HOUSE` (GitHub, branch `main`) |
| Production URL | https://annbakeryhouse.vercel.app |
| Local path | `F:\untitled` |
| Business | African homemade food & artisanal bakery, Taguig City, Philippines |

### Technology stack
- **React 19** (`react`, `react-dom` ^19.0.1)
- **TypeScript 7** (`tsc --noEmit` used for lint)
- **Vite 8** (build) + `@vitejs/plugin-react`
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Express 4** (legacy dev/start server via `tsx server.ts`; the production app is a static SPA on Vercel)
- **Supabase JS v2** (`@supabase/supabase-js`) — database, auth, storage
- **lucide-react** (icons), **motion** (animation)
- **Deployment**: Vercel (auto-deploys from GitHub `main`)

### NPM scripts
- `npm run dev` → `tsx server.ts`
- `npm run build` → `vite build`
- `npm run lint` → `tsc --noEmit`
- `npm run preview` → `vite preview`

---

## 2. Current architecture and important files

Single-page React app with a minimal dependency-free router in the entry file:
`/admin` (and `/admin/*`) renders the private dashboard, anything else renders the
public website.

### Entry & public site
- `src/main.tsx` — entry. Routes `/admin` → `AdminApp`, else `App`. Also holds the
  global `focusin` handler that keeps a focused form control visible above the
  mobile keyboard.
- `src/App.tsx` — public website (hero, menu, cart, reviews, sharing, checkout).
- `src/index.css` — Tailwind entry + global CSS (mobile input zoom fix at 16px,
  `scroll-margin-block`).
- `index.html` — viewport meta includes `interactive-widget=resizes-content`.

### Public building blocks
- `src/components/` — `Navbar`, `HeroSection`, `MenuCard`, `DishModal`,
  `PriceLabel`, `OrderDrawer`, `ShareMenu`, `AuthModal`, `CustomerProfileModal`,
  `AboutSection`, `ReviewsSection`, `ContactSection`.
- `src/data/menu.ts` — static fallback menu (`MENU_ITEMS`, all prices `null`) and
  the pricing helpers (see §5).
- `src/hooks/usePublicContent.ts` — loads public content, starts on static
  content, upgrades to Supabase, revalidates on `focus` / `visibilitychange` /
  `pageshow`.

### Admin dashboard (private `/admin`)
- `src/admin/AdminApp.tsx`, `src/admin/AdminDashboard.tsx`
- `src/admin/sections/` — Products, Categories, Content, Orders, Reviews, Media,
  Settings
- `src/admin/ui.tsx`, `src/admin/ImageField.tsx`, `src/admin/notices.tsx`

### Shared logic
- `src/lib/supabase.ts` — single Supabase client (uses only the public URL +
  publishable key; all requests use `cache: 'no-store'`).
- `src/lib/content.ts` — public content loader + `resolveImagePath` (maps legacy
  `/src/assets/...` refs to hashed production URLs via `import.meta.glob`).
- `src/lib/adminData.ts` — admin CRUD helpers (RLS-gated, never service-role).
- `src/lib/dbTypes.ts` — row types mirroring the SQL schema.
- `src/lib/orders.ts` — order placement, calls the `place_order` RPC.
- `src/lib/auth.ts`, `src/lib/format.ts`, `src/lib/analytics.ts`
- `src/services/api.ts`, `src/types/account.ts`, `src/utils/lastOrderStorage.ts`

### Database & deployment config
- `supabase/migrations/001_initial_schema.sql` … `005_variant_pricing.sql`
- `supabase/seed.sql`, `supabase/schema.sql`
- `vercel.json` — SPA rewrite (all non-`/api` routes → `index.html`)
- `.env.local` — local Supabase config (**git-ignored, never commit**)

---

## 3. Supabase configuration and migration status

- **Managed manually by the owner** through the Supabase Dashboard. Do **not**
  attempt to connect Supabase through Trae; the owner has stated they handle all
  Supabase operations themselves.
- Configuration is read from two env vars (values are secret and not in this file):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable/anon key only — never the
    service-role/secret key in frontend code)
- These must also be set in **Vercel → Project → Settings → Environment Variables**;
  Vite bakes them in at build time, so a redeploy is required after changing them.
- **Migrations 001–005 have been applied** to the live project:
  - `001_initial_schema.sql` — tables, `updated_at` triggers, auth trigger
  - `002_rls_policies.sql` — Row Level Security + `public.is_admin()`
  - `003_storage_policies.sql` — storage bucket policies
  - `004_orders.sql` — `orders` / `order_items` + `place_order` RPC
  - `005_variant_pricing.sql` — adds `product_options.price_php` and makes
    `place_order` variant-aware
  - plus `seed.sql` (initial content)
- Storage bucket: `ann-bakery-assets` (public read, admin write; JPEG/PNG/WebP/AVIF,
  5 MB max).
- Admin authorization relies **only** on the JWT claim `app_metadata.role = 'admin'`
  (`user_metadata` is client-writable and never trusted). RLS is the real security
  boundary.

---

## 4. Completed features

- **Admin dashboard** (private `/admin`): full CMS for products, categories,
  homepage content (hero/about/contact), business settings, reviews moderation,
  and a media library — all backed by Supabase.
- **Authentication**: Supabase Auth for administrators (`app_metadata.role =
  'admin'`) and for customers. Legacy SQLite accounts are preserved as read-only
  historical archives (no password hashes migrated).
- **Orders**: real order capture. Checkout records the order in Supabase via the
  secure `place_order` RPC (server-side price validation + snapshot, idempotent)
  **before** opening the WhatsApp message. Admin can search/filter/change status
  (pending, confirmed, preparing, completed, cancelled).
- **Sales analytics**: KPI cards, SVG charts, ranked product performance, CSV
  export; figures computed only from `completed` orders.
- **Menu sharing** (whole menu) and **individual product sharing**: WhatsApp,
  Facebook, Messenger (with copy-link fallback), native `navigator.share`, and copy
  link. Product links use `?product=<id>#menu`.
- **Persistent cart**: the shopping bag is stored in the visitor's browser
  (`localStorage`, key `ann_bakery_cart_v1`) via `src/utils/cartStorage.ts`, so a
  page refresh or a returning visitor keeps the selected dishes — no account
  required. Cart lines are re-resolved against the live menu so restored items
  show the current name/image/price.

---

## 5. Pricing implementation and the current unresolved issue

### How pricing is designed to work
- **Base price**: `products.price_php` (nullable). `NULL` = "price to be confirmed".
- **Variant override**: `product_options.price_php` (nullable, added by migration 005).
  When a variant has a price, it overrides the product base price; otherwise the
  base price is used. Prices are **never invented**.
- **Single source of truth**: `getUnitPrice(item, selectedOption)` in
  `src/data/menu.ts` — used by menu cards, `DishModal`, the cart
  (`OrderDrawer`), and `hasPendingPricing`/`bagSubtotal`. `getPriceRange` computes
  min/max from base + variant prices.
- **Server authority**: the `place_order` RPC re-reads prices from the database and
  snapshots them into `order_items`; browser-submitted prices are never trusted.
- Two `formatPhp` helpers exist: `src/data/menu.ts` (public, no decimals) and
  `src/lib/format.ts` (admin, 2 decimals).

### Current unresolved issue: prices are not displaying
Diagnostic already performed (read-only query against the live database):

- **All 19 products have `price_php = null`.**
- **All 8 `product_options` rows have `price_php = null`.**

Conclusion reached: the site displays "Price not available" because **no price is
stored in the database** — this is the documented `NULL` behaviour, **not a
rendering bug**. The full load/save/display pipeline was verified end to end and is
correct (`content.ts` → `MenuCard`/`DishModal`/`OrderDrawer`; admin form →
`adminData` → Supabase).

Fixes already applied and shipped (commit `f049c74`):
- `MenuCard` passed `{...getPriceRange(item)}` (→ `{min,max}`) instead of the
  expected `minPrice`/`maxPrice` props, which could block display. Fixed.
- A shared `?product=` link now resolves the product against **live** Supabase
  content instead of a stale static snapshot, so it shows the real current price
  and image.

**Open next step:** The owner must **enter prices in the admin dashboard**
(Admin → Products → "Price in PHP"). Prices stay `NULL` until the owner provides
them (a hard project constraint — do not invent or backfill prices). If the owner
reports that entered prices do **not** persist, investigate the admin **write**
path (RLS / admin JWT / `updateProduct` + `replaceProductOptions`) — that path was
reviewed and appears correct, but it has not been reproduced as failing.

---

## 6. FIXED — Blank screen when opening the shopping cart (2026-11-26)

**Symptom:** items could be added to the cart, but clicking to open the cart
(`OrderDrawer`) rendered a completely blank page.

**Root cause:** a React **Rules of Hooks violation** in
`src/components/OrderDrawer.tsx`. Commit `fb37bf4` ("feat(pricing):
variant-specific prices and variant-aware cart totals") added two `useMemo` hooks
(`hasPendingPricing`, `bagSubtotal`) for the variant-aware totals **after** the
`if (!open) return null;` early return. The component therefore ran 15 hooks
while closed but 17 hooks while open. React detects the changing hook count,
throws **"Rendered more hooks than during the previous render"**, and — because
there is no error boundary — unmounts the entire app. That is why the page went
blank exactly when the cart was opened (and only then).

**Fix:** in `src/components/OrderDrawer.tsx`, the early return was moved to
**after every hook**. `if (!open) return null;` now sits below
`hasPendingPricing` / `bagSubtotal`, with an inline comment warning that it must
stay after all hooks. No other component had the same issue — `DishModal`,
`ShareMenu`, `AuthModal` and `CustomerProfileModal` already return only after
their hooks (verified).

**Verification:** the cart now opens without crashing. Add item, open cart,
close (✕ and Escape), quantity +/- , Remove, Clear Cart, and the pricing footer
all behave correctly. Because prices are still `NULL` in the database,
`getUnitPrice()` correctly returns `null`, `hasPendingPricing` is `true`, and the
footer shows the "Price to be confirmed by ANN BAKERY HOUSE" label instead of a
numeric subtotal — missing prices no longer crash the cart. Existing pricing
(`getUnitPrice`) and sharing logic were left untouched.

---

## 6.1 FIXED — Cart lost on page refresh (2026-11-26)

**Symptom:** items added to the shopping bag disappeared on page refresh. Guests
(no account) could never get their selection back.

**Root cause:** the bag lived only in React state
(`useState<Record<string, BagEntry>>({})` in `src/App.tsx`) and was never
persisted, so any reload reset it to empty.

**Fix:**
- Added `src/utils/cartStorage.ts` (same pattern as `lastOrderStorage.ts`):
  `loadSavedCart()` / `saveCart()` read and write a sanitized cart to
  `localStorage` under `ann_bakery_cart_v1`. Each line stores an item snapshot
  (`{ item, selectedOption, quantity }`), validated on read so corrupt/partial
  data can never crash the app.
- `src/App.tsx`:
  - `bag` is now lazily initialised from `loadSavedCart()`.
  - a `useEffect([bag])` saves the cart after every change;
  - a `useEffect([items])` re-resolves each line against the live menu (replacing
    the stored snapshot when the product still exists), so a restored cart shows
    the current name/image/price and never regresses to stale data. It returns the
    previous state when nothing changed, so there is no render loop.

**Why a snapshot:** restoring by id against the bundled static menu only would
drop products that exist solely in the dashboard. The snapshot guarantees the
selection survives the refresh; the live re-resolution keeps it current.

**Verification:** `npm run lint` → 0 errors; `npm run build` → success. Manual:
add items → refresh → bag and quantities remain; change quantity / remove / clear
→ refresh → state matches; opening the cart still works (no hooks regression).

---

## 6.2 CHANGED — Checkout no longer redirects to WhatsApp (2026-11-26)

**History:** confirming the cart used to open a blank WhatsApp tab
(`window.open('', '_blank')`) and then navigate it to WhatsApp — a blank flash
followed by a hard redirect away from the site (poor UX). An interim fix rendered
a branded waiting page into that tab; it is now **superseded**.

**Current behaviour (final):** confirming the order records it in Supabase
(`place_order`) and shows an **on-site confirmation popup** ("Order sent!" with the
reference number). The customer **stays on the website** — no tab is opened and
nothing is redirected. WhatsApp is no longer opened automatically; it remains an
optional action from the cart ("Send on WhatsApp", "Copy Order Message") and from
the "Last Prepared WhatsApp Order" panel.

**Implementation (`src/components/OrderDrawer.tsx`):**
- `handleSubmitOrder` records the order then sets the new `showSuccess` state; it
  no longer calls `window.open` / `location.href`. The now-unused
  `WHATSAPP_WAITING_PAGE` constant was removed.
- New success popup (`role="alertdialog"`, `z-[60]`) shows the reference and a
  "Continue browsing" button that closes the popup and the drawer.
- `showSuccess` resets whenever the cart signature changes.
- Copy aligned: primary button is now "Confirm Order" (was "Confirm Order on
  WhatsApp"); the in-drawer panel now reads "You can also send the summary … on
  WhatsApp if you wish."
- Ledger note: the order still reaches the bakery via the Supabase admin
  dashboard (Orders). WhatsApp is now opt-in, never a forced redirect.

**Verification:** `npm run lint` → 0 errors; `npm run build` → success. Manual:
confirm an order → the popup appears on the same page with the reference; no new
tab and no redirect.

---

## 6.3 CHANGED — Brand red buttons recoloured to purple (2026-11-26)

**Request:** to align with the restaurant's colours, the **red of the buttons** was
changed to **purple**.

**Choice (confirmed by the owner):**
- Purple shade = **Prune `#7E22CE`** (hover `#6B21A8`).
- Scope = **buttons / active states only** — red *accents* (text, icons, badges,
  notices, charts) are intentionally **left unchanged**.

**Mapping applied:** solid `bg-[#AF140B]` → `bg-[#7E22CE]`; `hover:bg-[#8E1009]` →
`hover:bg-[#6B21A8]`.

**Files touched (button backgrounds + active tab states):**
`src/App.tsx` (category tab active state, "Show Full Menu", "Review & Send Order"),
`src/components/OrderDrawer.tsx`, `DishModal.tsx`, `MenuCard.tsx`, `HeroSection.tsx`,
`AboutSection.tsx`, `Navbar.tsx`, `CustomerProfileModal.tsx`,
`src/admin/AdminDashboard.tsx` (active tabs), `src/admin/ui.tsx` (primary button
variant), `src/admin/sections/OverviewSection.tsx`, `AnalyticsSection.tsx`,
`ReviewsSection.tsx`, `ProductsSection.tsx`.

**Intentionally NOT changed (accents, not buttons):** translucent accent chips and
notices (`bg-[#AF140B]/10`, `/8`, `/30`), red text/icons, chart palette colours,
and the admin load progress bar — e.g. `AuthModal`, `components/ReviewsSection`,
`admin/ImageField`, `admin/sections/OrdersSection`, `admin/charts.tsx`.

**Verification:** `npm run lint` → 0 errors; `npm run build` → success. A control
`grep` confirms no solid button background still uses `#AF140B`.

---

## 6.4 FIXED — Admin image upload failed on mobile (2026-11-27)

**Symptom:** in the admin dashboard, images could be uploaded from a computer, but
on a phone the file/gallery picker would not open.

**Root cause:** in `src/admin/ImageField.tsx` the native file input was hidden with
`className="hidden"` (`display: none`) and the picker was opened by calling
`inputRef.current.click()` from the button's `onClick`. Programmatically clicking a
`display: none` file input is unreliable on several mobile browsers (notably iOS
Safari), so the gallery never opened on a phone — while it worked fine on desktop.

**Fix (native activation, no JS gesture needed):**
- The "Choose from Gallery" and "Upload new image" controls are now `<label
  htmlFor>` elements bound (via `useId`) to the native `<input type="file"
  accept="image/*">`. Tapping the label lets the browser open the picker natively —
  the most reliable path on both mobile and desktop.
- The input is now `className="sr-only"` (visually hidden but **not**
  `display: none`), which keeps programmatic/native activation working.
- The `inputRef` / `useRef` programmatic-click wiring was removed.

**Constraints preserved:** still a native `type="file"` + `accept="image/*"` input;
controls keep a ≥ 40px touch target; JPEG/PNG/WebP/AVIF, 5 MB max validation
unchanged.

**Verification:** `npm run lint` → 0 errors; `npm run build` → success.

---

## 7. Ongoing pricing task and progress (unchanged by the cart fix)

**Task:** Make product prices display correctly end to end.

**Progress:**
1. Verified the live database: zero prices stored (see §5). ✔
2. Verified the public rendering path (cards, modal, cart) and the admin save path
   are correct. ✔
3. Fixed `MenuCard` price-range props. ✔
4. Fixed stale content on shared product links (live resolution). ✔
5. Confirmed lint + build pass, committed and pushed. ✔
6. **Remaining:** confirm whether the owner can save a price and see it persist.
   If saving works, the issue is simply that no prices have been entered yet.
   If saving silently fails, debug the admin write path next.

---

## 8. Build / lint status and latest Git status

- `npm run lint` (`tsc --noEmit`) → **0 errors**
- `npm run build` (`vite build`) → **success** (single JS bundle ≈ 822 kB; only
  the standard "chunks > 500 kB" warning)
- Branch: `main`
- Recent fixes shipped on `main`: cart hooks-order fix, cart persistence, on-site
  order confirmation popup (no WhatsApp redirect), and the purple button recolour
  (§6–§6.3).
- Local-only artifacts: `.vercel/`, `.vercelignore` (keep out of commits).

---

## 9. Important constraints (do not violate)

- **Never reset or discard existing work.** Continue from the current workspace
  state; do not regenerate the project from scratch.
- **Never repeatedly request a Supabase connection.** Supabase is managed manually
  by the owner via the Dashboard. Do not block progress waiting for a Trae-side
  connection.
- **Never execute SQL / migrations without explicit approval.** The owner applies
  migrations manually in the Supabase SQL Editor.
- **Never commit, push, or deploy without explicit authorization.** (Vercel
  deploys automatically from GitHub `main`, so a push implies a deploy.)
- **Preserve existing features and data.** Do not redesign, rebrand, or remove
  working functionality. Do not migrate legacy customer password hashes.
- **Work directly in the existing workspace** (`F:\untitled`).
- Additional standing rules:
  - Product prices remain `NULL` ("price to be confirmed") until the owner supplies
    them — never invent prices.
  - Never expose the service-role/secret key in frontend code.
  - Admin authorization = JWT `app_metadata.role = 'admin'` only.
  - Keep form controls ≥ 16px on touch devices (prevents mobile auto-zoom); do not
    disable user zoom.
  - All Supabase requests use `cache: 'no-store'`; revalidate public content on
    `focus` / `visibilitychange` / `pageshow`.
  - `vercel.json` keeps the SPA rewrite for frontend routes.
  - Orders must be recorded in Supabase **before** opening the WhatsApp message;
    revenue/analytics count only `completed` orders.
