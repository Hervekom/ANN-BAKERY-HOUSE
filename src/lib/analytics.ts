import {
  OrderItemRow,
  OrderStatus,
  OrderWithItems,
  ProductWithRelations,
} from './dbTypes';

/**
 * Pure sales-analytics computations.
 *
 * Everything here derives from REAL recorded orders only. No value is estimated
 * or invented: an unknown price (`unit_price_php = null`) contributes 0 revenue
 * rather than a guessed number.
 *
 * Business rules (single source of truth):
 *   * Revenue      = sum of line totals from orders whose status = 'completed'.
 *   * Units sold   = sum of quantities from orders whose status = 'completed'.
 *   * Average order value = completed revenue / completed order count.
 *   * Best seller  = highest quantity sold among products with sales.
 *   * Lowest seller= lowest quantity sold among products with sales (> 0).
 *   * Zero-sales products are reported SEPARATELY and never conflated with
 *     unavailable/inactive products.
 *   * Pending / confirmed / cancelled orders never count toward revenue or units.
 */

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom';
export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  from: Date;
  to: Date;
}

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

export const GRANULARITIES: Array<{ value: Granularity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parses a `YYYY-MM-DD` form value as a LOCAL date (avoids the UTC off-by-one). */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Resolves a range preset (plus optional custom bounds) to concrete boundaries. */
export function resolveRange(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
  now: Date = new Date(),
): DateRange {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d':
      return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(addDays(now, -29)), to: endOfDay(now) };
    case '90d':
      return { from: startOfDay(addDays(now, -89)), to: endOfDay(now) };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case 'custom': {
      const from = (customFrom && parseDateInput(customFrom)) || startOfDay(now);
      const to = (customTo && parseDateInput(customTo)) || endOfDay(now);
      return from <= to
        ? { from: startOfDay(from), to: endOfDay(to) }
        : { from: startOfDay(to), to: endOfDay(from) };
    }
  }
}

/** `YYYY-MM-DD` string for an `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Order helpers
// ---------------------------------------------------------------------------

function orderPlacedAt(order: OrderWithItems): Date {
  return new Date(order.placed_at || order.created_at);
}

function inRange(order: OrderWithItems, range: DateRange): boolean {
  const placed = orderPlacedAt(order).getTime();
  return placed >= range.from.getTime() && placed <= range.to.getTime();
}

function isCompleted(order: OrderWithItems): boolean {
  return order.status === 'completed';
}

/** Line revenue: uses the stored line total, else price × quantity. Never guesses. */
function lineRevenue(item: OrderItemRow): number {
  if (typeof item.line_total_php === 'number') return item.line_total_php;
  if (typeof item.unit_price_php === 'number') return item.unit_price_php * item.quantity;
  return 0;
}

/** Sum of a completed order's line revenue. */
export function completedOrderRevenue(order: OrderWithItems): number {
  return (order.order_items ?? []).reduce((sum, item) => sum + lineRevenue(item), 0);
}

// ---------------------------------------------------------------------------
// Public result shapes
// ---------------------------------------------------------------------------

export interface TimePoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  key: string;
  productId: string | null;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  percentUnits: number;
  percentRevenue: number;
  rank: number | null;
  bestSeller: boolean;
  lowestSeller: boolean;
  zeroSales: boolean;
  /** Current catalog availability. `null` = product is not in the catalog (e.g. deleted). */
  available: boolean | null;
  /** True when the product is currently unavailable in the catalog. */
  unavailable: boolean;
  /** True when the product has sales but no known price (revenue understated). */
  missingPrice: boolean;
}

export interface CategorySale {
  category: string;
  units: number;
  revenue: number;
}

export interface DailySummary {
  date: string;
  label: string;
  orders: number;
  completedOrders: number;
  revenue: number;
  units: number;
}

export interface Kpis {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  confirmedOrders: number;
  preparingOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  unitsSold: number;
  bestSeller: ProductPerformance | null;
  lowestSeller: ProductPerformance | null;
  zeroSalesCount: number;
}

export interface AnalyticsResult {
  range: DateRange;
  kpis: Kpis;
  statusCounts: Record<OrderStatus, number>;
  revenueSeries: TimePoint[];
  ordersSeries: TimePoint[];
  products: ProductPerformance[];
  categories: CategorySale[];
  dailySummary: DailySummary[];
  recentOrders: OrderWithItems[];
  /** Orders within the selected range (any status). */
  ordersInRange: number;
}

