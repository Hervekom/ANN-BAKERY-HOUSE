import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import { listOrders, updateOrderStatus } from '../../lib/adminData';
import { OrderStatus, OrderWithItems } from '../../lib/dbTypes';
import { formatDateTime, formatPhp } from '../../lib/format';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, countsAsSale } from '../../lib/orderStatus';
import { Banner, Button, Card, EmptyState, Modal, SectionTitle, Spinner, TextInput } from '../ui';

/**
 * Orders — administrator order management.
 *
 * Lists every recorded order, lets the administrator search by reference / name /
 * phone, filter by status and date, open an order's immutable item snapshots and
 * move it through its lifecycle. Only orders marked "Completed" count toward the
 * Sales Analytics revenue figures; changing a status here is reflected there as
 * soon as analytics reloads.
 */
export default function OrdersSection({ session }: { session: AdminSessionInfo }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listOrders();
    setMissing(res.missingRelation);
    setError(res.missingRelation ? null : res.error);
    setOrders(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      if (fromMs !== null || toMs !== null) {
        const placedMs = new Date(order.placed_at).getTime();
        if (fromMs !== null && placedMs < fromMs) return false;
        if (toMs !== null && placedMs > toMs) return false;
      }

      if (!term) return true;
      return (
        order.order_number.toLowerCase().includes(term) ||
        (order.customer_name ?? '').toLowerCase().includes(term) ||
        (order.customer_phone ?? '').toLowerCase().includes(term)
      );
    });
  }, [orders, search, statusFilter, dateFrom, dateTo]);

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const counts = useMemo(() => {
    const base: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      completed: 0,
      cancelled: 0,
    };
    let completedRevenue = 0;
    for (const order of orders) {
      base[order.status] += 1;
      if (countsAsSale(order.status) && order.total_php !== null) {
        completedRevenue += order.total_php;
      }
    }
    return { byStatus: base, completedRevenue };
  }, [orders]);

  const changeStatus = async (id: string, status: OrderStatus) => {
    if (updatingId) return;
    setUpdatingId(id);
    setActionError(null);
    const res = await updateOrderStatus(id, status);
    setUpdatingId(null);
    if (res.error || !res.data) {
      setActionError(res.error ?? 'Unable to update the order status.');
      return;
    }
    const updated = res.data;
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, ...updated } : order)),
    );
  };

  const filtersActive =
    search.trim() !== '' || statusFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div>
      <SectionTitle
        title="Orders"
        description={`Signed in as ${session.email}. Every order recorded from the website, with immutable item snapshots.`}
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {missing && (
        <Banner kind="warning" className="mt-5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Order tracking is not enabled yet</p>
              <p className="mt-0.5 leading-relaxed">
                Apply the reviewed migration <code>supabase/migrations/004_orders.sql</code> in the
                Supabase SQL editor to start recording and managing orders. No orders can be shown
                until then.
              </p>
            </div>
          </div>
        </Banner>
      )}

      {error && !missing && (
        <Banner kind="error" className="mt-5">
          {error}
        </Banner>
      )}

      {actionError && (
        <Banner kind="error" className="mt-3">
          {actionError}
        </Banner>
      )}

      {!missing && (
        <>
          {/* Status summary */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryTile label="All orders" value={orders.length} />
            <SummaryTile
              label="Completed"
              value={counts.byStatus.completed}
              tone="green"
              hint={formatPhp(counts.completedRevenue)}
            />
            <SummaryTile label="Confirmed" value={counts.byStatus.confirmed} tone="amber" />
            <SummaryTile label="Preparing" value={counts.byStatus.preparing} tone="amber" />
            <SummaryTile label="Pending" value={counts.byStatus.pending} tone="muted" />
            <SummaryTile label="Cancelled" value={counts.byStatus.cancelled} tone="red" />
          </div>

          {/* Filters */}
          <Card className="mt-5 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5952]"
                  aria-hidden="true"
                />
                <TextInput
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, name or phone"
                  aria-label="Search orders"
                  className="pl-9"
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#111111]">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#AF140B] focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#111111]">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Filter orders from date"
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 text-sm text-[#111111] focus:border-[#AF140B] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#111111]">To</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Filter orders to date"
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 text-sm text-[#111111] focus:border-[#AF140B] focus:outline-none"
                />
              </label>
            </div>

            {filtersActive && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#5C5952]">
                  Showing {filtered.length} of {orders.length} order{orders.length === 1 ? '' : 's'}.
                </p>
                <Button variant="ghost" onClick={resetFilters} className="min-h-[36px] px-3 text-xs">
                  Clear filters
                </Button>
              </div>
            )}
          </Card>

          {loading ? (
            <Spinner label="Loading orders…" />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders recorded yet"
              description="Orders placed through the website will appear here once customers confirm them."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching orders"
              description="No order matches the current search and filters."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9]">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E8DFC8] text-left text-[11px] uppercase tracking-wide text-[#5C5952]">
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 text-right font-semibold">Items</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id} className="border-b border-[#F1EAD8] last:border-0">
                      <td className="tabular-nums px-4 py-3 font-semibold text-[#111111]">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-[#5C5952]">{formatDateTime(order.placed_at)}</td>
                      <td className="px-4 py-3">
                        <span className="block text-[#111111]">{order.customer_name || 'Guest'}</span>
                        {order.customer_phone && (
                          <span className="block text-[11px] text-[#5C5952]">{order.customer_phone}</span>
                        )}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right text-[#111111]">
                        {order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right font-semibold text-[#111111]">
                        {order.total_php === null ? (
                          <span className="text-[11px] font-normal text-[#C97B00]">To confirm</span>
                        ) : (
                          formatPhp(order.total_php)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(next) => void changeStatus(order.id, next)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedId(order.id)}
                          className="min-h-[34px] px-3 text-xs"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <Modal title={`Order ${selected.order_number}`} onClose={() => setSelectedId(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-[#5C5952]">
                Placed {formatDateTime(selected.placed_at)}
              </span>
              {selected.completed_at && (
                <span className="text-xs text-[#3C5826]">
                  Completed {formatDateTime(selected.completed_at)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailBlock label="Customer" value={selected.customer_name || 'Guest'} />
              <DetailBlock label="Phone" value={selected.customer_phone || '—'} />
              <DetailBlock label="Channel" value={selected.channel} />
              <DetailBlock label="Fulfillment" value={selected.fulfillment_method} />
              <DetailBlock
                label="Total"
                value={selected.total_php === null ? 'To be confirmed' : formatPhp(selected.total_php)}
              />
            </div>

            {selected.notes && (
              <DetailBlock label="Notes / instructions" value={selected.notes} />
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5C5952]">
                Item snapshots
              </p>
              {selected.order_items.length === 0 ? (
                <p className="text-sm text-[#5C5952]">No line items were recorded for this order.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E8DFC8]">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E8DFC8] bg-[#FAF6EE] text-left text-[11px] uppercase tracking-wide text-[#5C5952]">
                        <th className="px-3 py-2 font-semibold">Product</th>
                        <th className="px-3 py-2 font-semibold">Variant</th>
                        <th className="px-3 py-2 text-right font-semibold">Unit</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.order_items.map((item) => (
                        <tr key={item.id} className="border-b border-[#F1EAD8] last:border-0">
                          <td className="px-3 py-2">
                            <span className="block font-semibold text-[#111111]">{item.product_name}</span>
                            {item.category_name && (
                              <span className="block text-[11px] text-[#5C5952]">
                                {item.category_name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[#5C5952]">{item.selected_option || '—'}</td>
                          <td className="tabular-nums px-3 py-2 text-right text-[#111111]">
                            {item.unit_price_php === null ? (
                              <span className="text-[11px] text-[#C97B00]">TBC</span>
                            ) : (
                              formatPhp(item.unit_price_php)
                            )}
                          </td>
                          <td className="tabular-nums px-3 py-2 text-right text-[#111111]">
                            {item.quantity}
                          </td>
                          <td className="tabular-nums px-3 py-2 text-right font-semibold text-[#111111]">
                            {item.line_total_php === null ? (
                              <span className="text-[11px] font-normal text-[#C97B00]">TBC</span>
                            ) : (
                              formatPhp(item.line_total_php)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-[#5C5952]">
                These are immutable snapshots captured when the order was placed. Editing a product
                afterwards never changes this order's history.
              </p>
            </div>

            <div className="rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] p-3.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5C5952]">
                Update status
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {ORDER_STATUSES.map((status) => (
                  <Button
                    key={status}
                    variant={selected.status === status ? 'primary' : 'secondary'}
                    disabled={updatingId === selected.id || selected.status === status}
                    onClick={() => void changeStatus(selected.id, status)}
                    className="min-h-[38px] px-3 text-xs"
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#5C5952]">
                Only <strong>Completed</strong> orders count toward Sales Analytics revenue and units.
              </p>
            </div>
          </div>
        </Modal>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] text-[#5C5952]">
        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
        Orders are communicated to customers over WhatsApp; this list is the internal business record.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = 'muted',
  hint,
}: {
  label: string;
  value: number;
  tone?: 'green' | 'amber' | 'muted' | 'red';
  hint?: string;
}) {
  const tones: Record<typeof tone, string> = {
    green: 'text-[#3C5826]',
    amber: 'text-[#C97B00]',
    muted: 'text-[#111111]',
    red: 'text-[#AF140B]',
  };
  return (
    <Card className="p-3.5">
      <p className={`tabular-nums font-display text-2xl font-bold ${tones[tone]}`}>
        {value.toLocaleString('en-PH')}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[#111111]">{label}</p>
      {hint && <p className="tabular-nums mt-0.5 text-[11px] text-[#5C5952]">{hint}</p>}
    </Card>
  );
}

const STATUS_TONES: Record<OrderStatus, string> = {
  completed: 'border-[#3C5826]/40 bg-[#3C5826]/10 text-[#2F461D]',
  confirmed: 'border-[#FD8F00]/40 bg-[#FDD364]/25 text-[#7A4A00]',
  preparing: 'border-[#FD8F00]/40 bg-[#FDD364]/25 text-[#7A4A00]',
  pending: 'border-[#DDD4BE] bg-[#FAF6EE] text-[#5C5952]',
  cancelled: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: OrderStatus;
  disabled: boolean;
  onChange: (next: OrderStatus) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      aria-label="Change order status"
      className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold focus:outline-none disabled:opacity-60 ${STATUS_TONES[value]}`}
    >
      {ORDER_STATUSES.map((status) => (
        <option key={status} value={status}>
          {ORDER_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5C5952]">{label}</p>
      <p className="mt-0.5 text-sm text-[#111111]">{value}</p>
    </div>
  );
}
