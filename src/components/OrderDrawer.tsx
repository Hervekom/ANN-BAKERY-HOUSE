import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  Info,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { BUSINESS_INFO, MenuItem, buildWhatsAppUrl } from '../data/menu';
import { SavedWhatsAppOrder } from '../utils/lastOrderStorage';
import PriceLabel from './PriceLabel';

export interface BagEntry {
  key: string;
  item: MenuItem;
  selectedOption?: string;
  quantity: number;
}

type ArrangementOption = '' | 'Pickup' | 'Delivery';

interface OrderDrawerProps {
  open: boolean;
  entries: BagEntry[];
  lastSavedOrder: SavedWhatsAppOrder | null;
  onClose: () => void;
  onIncrement: (item: MenuItem, selectedOption?: string) => void;
  onDecrement: (itemId: string, selectedOption?: string) => void;
  onRemove: (itemId: string, selectedOption?: string) => void;
  onClear: () => void;
  onRecordOrder: (message: string, url: string, itemCount: number) => void;
  onClearSavedOrder: () => void;
  whatsappDigits?: string;
}

function formatSavedTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function OrderDrawer({
  open,
  entries,
  lastSavedOrder,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onRecordOrder,
  onClearSavedOrder,
  whatsappDigits,
}: OrderDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [arrangement, setArrangement] = useState<ArrangementOption>('');
  const [instructions, setInstructions] = useState('');
  const [whatsappAttempted, setWhatsappAttempted] = useState(false);
  const [savedExpanded, setSavedExpanded] = useState(false);
  const [copiedSaved, setCopiedSaved] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);

  const messageLines: string[] = [
    `Hello ${BUSINESS_INFO.name}!`,
    '',
    'I would like to place an order.',
  ];

  if (customerName.trim()) {
    messageLines.push('', `Customer name: ${customerName.trim()}`);
  }
  if (customerPhone.trim()) {
    messageLines.push(`Phone number: ${customerPhone.trim()}`);
  }

  messageLines.push('', 'Order details:');
  entries.forEach((entry) => {
    const variantPart = entry.selectedOption ? ` (${entry.selectedOption})` : '';
    messageLines.push(`- ${entry.quantity} x ${entry.item.name}${variantPart}`);
  });

  if (instructions.trim()) {
    messageLines.push('', `Special instructions: ${instructions.trim()}`);
  }

  if (arrangement) {
    const arrangementText =
      arrangement === 'Pickup'
        ? `Pickup at ${BUSINESS_INFO.address} (subject to confirmation)`
        : 'Delivery (subject to availability and confirmation by ANN BAKERY HOUSE)';
    messageLines.push('', `Preferred arrangement: ${arrangementText}`);
  }

  messageLines.push(
    '',
    'Please confirm the prices and availability. Thank you!',
  );

  const whatsappMessage = messageLines.join('\n');
  const whatsappOrderUrl = buildWhatsAppUrl(whatsappMessage);

  const handleCopySaved = async () => {
    if (!lastSavedOrder) return;
    try {
      await navigator.clipboard.writeText(lastSavedOrder.message);
      setCopiedSaved(true);
      setTimeout(() => setCopiedSaved(false), 2000);
    } catch {
      setCopiedSaved(false);
    }
  };

  const handleCopyCurrent = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedCurrent(true);
      setTimeout(() => setCopiedCurrent(false), 2000);
    } catch {
      setCopiedCurrent(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#111111]/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[#E8DFC8] bg-[#FAF6EE] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E8DFC8] bg-[#FFFDF9] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#AF140B]" aria-hidden="true" />
            <h2
              id="order-drawer-title"
              className="font-display text-2xl font-bold text-[#111111]"
            >
              Your Order Cart
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order cart"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#5C5952] transition-colors hover:bg-[#FAF6EE] hover:text-[#AF140B]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShoppingBag
                className="mb-3 h-10 w-10 text-[#FD8F00]"
                aria-hidden="true"
              />
              <p className="font-display text-2xl font-bold text-[#111111]">
                Your cart is empty
              </p>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-[#5C5952]">
                Select dishes, grilled specialties, bakery snacks, or cakes from our official menu to prepare your WhatsApp order.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-[48px] rounded-lg bg-[#AF140B] px-6 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#8E1009]"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cart Header & Clear Action */}
              <div className="flex items-center justify-between">
                <span className="tabular-nums text-xs font-semibold tracking-wider text-[#111111] uppercase">
                  Order Summary ({totalCount} {totalCount === 1 ? 'Item' : 'Items'})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setWhatsappAttempted(false);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[#5C5952] transition-colors hover:bg-[#FFFDF9] hover:text-[#AF140B]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear Cart</span>
                </button>
              </div>

              {/* Cart Items List */}
              <ul className="divide-y divide-[#EFE7D4] rounded-xl border border-[#E8DFC8] bg-[#FFFDF9]">
                {entries.map(({ key, item, selectedOption, quantity }) => (
                  <li key={key} className="space-y-2.5 p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-[#111111]">
                          {item.name}
                        </p>
                        {selectedOption && (
                          <p className="mt-0.5 text-xs font-medium text-[#AF140B]">
                            Variant: {selectedOption}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemove(item.id, selectedOption)}
                        aria-label={`Remove ${item.name}${selectedOption ? ` (${selectedOption})` : ''} from cart`}
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#5C5952] transition-colors hover:bg-[#FAF6EE] hover:text-[#AF140B]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#5C5952]">
                        Qty: <strong className="tabular-nums text-[#111111]">{quantity}</strong>
                      </span>

                      <div className="inline-flex items-center rounded-lg border border-[#E8DFC8] bg-[#FAF6EE]">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => onDecrement(item.id, selectedOption)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-l-lg text-[#111111] transition-colors hover:bg-[#FDD364]/40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="tabular-nums min-w-[2rem] text-center text-xs font-bold text-[#AF140B]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() => onIncrement(item, selectedOption)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-r-lg text-[#111111] transition-colors hover:bg-[#FDD364]/40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Customer Information & Special Instructions (Optional) */}
              <div className="space-y-3.5 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-4">
                <p className="text-xs font-semibold tracking-wider text-[#111111] uppercase">
                  Customer Details (Optional)
                </p>

                <div>
                  <label
                    htmlFor="drawer-name"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    Customer Name
                  </label>
                  <input
                    id="drawer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="drawer-phone"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    Phone Number
                  </label>
                  <input
                    id="drawer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#111111]">
                    Preferred Pickup or Delivery Arrangement
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Pickup', 'Delivery'] as const).map((option) => {
                      const isActive = arrangement === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() =>
                            setArrangement((prev) => (prev === option ? '' : option))
                          }
                          className={`min-h-[42px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? 'border-[#111111] bg-[#111111] text-[#FFFDF9]'
                              : 'border-[#DDD4BE] bg-[#FAF6EE] text-[#111111] hover:border-[#FD8F00]'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#5C5952]">
                    Pickup or delivery arrangements are subject to confirmation by ANN BAKERY HOUSE.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="drawer-instructions"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    Special Instructions
                  </label>
                  <textarea
                    id="drawer-instructions"
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Preferred date/time, preparation notes, or delivery area..."
                    className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              {whatsappAttempted && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#FD8F00] bg-[#FFFDF9] p-3.5 text-xs leading-relaxed text-[#111111]">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#AF140B]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      WhatsApp order link opened and message saved for review.
                    </p>
                    <p className="mt-0.5 text-[#5C5952]">
                      Your order is not confirmed until ANN BAKERY HOUSE replies on WhatsApp to confirm prices and availability. If WhatsApp did not open in your browser, copy your message below and send it to {BUSINESS_INFO.whatsappDisplay}.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyCurrent}
                      className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00]"
                    >
                      {copiedCurrent ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#3C5826]" aria-hidden="true" />
                          <span>Order Message Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy Order Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Saved WhatsApp Order Review Panel */}
          {lastSavedOrder && (
            <div className="mt-5 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-3.5 sm:p-4">
              <button
                type="button"
                aria-expanded={savedExpanded}
                onClick={() => setSavedExpanded((prev) => !prev)}
                className="flex min-h-[40px] w-full items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <History className="h-4 w-4 shrink-0 text-[#FD8F00]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#111111]">
                      Last Prepared WhatsApp Order
                    </p>
                    <p className="tabular-nums text-[11px] text-[#5C5952]">
                      {formatSavedTime(lastSavedOrder.savedAt)}
                      {lastSavedOrder.itemCount > 0
                        ? ` · ${lastSavedOrder.itemCount} ${lastSavedOrder.itemCount === 1 ? 'item' : 'items'}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#AF140B]">
                  <span>{savedExpanded ? 'Hide' : 'Review'}</span>
                  {savedExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
              </button>

              {savedExpanded && (
                <div className="mt-3 space-y-3 border-t border-[#EFE7D4] pt-3">
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#E8DFC8] bg-[#FAF6EE] p-3 font-sans text-xs leading-relaxed text-[#111111]">
                    {lastSavedOrder.message}
                  </pre>

                  <p className="text-[11px] text-[#5C5952]">
                    Saved locally in this browser for your reference. Orders are only confirmed after ANN BAKERY HOUSE replies on WhatsApp.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={lastSavedOrder.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2A2A2A]"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#FDD364]" aria-hidden="true" />
                      <span>Reopen WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopySaved}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00]"
                    >
                      {copiedSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#3C5826]" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClearSavedOrder();
                        setSavedExpanded(false);
                      }}
                      className="ml-auto inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-[#5C5952] transition-colors hover:text-[#AF140B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Cart Footer */}
        {entries.length > 0 && (
          <div className="border-t border-[#E8DFC8] bg-[#FFFDF9] p-4 sm:p-5">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-[#5C5952] uppercase">
                Pricing Status
              </span>
              <span className="text-right text-sm font-bold text-[#AF140B]">
                <PriceLabel
                  pricePhp={null}
                  pendingLabel="Price to be confirmed by ANN BAKERY HOUSE"
                  align="right"
                />
              </span>
            </div>
            <p className="mb-3.5 text-xs leading-relaxed text-[#5C5952]">
              Final prices in PHP (₱) and arrangement details are confirmed directly by ANN BAKERY HOUSE via WhatsApp.
            </p>
            <a
              href={whatsappOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setWhatsappAttempted(true);
                onRecordOrder(whatsappMessage, whatsappOrderUrl, totalCount);
              }}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#AF140B] px-5 py-3 text-sm font-semibold text-[#FFFDF9] shadow-sm transition-colors hover:bg-[#8E1009] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-[#FDD364]" aria-hidden="true" />
              <span>Send Order on WhatsApp</span>
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}

