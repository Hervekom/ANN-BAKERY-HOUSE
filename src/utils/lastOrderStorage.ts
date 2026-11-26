import { BUSINESS_INFO, buildWhatsAppUrl } from '../data/menu';

export interface SavedWhatsAppOrder {
  message: string;
  url: string;
  itemCount: number;
  savedAt: string;
  /** Customer-facing reference of the recorded order, when it was recorded. */
  orderNumber?: string;
  /** Database id of the recorded order, when available. */
  orderId?: string;
  /** Recorded total in PHP, or null when a line price was still to be confirmed. */
  totalPhp?: number | null;
}

const STORAGE_KEY = 'ann_bakery_last_whatsapp_order_v1';
const OFFICIAL_WHATSAPP_PREFIX = `https://wa.me/${BUSINESS_INFO.whatsappDigits}`;

export function loadLastWhatsAppOrder(): SavedWhatsAppOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedWhatsAppOrder>;
    if (
      typeof parsed.message === 'string' &&
      typeof parsed.url === 'string' &&
      typeof parsed.savedAt === 'string'
    ) {
      const safeUrl =
        parsed.url === OFFICIAL_WHATSAPP_PREFIX ||
        parsed.url.startsWith(`${OFFICIAL_WHATSAPP_PREFIX}?text=`)
          ? parsed.url
          : buildWhatsAppUrl(parsed.message);
      return {
        message: parsed.message,
        url: safeUrl,
        itemCount: typeof parsed.itemCount === 'number' ? parsed.itemCount : 0,
        savedAt: parsed.savedAt,
        orderNumber: typeof parsed.orderNumber === 'string' ? parsed.orderNumber : undefined,
        orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
        totalPhp:
          typeof parsed.totalPhp === 'number'
            ? parsed.totalPhp
            : parsed.totalPhp === null
              ? null
              : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastWhatsAppOrder(
  order: Omit<SavedWhatsAppOrder, 'savedAt'>,
): SavedWhatsAppOrder {
  const record: SavedWhatsAppOrder = {
    ...order,
    savedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Storage may be unavailable in restricted browser modes; keep in-memory copy cleanly.
    }
  }

  return record;
}

export function clearLastWhatsAppOrder(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal errors in restricted browser modes.
  }
}
