import { newIdempotencyKey } from '../lib/orders';

/**
 * Checkout-session helper.
 *
 * The idempotency key identifies ONE checkout attempt. It is persisted per cart
 * signature so that a repeated click or a page refresh reuses the same key — the
 * database function then returns the already-recorded order instead of creating a
 * duplicate. Editing the cart changes the signature, which starts a fresh attempt.
 */

interface CheckoutSession {
  signature: string;
  key: string;
}

const STORAGE_KEY = 'ann_bakery_checkout_session_v1';

/** Stable fingerprint of the current cart contents (keys + quantities). */
export function cartSignature(parts: Array<{ key: string; quantity: number }>): string {
  const ordered = [...parts]
    .map((part) => `${part.key}x${part.quantity}`)
    .sort()
    .join('|');
  return ordered || 'empty';
}

function readSession(): CheckoutSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutSession>;
    if (typeof parsed.signature === 'string' && typeof parsed.key === 'string' && parsed.key) {
      return { signature: parsed.signature, key: parsed.key };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSession(session: CheckoutSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Restricted browser modes may block storage; the in-memory key still works
    // for the current session.
  }
}

/**
 * Returns the idempotency key for the given cart signature, creating and
 * persisting a new one when the cart changed (or none exists yet).
 */
export function getCheckoutKey(signature: string): string {
  const existing = readSession();
  if (existing && existing.signature === signature) return existing.key;

  const key = newIdempotencyKey();
  writeSession({ signature, key });
  return key;
}

/** Clears the persisted attempt (e.g. after the cart is emptied). */
export function clearCheckoutSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
