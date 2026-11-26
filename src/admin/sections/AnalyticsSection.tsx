import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  CalendarRange,
  Clock,
  Crown,
  Download,
  PackageX,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import { listOrders, listProducts } from '../../lib/adminData';
import { OrderWithItems, ProductWithRelations } from '../../lib/dbTypes';
import { formatPhp } from '../../lib/format';
import {
  GRANULARITIES,
  RANGE_PRESETS,
  computeAnalytics,
  productPerformanceCsv,
  resolveRange,
  toDateInputValue,
  type Granularity,
  type ProductPerformance,
  type RangePreset,
} from '../../lib/analytics';
import { Banner, Button, Card, EmptyState, SectionTitle, Spinner } from '../ui';
import { BarSeriesChart, DonutChart, HorizontalBarList } from '../charts';

/** Compact ₱ figure for chart axes and tooltips (full precision stays in tables). */
function formatPhpShort(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(1)}k`;
  return `₱${value.toFixed(0)}`;
}

function formatCount(value: number): string {
  return value.toLocaleString('en-PH');
}

export default function AnalyticsSection({ session }: { session: AdminSessionInfo }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersMissing, setOrdersMissing] = useState(false);
  const [productsMissing, setProductsMissing] = useState(false);

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(resolveRange('30d').from));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, productsRes] = await Promise.all([listOrders(), listProducts()]);
    setOrdersMissing(ordersRes.missingRelation);
    setProductsMissing(productsRes.missingRelation);
    setError(ordersRes.error ?? productsRes.error ?? null);
    setOrders(ordersRes.data ?? []);
    setProducts(productsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const analytics = useMemo(
    () => computeAnalytics(orders, products, range, granularity),
    [orders, products, range, granularity],
  );

  const exportCsv = () => {
    const csv = productPerformanceCsv(analytics.products, range);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ann-bakery-product-performance_${toDateInputValue(range.from)}_${toDateInputValue(range.to)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const rangeLabel = `${range.from.toLocaleDateString('en-PH', { dateStyle: 'medium' })} – ${range.to.toLocaleDateString('en-PH', { dateStyle: 'medium' })}`;
  const noSalesAtAll = orders.length === 0;
  const noSalesInRange = !noSalesAtAll && analytics.ordersInRange === 0;

  const { kpis } = analytics;

  const revenuePoints = analytics.revenueSeries.map((p) => ({ key: p.key, label: p.label, value: p.revenue }));
  const orderPoints = analytics.ordersSeries.map((p) => ({ key: p.key, label: p.label, value: p.orders }));
  const topByUnits = analytics.products
    .filter((p) => p.unitsSold > 0)
    .slice(0, 8)
    .map((p) => ({ key: p.key, label: p.name, value: p.unitsSold, hint: formatPhp(p.revenue) }));
  const topByRevenue = analytics.products
    .filter((p) => p.revenue > 0)
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map((p) => ({ key: p.key, label: p.name, value: p.revenue, hint: `${formatCount(p.unitsSold)} sold` }));
  const categorySlices = analytics.categories.map((c) => ({
    key: c.category,
    label: c.category,
    value: c.revenue,
  }));

  return (
    <div>
      <SectionTitle
        title="Sales Analytics"
        description={`Signed in as ${session.email}. Performance derived from real recorded orders — ${rangeLabel}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="gold" onClick={exportCsv} disabled={analytics.products.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          </>
        }
      />

      {ordersMissing && (
        <Banner kind="warning" className="mt-5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Order tracking is not enabled yet</p>
              <p className="mt-0.5 leading-relaxed">
                No order data exists in the database, so every figure below is zero. Apply the
                reviewed migration <code>supabase/migrations/004_orders.sql</code> (and record orders)
                to populate this dashboard. Historical sales are never invented.
              </p>
            </div>
          </div>
        </Banner>
      )}

      {!ordersMissing && noSalesAtAll && (
        <Banner kind="info" className="mt-5">
          <span className="inline-flex items-start gap-2">
            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>No sales data yet.</strong> Order tracking is available but no orders have been
              recorded. KPIs and charts will fill in as orders are captured.
            </span>
          </span>
        </Banner>
      )}

      {productsMissing && !ordersMissing && (
        <Banner kind="warning" className="mt-5">
          The product catalog is not available in this project yet, so product-level rows may be
          incomplete.
        </Banner>
      )}

      {error && !ordersMissing && (
        <Banner kind="error" className="mt-5">
          {error}
        </Banner>
      )}

      {/* Filters */}
      <Card className="mt-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((option) => {
              const isActive = preset === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setPreset(option.value)}
                  className={`min-h-[38px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-[#AF140B] bg-[#7E22CE] text-[#FFFDF9]'
                      : 'border-[#DDD4BE] bg-[#FFFDF9] text-[#5C5952] hover:border-[#FD8F00] hover:text-[#111111]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {preset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <CalendarRange className="h-4 w-4 text-[#5C5952]" aria-hidden="true" />
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="Custom range start"
                  className="min-h-[38px] rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-2.5 text-xs text-[#111111] focus:border-[#AF140B] focus:outline-none"
                />
                <span className="text-xs text-[#5C5952]">to</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="Custom range end"
                  className="min-h-[38px] rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-2.5 text-xs text-[#111111] focus:border-[#AF140B] focus:outline-none"
                />
              </div>
            )}

            <div className="inline-flex overflow-hidden rounded-lg border border-[#DDD4BE]">
              {GRANULARITIES.map((option) => {
                const isActive = granularity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setGranularity(option.value)}
                    className={`min-h-[38px] px-3 text-xs font-semibold transition-colors ${
                      isActive ? 'bg-[#111111] text-[#FFFDF9]' : 'bg-[#FFFDF9] text-[#5C5952] hover:text-[#111111]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading analytics…" />
      ) : (
        <>
          {/* KPI cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <KpiCard
              icon={Wallet}
              label="Total Revenue"
              value={formatPhp(kpis.totalRevenue)}
              hint="Completed orders only"
            />
            <KpiCard
              icon={ShoppingBag}
              label="Total Orders"
              value={formatCount(kpis.totalOrders)}
              hint={`${formatCount(kpis.completedOrders)} completed`}
            />
            <KpiCard
              icon={TrendingUp}
              label="Average Order Value"
              value={formatPhp(kpis.averageOrderValue)}
              hint="Revenue ÷ completed orders"
            />
            <KpiCard
              icon={PackageX}
              label="Units Sold"
              value={formatCount(kpis.unitsSold)}
              hint="Completed orders only"
            />
            <KpiCard
              icon={Crown}
              label="Best-Selling Product"
              value={kpis.bestSeller ? kpis.bestSeller.name : '—'}
              hint={
                kpis.bestSeller
                  ? `${formatCount(kpis.bestSeller.unitsSold)} units · ${formatPhp(kpis.bestSeller.revenue)}`
                  : 'No sales in range'
              }
              compact
            />
            <KpiCard
              icon={ArrowDownRight}
              label="Lowest-Selling Product"
              value={kpis.lowestSeller ? kpis.lowestSeller.name : '—'}
              hint={
                kpis.lowestSeller
                  ? `${formatCount(kpis.lowestSeller.unitsSold)} units · ${formatPhp(kpis.lowestSeller.revenue)}`
                  : 'No sales in range'
              }
              compact
            />
          </div>

          {kpis.zeroSalesCount > 0 && (
            <p className="mt-2 text-xs text-[#5C5952]">
              {kpis.zeroSalesCount} product{kpis.zeroSalesCount === 1 ? '' : 's'} recorded zero sales in
              this period (listed separately from unavailable products below).
            </p>
          )}

          {noSalesInRange && (
            <EmptyState
              title="No orders in this period"
              description="The selected date range contains no recorded orders. Try widening the range."
            />
          )}

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Revenue over time" subtitle={`${granularity} · completed orders`}>
              <BarSeriesChart
                points={revenuePoints}
                formatValue={formatPhpShort}
                color="#AF140B"
                height={220}
              />
            </ChartCard>
            <ChartCard title="Orders over time" subtitle={`${granularity} · all statuses`}>
              <BarSeriesChart
                points={orderPoints}
                formatValue={formatCount}
                color="#FD8F00"
                height={220}
              />
            </ChartCard>
            <ChartCard title="Sales volume by product" subtitle="Top 8 by units sold">
              <HorizontalBarList
                rows={topByUnits}
                formatValue={(v) => `${formatCount(v)} units`}
                color="#3C5826"
              />
            </ChartCard>
            <ChartCard title="Revenue by product" subtitle="Top 8 by revenue">
              <HorizontalBarList rows={topByRevenue} formatValue={formatPhp} color="#AF140B" />
            </ChartCard>
            <ChartCard title="Sales by category" subtitle="Revenue share · completed orders">
              <DonutChart slices={categorySlices} formatValue={formatPhp} />
            </ChartCard>
            <ChartCard title="Orders by status" subtitle="Selected period">
              <ul className="space-y-2.5">
                <StatusRow
                  icon={ShoppingBag}
                  label="Completed"
                  value={analytics.statusCounts.completed}
                  tone="green"
                  hint="Counted in revenue"
                />
                <StatusRow
                  icon={Clock}
                  label="Confirmed"
                  value={analytics.statusCounts.confirmed}
                  tone="amber"
                  hint="Not counted yet"
                />
                <StatusRow
                  icon={Clock}
                  label="Preparing"
                  value={analytics.statusCounts.preparing}
                  tone="amber"
                  hint="Not counted yet"
                />
                <StatusRow
                  icon={Clock}
                  label="Pending"
                  value={analytics.statusCounts.pending}
                  tone="muted"
                  hint="Not counted yet"
                />
                <StatusRow
                  icon={XCircle}
                  label="Cancelled"
                  value={analytics.statusCounts.cancelled}
                  tone="red"
                  hint="Excluded from revenue"
                />
              </ul>
            </ChartCard>
          </div>

          {/* Product performance */}
          <Card className="mt-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-[#111111]">Product performance</h3>
                <p className="mt-0.5 text-xs text-[#5C5952]">
                  Ranked by units sold. Zero-sales and unavailable products are flagged separately.
                </p>
              </div>
              <Button variant="secondary" onClick={exportCsv} disabled={analytics.products.length === 0}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </Button>
            </div>

            {analytics.products.length === 0 ? (
              <EmptyState
                title="No products to analyse"
                description="Add products in the Products section to see performance here."
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DFC8] text-left text-[11px] uppercase tracking-wide text-[#5C5952]">
                      <th className="py-2 pr-3 font-semibold">Rank</th>
                      <th className="py-2 pr-3 font-semibold">Product</th>
                      <th className="py-2 pr-3 font-semibold">Category</th>
                      <th className="py-2 pr-3 text-right font-semibold">Units</th>
                      <th className="py-2 pr-3 text-right font-semibold">Revenue</th>
                      <th className="py-2 pr-3 text-right font-semibold">% of sales</th>
                      <th className="py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.products.map((product) => (
                      <ProductRow key={product.key} product={product} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Orders & revenue details */}
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h3 className="font-display text-xl font-bold text-[#111111]">Revenue details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <DetailRow label="Revenue (completed orders)" value={formatPhp(kpis.totalRevenue)} strong />
                <DetailRow label="Completed orders" value={formatCount(kpis.completedOrders)} />
                <DetailRow label="Pending orders" value={formatCount(analytics.statusCounts.pending)} />
                <DetailRow label="Confirmed orders" value={formatCount(analytics.statusCounts.confirmed)} />
                <DetailRow label="Preparing orders" value={formatCount(analytics.statusCounts.preparing)} />
                <DetailRow label="Cancelled orders" value={formatCount(analytics.statusCounts.cancelled)} />
                <DetailRow label="Units sold (completed)" value={formatCount(kpis.unitsSold)} />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[#5C5952]">
                Cancelled and pending orders are excluded from revenue and units. Orders whose price
                is still "to be confirmed" contribute ₱0.00 revenue until priced.
              </p>
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="font-display text-xl font-bold text-[#111111]">Recent orders</h3>
              {analytics.recentOrders.length === 0 ? (
                <p className="mt-3 text-sm text-[#5C5952]">No orders in this period.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#EFE7D4]">
                  {analytics.recentOrders.map((order) => (
                    <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">
                          {order.order_number}
                        </p>
                        <p className="truncate text-[11px] text-[#5C5952]">
                          {order.customer_name || 'Guest'} ·{' '}
                          {new Date(order.placed_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums text-sm font-bold text-[#111111]">
                          {order.total_php === null ? '₱—' : formatPhp(order.total_php)}
                        </p>
                        <StatusPill status={order.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Daily summary */}
          <Card className="mt-6 p-4 sm:p-5">
            <h3 className="font-display text-xl font-bold text-[#111111]">Daily sales summary</h3>
            {analytics.dailySummary.length === 0 ? (
              <p className="mt-3 text-sm text-[#5C5952]">No sales recorded in this period.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E8DFC8] text-left text-[11px] uppercase tracking-wide text-[#5C5952]">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 pr-3 text-right font-semibold">Orders</th>
                      <th className="py-2 pr-3 text-right font-semibold">Completed</th>
                      <th className="py-2 pr-3 text-right font-semibold">Units</th>
                      <th className="py-2 text-right font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dailySummary.map((day) => (
                      <tr key={day.date} className="border-b border-[#F1EAD8] last:border-0">
                        <td className="py-2 pr-3 text-[#111111]">{day.label}</td>
                        <td className="tabular-nums py-2 pr-3 text-right text-[#111111]">{day.orders}</td>
                        <td className="tabular-nums py-2 pr-3 text-right text-[#111111]">
                          {day.completedOrders}
                        </td>
                        <td className="tabular-nums py-2 pr-3 text-right text-[#111111]">{day.units}</td>
                        <td className="tabular-nums py-2 text-right font-semibold text-[#111111]">
                          {formatPhp(day.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  compact = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#AF140B]/10 text-[#AF140B]">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <p
        className={`font-display mt-3 font-bold text-[#111111] ${compact ? 'text-lg leading-snug' : 'tabular-nums text-2xl sm:text-3xl'}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[#111111]">{label}</p>
      <p className="mt-0.5 text-xs text-[#5C5952]">{hint}</p>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold text-[#111111]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs capitalize text-[#5C5952]">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function ProductRow({ product }: { product: ProductPerformance }) {
  return (
    <tr className="border-b border-[#F1EAD8] last:border-0 align-top">
      <td className="tabular-nums py-2.5 pr-3 text-[#5C5952]">{product.rank ?? '—'}</td>
      <td className="py-2.5 pr-3">
        <span className="font-semibold text-[#111111]">{product.name}</span>
        {product.missingPrice && product.unitsSold > 0 && (
          <span className="ml-2 text-[10px] font-semibold text-[#C97B00]">price TBC</span>
        )}
      </td>
      <td className="py-2.5 pr-3 text-[#5C5952]">{product.category}</td>
      <td className="tabular-nums py-2.5 pr-3 text-right text-[#111111]">{formatCount(product.unitsSold)}</td>
      <td className="tabular-nums py-2.5 pr-3 text-right font-semibold text-[#111111]">
        {formatPhp(product.revenue)}
      </td>
      <td className="tabular-nums py-2.5 pr-3 text-right text-[#5C5952]">
        {(product.percentUnits).toFixed(1)}%
      </td>
      <td className="py-2.5">
        <div className="flex flex-wrap gap-1">
          {product.bestSeller && <Badge tone="gold" icon={Crown}>Best seller</Badge>}
          {product.lowestSeller && !product.bestSeller && (
            <Badge tone="muted" icon={ArrowDownRight}>Lowest seller</Badge>
          )}
          {product.zeroSales && <Badge tone="muted">Zero sales</Badge>}
          {product.unavailable && <Badge tone="red">Unavailable now</Badge>}
          {product.available === null && <Badge tone="muted">Removed</Badge>}
        </div>
      </td>
    </tr>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
  hint: string;
  tone: 'green' | 'amber' | 'muted' | 'red';
}) {
  const tones: Record<typeof tone, string> = {
    green: 'text-[#3C5826]',
    amber: 'text-[#C97B00]',
    muted: 'text-[#5C5952]',
    red: 'text-[#AF140B]',
  };
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-[#E8DFC8] bg-[#FAF6EE] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
        <Icon className={`h-4 w-4 ${tones[tone]}`} aria-hidden="true" />
        {label}
      </span>
      <span className="text-right">
        <span className="tabular-nums block text-sm font-bold text-[#111111]">{formatCount(value)}</span>
        <span className="block text-[10px] text-[#5C5952]">{hint}</span>
      </span>
    </li>
  );
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#F1EAD8] pb-2 last:border-0">
      <dt className="text-[#5C5952]">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-base font-bold text-[#111111]' : 'text-[#111111]'}`}>
        {value}
      </dd>
    </div>
  );
}

function Badge({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'gold' | 'muted' | 'red';
  icon?: typeof Crown;
  children: React.ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    gold: 'border-[#FD8F00]/40 bg-[#FDD364]/30 text-[#7A4A00]',
    muted: 'border-[#DDD4BE] bg-[#FAF6EE] text-[#5C5952]',
    red: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: OrderWithItems['status'] }) {
  const map: Record<OrderWithItems['status'], { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'text-[#3C5826]' },
    confirmed: { label: 'Confirmed', className: 'text-[#C97B00]' },
    preparing: { label: 'Preparing', className: 'text-[#C97B00]' },
    pending: { label: 'Pending', className: 'text-[#5C5952]' },
    cancelled: { label: 'Cancelled', className: 'text-[#AF140B]' },
  };
  const entry = map[status];
  return <span className={`text-[10px] font-semibold uppercase tracking-wide ${entry.className}`}>{entry.label}</span>;
}
