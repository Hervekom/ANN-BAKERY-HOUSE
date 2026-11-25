/** Small formatting helpers used by the admin dashboard. */

/** Converts a display name into a URL-safe slug matching the DB slug check. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Formats a PHP amount; returns the pending label when the price is null. */
export function formatPhp(amount: number | null, currency = '₱', pendingText = 'Price to be confirmed'): string {
  if (amount === null || Number.isNaN(amount)) return pendingText;
  return `${currency}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
