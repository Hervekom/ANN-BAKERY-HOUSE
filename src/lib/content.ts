import { BUSINESS_INFO, MENU_CATEGORIES, MENU_ITEMS, MenuItem } from '../data/menu';
import { supabase } from './supabase';
import { CategoryRow, ProductOptionRow, ProductRow } from './dbTypes';

/**
 * Public website content loader.
 *
 * Reads `site_settings`, `categories` and `products` from Supabase when it is
 * configured and the reviewed migrations have been applied. If Supabase is not
 * configured, unreachable, empty, or the tables do not exist yet, it falls back
 * to the bundled static content so the public website keeps working exactly as
 * before (no redesign, no data loss).
 */

export interface HeroContent {
  image: string;
  title: string;
  subtitle: string;
}

export interface AboutContent {
  heading: string;
  body: string;
  main_image: string;
  bakery_image: string;
  meal_image: string;
}

export interface ContactContent {
  heading: string;
  intro: string;
  map_embed_url: string;
}

export interface SiteSettings {
  business_name: string;
  tagline: string;
  business_type: string;
  address: string;
  short_address: string;
  whatsapp_display: string;
  whatsapp_digits: string;
  currency: string;
  currency_code: string;
  price_pending_text: string;
  hero: HeroContent;
  about: AboutContent;
  contact: ContactContent;
}

/**
 * Defaults = the exact content currently shipped in the project. They match the
 * values seeded by `supabase/seed.sql`, so the site is identical before and
 * after the migration. No value here is invented.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  business_name: BUSINESS_INFO.name,
  tagline: BUSINESS_INFO.tagline,
  business_type: BUSINESS_INFO.type,
  address: BUSINESS_INFO.address,
  short_address: BUSINESS_INFO.shortAddress,
  whatsapp_display: BUSINESS_INFO.whatsappDisplay,
  whatsapp_digits: BUSINESS_INFO.whatsappDigits,
  currency: BUSINESS_INFO.currency,
  currency_code: 'PHP',
  price_pending_text: BUSINESS_INFO.pricePendingText,
  hero: {
    image: '/src/assets/images/hero_bakery_grill_feast_1795580217636.jpg',
    title: 'Authentic Flavors. Homemade with Love.',
    subtitle:
      'Discover freshly baked delights and delicious homemade meals, prepared with care and served with love.',
  },
  about: {
    heading: 'More Than a Bakery, A Taste of Home',
    body: 'At ANN BAKERY HOUSE, we bring together the warmth of homemade baking and the pleasure of delicious meals. From freshly baked delights to flavorful traditional dishes, every offering is made to bring people together.',
    main_image: '/src/assets/images/hero_ann_bakery_spread_1795577909113.jpg',
    bakery_image: '/src/assets/images/bakery_french_baguettes_1795578367695.jpg',
    meal_image: '/src/assets/images/dish_jollof_chicken_1795577910617.jpg',
  },
  contact: {
    heading: 'Visit Us or Get in Touch',
    intro:
      'We would love to hear from you! Contact ANN BAKERY HOUSE for enquiries and orders, or visit us at our location in Taguig City.',
    map_embed_url:
      'https://www.openstreetmap.org/export/embed.html?bbox=121.0565%2C14.4785%2C121.0630%2C14.4830&layer=mapnik&marker=14.4806477%2C121.0597503',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function mergeSettings(rows: Array<{ key: string; value: unknown }>): SiteSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const base = DEFAULT_SITE_SETTINGS;
  const hero = isRecord(map.get('hero')) ? map.get('hero') as Record<string, unknown> : {};
  const about = isRecord(map.get('about')) ? map.get('about') as Record<string, unknown> : {};
  const contact = isRecord(map.get('contact')) ? map.get('contact') as Record<string, unknown> : {};

  return {
    business_name: pickString(map.get('business_name'), base.business_name),
    tagline: pickString(map.get('tagline'), base.tagline),
    business_type: pickString(map.get('business_type'), base.business_type),
    address: pickString(map.get('address'), base.address),
    short_address: pickString(map.get('short_address'), base.short_address),
    whatsapp_display: pickString(map.get('whatsapp_display'), base.whatsapp_display),
    whatsapp_digits: pickString(map.get('whatsapp_digits'), base.whatsapp_digits),
    currency: pickString(map.get('currency'), base.currency),
    currency_code: pickString(map.get('currency_code'), base.currency_code),
    price_pending_text: pickString(map.get('price_pending_text'), base.price_pending_text),
    hero: {
      image: pickString(hero.image, base.hero.image),
      title: pickString(hero.title, base.hero.title),
      subtitle: pickString(hero.subtitle, base.hero.subtitle),
    },
    about: {
      heading: pickString(about.heading, base.about.heading),
      body: pickString(about.body, base.about.body),
      main_image: pickString(about.main_image, base.about.main_image),
      bakery_image: pickString(about.bakery_image, base.about.bakery_image),
      meal_image: pickString(about.meal_image, base.about.meal_image),
    },
    contact: {
      heading: pickString(contact.heading, base.contact.heading),
      intro: pickString(contact.intro, base.contact.intro),
      map_embed_url: pickString(contact.map_embed_url, base.contact.map_embed_url),
    },
  };
}

export interface PublicContentResult {
  settings: SiteSettings;
  items: MenuItem[];
  categories: string[];
  source: 'supabase' | 'static';
}

/**
 * Bundled image assets keyed by the same `/src/assets/...` paths used by the
 * static defaults and by the seeded rows. Vite resolves these to hashed
 * production URLs at build time, so the references keep working after a
 * production build (where a literal `/src/...` path would 404). Images uploaded
 * from the dashboard are absolute Supabase Storage URLs and pass through.
 */
