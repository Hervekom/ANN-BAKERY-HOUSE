import { MenuItem, MenuItemOption } from '../data/menu';

/**
 * Cart persistence helper.
 *
 * The cart is stored in the visitor's browser (localStorage) so a page refresh
 * or a returning visitor never loses the selected dishes — no account required.
 *
 * A sanitized snapshot of each item is persisted so the cart can be restored
 * even before (or without) the live menu loading — including products that only
 * exist in the dashboard and are not part of the bundled static menu. The cart
 * is then re-resolved against the live menu (see App.tsx) so a restored line
 * always reflects the current name, image and price rather than a stale copy.
 */

export interface SavedCartEntry {
  item: MenuItem;
  selectedOption?: string;
  quantity: number;
}

const STORAGE_KEY = 'ann_bakery_cart_v1';

function sanitizePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sanitizeOption(value: unknown): MenuItemOption | null {
  if (!value || typeof value !== 'object') return null;
  const option = value as Partial<MenuItemOption>;
  if (typeof option.name !== 'string' || !option.name) return null;
  return { name: option.name, pricePhp: sanitizePrice(option.pricePhp) };
}

function sanitizeItem(value: unknown): MenuItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<MenuItem>;
  if (typeof item.id !== 'string' || !item.id) return null;
  if (typeof item.name !== 'string' || !item.name) return null;

  const options = Array.isArray(item.options)
    ? item.options.map(sanitizeOption).filter((o): o is MenuItemOption => o !== null)
    : [];

  const shortDescription = typeof item.shortDescription === 'string' ? item.shortDescription : '';

  return {
    id: item.id,
    name: item.name,
    category: typeof item.category === 'string' && item.category ? item.category : 'Menu',
    pricePhp: sanitizePrice(item.pricePhp),
    options: options.length > 0 ? options : undefined,
    optionLabel: typeof item.optionLabel === 'string' ? item.optionLabel : undefined,
    shortDescription,
    fullDescription:
      typeof item.fullDescription === 'string' ? item.fullDescription : shortDescription,
    image: typeof item.image === 'string' ? item.image : '',
  };
}

export function loadSavedCart(): SavedCartEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const entries: SavedCartEntry[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Partial<SavedCartEntry>;
      const item = sanitizeItem(entry.item);
      if (!item) continue;
      if (
        typeof entry.quantity !== 'number' ||
        !Number.isFinite(entry.quantity) ||
        entry.quantity <= 0
      ) {
        continue;
      }
      entries.push({
        item,
        selectedOption:
          typeof entry.selectedOption === 'string' && entry.selectedOption
            ? entry.selectedOption
            : undefined,
        quantity: Math.floor(entry.quantity),
      });
    }
    return entries;
  } catch {
    return [];
  }
}

export function saveCart(entries: SavedCartEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Restricted browser modes may block storage; the in-memory cart still works.
  }
}
