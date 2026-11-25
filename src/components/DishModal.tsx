import { useEffect, useState } from 'react';
import { MessageCircle, Minus, Plus, UtensilsCrossed, X } from 'lucide-react';
import { BUSINESS_INFO, MenuItem, buildWhatsAppUrl } from '../data/menu';
import PriceLabel from './PriceLabel';

interface DishModalProps {
  item: MenuItem | null;
  initialOption?: string;
  onSelectOption?: (itemId: string, option: string) => void;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedOption?: string, quantity?: number) => void;
  onRecordOrder?: (message: string, url: string, itemCount: number) => void;
}

export default function DishModal({
  item,
  initialOption,
  onSelectOption,
  onClose,
  onAdd,
  onRecordOrder,
}: DishModalProps) {
  const [imgError, setImgError] = useState(false);
  const [chosenOption, setChosenOption] = useState<string | undefined>(initialOption);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setImgError(false);
    setQty(1);
    if (item?.options && item.options.length > 0) {
      setChosenOption(initialOption || item.options[0]);
    } else {
      setChosenOption(undefined);
    }
  }, [item, initialOption]);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const directItemMessage = [
    `Hello ${BUSINESS_INFO.name}! I would like to inquire or order:`,
    `• ${qty}x ${item.name}${chosenOption ? ` (${chosenOption})` : ''}`,
    'Please confirm availability and pricing in PHP (₱).',
  ].join('\n');

  const directWhatsAppUrl = buildWhatsAppUrl(directItemMessage);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111111]/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-[#E8DFC8] bg-[#FFFDF9] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dish details"
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E8DFC8] bg-[#FFFDF9]/95 text-[#111111] shadow-sm transition-colors hover:bg-[#FDD364]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2EBDC]">
          {!imgError ? (
            <img
              src={item.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#FAF6EE] to-[#FDD364]/30 text-[#5C5952]">
              <UtensilsCrossed className="h-10 w-10 text-[#111111]/70" />
              <span className="font-display text-xl font-bold text-[#111111]">
                {item.name}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[#5C5952]">
            <span className="text-[#AF140B]">{item.category}</span>
            <span aria-hidden="true">·</span>
            <span>Philippine Peso (₱)</span>
          </div>

          <h2
            id="dish-modal-title"
            className="font-display text-3xl font-bold leading-tight text-[#111111]"
          >
            {item.name}
          </h2>

          <p className="mt-1.5 mb-3 text-base font-bold text-[#111111]">
            <PriceLabel pricePhp={item.pricePhp} />
          </p>

          <p className="mb-5 text-sm leading-relaxed text-[#5C5952]">
            {item.fullDescription}
          </p>

          {item.options && item.options.length > 0 && (
            <div className="mb-5 rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] p-4">
              <span className="mb-2 block text-xs font-semibold tracking-wider text-[#111111] uppercase">
                {item.optionLabel ?? 'Select Option'}
              </span>
              <div className="flex flex-wrap gap-2">
                {item.options.map((option) => {
                  const isSelected = chosenOption === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setChosenOption(option);
                        onSelectOption?.(item.id, option);
                      }}
                      className={`min-h-[42px] whitespace-nowrap rounded-lg border px-4 py-1.5 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'border-[#111111] bg-[#111111] text-[#FFFDF9]'
                          : 'border-[#DDD4BE] bg-[#FFFDF9] text-[#111111] hover:border-[#FD8F00]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Preparation Info */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8DFC8] pt-4">
            <div className="text-xs leading-relaxed text-[#5C5952]">
              <p className="font-semibold text-[#111111]">Homemade to Order</p>
              <p>Taguig City Pickup or Local Delivery · Prices confirmed on WhatsApp</p>
            </div>

            <div className="inline-flex items-center rounded-lg border border-[#DDD4BE] bg-[#FAF6EE]">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="inline-flex h-11 w-11 items-center justify-center text-[#111111] transition-colors hover:bg-[#FDD364]/40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="tabular-nums min-w-[2.25rem] text-center text-sm font-bold text-[#111111]">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((prev) => prev + 1)}
                className="inline-flex h-11 w-11 items-center justify-center text-[#111111] transition-colors hover:bg-[#FDD364]/40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onRecordOrder?.(directItemMessage, directWhatsAppUrl, qty)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#111111] bg-[#FFFDF9] px-5 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#FAF6EE]"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-[#AF140B]" aria-hidden="true" />
              <span>Order on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                onAdd(item, chosenOption, qty);
                onClose();
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#AF140B] px-6 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#8E1009]"
            >
              <Plus className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
              <span>
                Add {qty > 1 ? `${qty} ` : ''}to Bag{chosenOption ? ` (${chosenOption})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
