import { supabase } from './supabase';
import { errorMessage, isMissingRelation } from './dbTypes';

/**
 * Public checkout layer.
 *
 * Customers never touch `orders` / `order_items` directly — those tables are
 * administrator-only under Row Level Security. This module calls the trusted
 * `public.place_order(jsonb)` database function, which reads the real product
 * availability and price server-side (so a browser-submitted price can never be
 * trusted) and records the order idempotently.
 *
 * No secret key is used here: the request runs under the public (anon) key and
 * the customer's session, exactly like the rest of the storefront.
 */

export interface CheckoutLine {
  productSlug: string;
  quantity: number;
  selectedOption?: string;
}

export interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  notes?: string;
  lines: CheckoutLine[];
  idempotencyKey: string;
}

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalPhp: number | null;
  placedAt: string;
  /** True when this attempt matched an order already recorded with the same key. */
  duplicate: boolean;
}

export interface PlaceOrderResult {
  data: PlacedOrder | null;
  error: string | null;
  /** True when order recording is not enabled yet (migration not applied). */
  missingRelation: boolean;
}

/** Result of a checkout attempt, as surfaced to the checkout UI. */
export type SubmitOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; error: string; notEnabled: boolean };

/** A retry key that survives refreshes so the same attempt never double-records. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function toPlacedOrder(raw: unknown): PlacedOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const orderNumber = typeof r.order_number === 'string' ? r.order_number : null;
  if (!id || !orderNumber) return null;

  const rawTotal = r.total_php;
  const totalPhp =
    typeof rawTotal === 'number'
      ? rawTotal
      : typeof rawTotal === 'string' && rawTotal.trim() !== ''
        ? Number(rawTotal)
        : null;

  return {
    id,
    orderNumber,
    status: typeof r.status === 'string' ? r.status : 'pending',
    totalPhp: totalPhp !== null && Number.isFinite(totalPhp) ? totalPhp : null,
    placedAt: typeof r.placed_at === 'string' ? r.placed_at : new Date().toISOString(),
    duplicate: r.duplicate === true,
  };
}

/**
 * Records a structured order through the trusted database function.
 *
 * The returned order carries the customer-facing reference. When recording is not
 * enabled yet (`missingRelation`) or fails, `data` is null and `error` explains
 * why — the caller must NOT claim the order was recorded in that case.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!supabase) {
    return {
      data: null,
      error: 'Online ordering is temporarily unavailable. Please send your order on WhatsApp.',
      missingRelation: false,
    };
  }

  const items = input.lines
    .filter((line) => line.productSlug.trim() !== '' && line.quantity > 0)
    .map((line) => ({
      product_slug: line.productSlug.trim(),
      quantity: Math.floor(line.quantity),
      selected_option: line.selectedOption ?? null,
    }));

  if (items.length === 0) {
    return { data: null, error: 'Your cart is empty.', missingRelation: false };
  }

  try {
    const { data, error } = await supabase.rpc('place_order', {
      payload: {
        customer_name: input.customerName.trim(),
        customer_phone: input.customerPhone.trim(),
        fulfillment_method: input.fulfillmentMethod,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        idempotency_key: input.idempotencyKey,
        items,
      },
    });

    if (error) {
      return {
        data: null,
        error: errorMessage(error, 'We could not record your order.'),
        missingRelation: isMissingRelation(error),
      };
    }

    const placed = toPlacedOrder(data);
    if (!placed) {
      return {
        data: null,
        error: 'The order was not confirmed by the server. Please try again.',
        missingRelation: false,
      };
    }

    return { data: placed, error: null, missingRelation: false };
  } catch (e) {
    return {
      data: null,
      error: errorMessage(e, 'We could not record your order.'),
      missingRelation: isMissingRelation(e),
    };
  }
}