const BUNDLED_IMAGES = import.meta.glob('/src/assets/images/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Resolves a stored image reference to a URL the browser can load.
 *
 * Legacy `/src/assets/...` references (bundled defaults and seeded rows) are
 * mapped to their hashed production URLs. Administrator-uploaded Supabase
 * Storage URLs (and any other absolute URL) are returned unchanged.
 */
export function resolveImagePath(path: string): string {
  if (!path) return path;
  if (path.startsWith('/src/assets/')) return BUNDLED_IMAGES[path] ?? path;
  return path;
}

/** Rewrites every bundled image reference in a result to its production URL. */
function withResolvedImages(result: PublicContentResult): PublicContentResult {
  return {
    ...result,
    settings: {
      ...result.settings,
      hero: { ...result.settings.hero, image: resolveImagePath(result.settings.hero.image) },
      about: {
        ...result.settings.about,
        main_image: resolveImagePath(result.settings.about.main_image),
        bakery_image: resolveImagePath(result.settings.about.bakery_image),
        meal_image: resolveImagePath(result.settings.about.meal_image),
      },
    },
    items: result.items.map((item) => ({ ...item, image: resolveImagePath(item.image) })),
  };
}

function staticResult(): PublicContentResult {
  return {
    settings: DEFAULT_SITE_SETTINGS,
    items: MENU_ITEMS,
    categories: MENU_CATEGORIES,
    source: 'static',
  };
}

/**
 * The bundled content with its image paths already resolved. Used as the
 * instant first-paint state (and the pre-migration fallback).
 */
export function staticPublicContent(): PublicContentResult {
  return withResolvedImages(staticResult());
}

function toMenuItem(
  product: ProductRow & { product_options: ProductOptionRow[] | null },
  categoryName: string,
): MenuItem {
  const options = [...(product.product_options ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const groupLabel = options[0]?.group_label;
  const optionNames = groupLabel
    ? options.filter((o) => o.group_label === groupLabel).map((o) => o.name)
    : [];

  return {
    id: product.slug,
    name: product.name,
    category: categoryName,
    pricePhp: product.price_php,
    optionLabel: groupLabel,
    options: optionNames.length > 0 ? optionNames : undefined,
    shortDescription: product.short_description ?? '',
    fullDescription: product.full_description ?? product.short_description ?? '',
    image: product.image_path ?? '',
  };
}

export async function loadPublicContent(): Promise<PublicContentResult> {
  if (!supabase) return staticPublicContent();

  try {
    const [settingsRes, categoriesRes, productsRes] = await Promise.all([
      supabase.from('site_settings').select('key,value'),
      supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
      supabase
        .from('products')
        .select('*, product_options(*)')
        .eq('is_available', true)
        .order('display_order'),
    ]);

    // Each dataset is resolved independently. The bundled content is used ONLY
    // when a query itself fails (e.g. the reviewed migrations have not been
    // applied yet). A query that succeeds but returns no rows is honoured as-is,
    // so the owner can hide items without the old menu reappearing, and a
    // product/DB hiccup can never discard correctly-saved website content.
    const settings =
      !settingsRes.error && settingsRes.data
        ? mergeSettings(settingsRes.data as Array<{ key: string; value: unknown }>)
        : DEFAULT_SITE_SETTINGS;

    const categories =
      !categoriesRes.error && categoriesRes.data ? (categoriesRes.data as CategoryRow[]) : null;

    const products =
      !productsRes.error && productsRes.data
        ? (productsRes.data as Array<ProductRow & { product_options: ProductOptionRow[] | null }>)
        : null;

    const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

    const items = products
      ? products.map((product) =>
          toMenuItem(product, categoryNameById.get(product.category_id) ?? 'Menu'),
        )
      : MENU_ITEMS;

    const isLive = !settingsRes.error || categories !== null || products !== null;

    return withResolvedImages({
      settings,
      items,
      categories: categories ? categories.map((c) => c.name) : MENU_CATEGORIES,
      source: isLive ? 'supabase' : 'static',
    });
  } catch {
    return staticPublicContent();
  }
}