// ---------------------------------------------------------------------------
// Time bucketing
// ---------------------------------------------------------------------------

function bucketOf(date: Date, granularity: Granularity): { key: string; label: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  if (granularity === 'daily') {
    return {
      key: `${y}-${pad(m + 1)}-${pad(d)}`,
      label: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    };
  }
  if (granularity === 'monthly') {
    return {
      key: `${y}-${pad(m + 1)}`,
      label: date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
    };
  }
  // Weekly — Monday-start.
  const day = date.getDay();
  const monday = addDays(date, day === 0 ? -6 : 1 - day);
  return {
    key: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
    label: monday.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
  };
}

function enumerateBuckets(from: Date, to: Date, granularity: Granularity): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  const seen = new Set<string>();

  let cursor = startOfDay(new Date(from));
  if (granularity === 'weekly') {
    const day = cursor.getDay();
    cursor = addDays(cursor, day === 0 ? -6 : 1 - day);
  } else if (granularity === 'monthly') {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  }

  // Guard against pathological ranges (e.g. a multi-year custom range) blowing up
  // the bucket count for a daily view.
  let guard = 0;
  while (cursor.getTime() <= to.getTime() && guard < 1200) {
    const bucket = bucketOf(cursor, granularity);
    if (!seen.has(bucket.key)) {
      seen.add(bucket.key);
      out.push(bucket);
    }
    cursor =
      granularity === 'daily'
        ? addDays(cursor, 1)
        : granularity === 'weekly'
          ? addDays(cursor, 7)
          : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    guard += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

export function computeAnalytics(
  orders: OrderWithItems[],
  products: ProductWithRelations[],
  range: DateRange,
  granularity: Granularity,
): AnalyticsResult {
  const scoped = orders.filter((order) => inRange(order, range));
  const completed = scoped.filter(isCompleted);

  // --- Status counts -------------------------------------------------------
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const order of scoped) statusCounts[order.status] += 1;

  // --- Product performance -------------------------------------------------
  const perfByKey = new Map<string, ProductPerformance>();

  const catalogKey = (productId: string) => `p:${productId}`;
  for (const product of products) {
    const key = catalogKey(product.id);
    perfByKey.set(key, {
      key,
      productId: product.id,
      name: product.name,
      category: product.categories?.name ?? 'Uncategorised',
      unitsSold: 0,
      revenue: 0,
      orderCount: 0,
      percentUnits: 0,
      percentRevenue: 0,
      rank: null,
      bestSeller: false,
      lowestSeller: false,
      zeroSales: true,
      available: product.is_available,
      unavailable: product.is_available === false,
      missingPrice: false,
    });
  }

  let totalRevenue = 0;
  let totalUnits = 0;

  for (const order of completed) {
    for (const item of order.order_items ?? []) {
      const key = item.product_id ? catalogKey(item.product_id) : `n:${item.product_name}`;
      let perf = perfByKey.get(key);
      if (!perf) {
        // Product no longer in the catalog (deleted) — keep history by name only.
        perf = {
          key,
          productId: item.product_id,
          name: item.product_name,
          category: item.category_name ?? 'Uncategorised',
          unitsSold: 0,
          revenue: 0,
          orderCount: 0,
          percentUnits: 0,
          percentRevenue: 0,
          rank: null,
          bestSeller: false,
          lowestSeller: false,
          zeroSales: true,
          available: null,
          unavailable: false,
          missingPrice: false,
        };
        perfByKey.set(key, perf);
      }
      const revenue = lineRevenue(item);
      perf.unitsSold += item.quantity;
      perf.revenue += revenue;
      perf.orderCount += 1;
      if (typeof item.unit_price_php !== 'number' && typeof item.line_total_php !== 'number') {
        perf.missingPrice = true;
      }
      totalRevenue += revenue;
      totalUnits += item.quantity;
    }
  }

  const productList = [...perfByKey.values()].map((perf) => ({
    ...perf,
    zeroSales: perf.unitsSold === 0,
    percentUnits: totalUnits > 0 ? (perf.unitsSold / totalUnits) * 100 : 0,
    percentRevenue: totalRevenue > 0 ? (perf.revenue / totalRevenue) * 100 : 0,
  }));

  const withSales = productList
    .filter((perf) => perf.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue || a.name.localeCompare(b.name));

  withSales.forEach((perf, index) => {
    perf.rank = index + 1;
    perf.bestSeller = index === 0;
    perf.lowestSeller = index === withSales.length - 1;
  });

  const bestSeller = withSales[0] ?? null;
  const lowestSeller = withSales.length > 0 ? withSales[withSales.length - 1] : null;

  // Display order: ranked sellers first, then zero-sales (alphabetical).
  const productsSorted = [
    ...withSales,
    ...productList
      .filter((perf) => perf.unitsSold === 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  // --- Category aggregation ------------------------------------------------
  const categoryMap = new Map<string, CategorySale>();
  for (const order of completed) {
    for (const item of order.order_items ?? []) {
      const name = item.category_name ?? 'Uncategorised';
      const entry = categoryMap.get(name) ?? { category: name, units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += lineRevenue(item);
      categoryMap.set(name, entry);
    }
  }
  const categories = [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units);

  // --- Time series ---------------------------------------------------------
  const buckets = enumerateBuckets(range.from, range.to, granularity);
  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, { ...bucket, revenue: 0, orders: 0 }]));
  for (const order of scoped) {
    const bucket = seriesMap.get(bucketOf(orderPlacedAt(order), granularity).key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (isCompleted(order)) bucket.revenue += completedOrderRevenue(order);
  }
  const series = [...seriesMap.values()];
  const revenueSeries: TimePoint[] = series.map((s) => ({ key: s.key, label: s.label, revenue: s.revenue, orders: s.orders }));
  const ordersSeries: TimePoint[] = series.map((s) => ({ key: s.key, label: s.label, revenue: s.revenue, orders: s.orders }));

  // --- Daily summary -------------------------------------------------------
  const dayMap = new Map<string, DailySummary>();
  for (const order of scoped) {
    const placed = orderPlacedAt(order);
    const key = `${placed.getFullYear()}-${pad(placed.getMonth() + 1)}-${pad(placed.getDate())}`;
    const entry =
      dayMap.get(key) ??
      {
        date: key,
        label: placed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        orders: 0,
        completedOrders: 0,
        revenue: 0,
        units: 0,
      };
    entry.orders += 1;
    if (isCompleted(order)) {
      entry.completedOrders += 1;
      entry.revenue += completedOrderRevenue(order);
      entry.units += (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    }
    dayMap.set(key, entry);
  }
  const dailySummary = [...dayMap.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

  const completedCount = statusCounts.completed;

  return {
    range,
    kpis: {
      totalRevenue,
      totalOrders: scoped.length,
      completedOrders: completedCount,
      confirmedOrders: statusCounts.confirmed,
      preparingOrders: statusCounts.preparing,
      pendingOrders: statusCounts.pending,
      cancelledOrders: statusCounts.cancelled,
      averageOrderValue: completedCount > 0 ? totalRevenue / completedCount : 0,
      unitsSold: totalUnits,
      bestSeller,
      lowestSeller,
      zeroSalesCount: productList.filter((perf) => perf.unitsSold === 0).length,
    },
    statusCounts,
    revenueSeries,
    ordersSeries,
    products: productsSorted,
    categories,
    dailySummary,
    recentOrders: [...scoped].sort((a, b) => b.placed_at.localeCompare(a.placed_at)).slice(0, 10),
    ordersInRange: scoped.length,
  };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds the CSV for the product performance table (₱ amounts, ranked rows). */
export function productPerformanceCsv(products: ProductPerformance[], range: DateRange): string {
  const header = [
    'Rank',
    'Product',
    'Category',
    'Units sold',
    'Revenue (PHP)',
    '% of units',
    '% of revenue',
    'Sold in period',
    'Currently available',
  ];
  const lines = [header.join(',')];
  for (const perf of products) {
    lines.push(
      [
        csvCell(perf.rank ?? ''),
        csvCell(perf.name),
        csvCell(perf.category),
        csvCell(perf.unitsSold),
        csvCell(perf.revenue.toFixed(2)),
        csvCell(perf.percentUnits.toFixed(2)),
        csvCell(perf.percentRevenue.toFixed(2)),
        csvCell(perf.zeroSales ? 'zero sales' : 'yes'),
        csvCell(perf.available === null ? 'unknown' : perf.available ? 'yes' : 'no'),
      ].join(','),
    );
  }
  lines.push('');
  lines.push(
    `# Range,${csvCell(toDateInputValue(range.from))} to ${csvCell(toDateInputValue(range.to))}`,
  );
  return lines.join('\n');
}
