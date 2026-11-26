import type { OrderStatus } from './dbTypes';

/**
 * Single source of truth for the order lifecycle.
 *
 * Pending → Confirmed → Preparing → Completed, with Cancelled as the terminal
 * negative state. Only `completed` contributes to recorded sales; the others are
 * work-in-progress (or excluded) and never count toward revenue or units.
 */

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'completed',
  'cancelled',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Whether an order in this state counts toward recorded revenue and units. */
export function countsAsSale(status: OrderStatus): boolean {
  return status === 'completed';
}

/** A short, consistent label for status filters and pills. */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
