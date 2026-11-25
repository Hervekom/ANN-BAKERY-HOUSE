import { useState } from 'react';
import { Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { MenuItem } from '../data/menu';
import PriceLabel from './PriceLabel';

interface MenuCardProps {
  item: MenuItem;
  selectedOption?: string;
  onSelectOption: (option: string) => void;
  quantity: number;
  onAdd: (item: MenuItem, option?: string) => void;
  onDecrement: (itemId: string, option?: string) => void;
  onInspect: (item: MenuItem) => void;
}

export default function MenuCard({
  item,
  selectedOption,
  onSelectOption,
  quantity,
  onAdd,
  onDecrement,
  onInspect,
}: MenuCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FD8F00] hover:shadow-md">
      {/* 4:3 Image Frame */}
      <button
        type="button"
        onClick={() => onInspect(item)}
        aria-label={`View details for ${item.name}`}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-[#F2EBDC] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
      >
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#FAF6EE] to-[#FDD364]/30 px-4 text-center text-[#5C5952]">
            <UtensilsCrossed className="h-8 w-8 text-[#111111]/70" aria-hidden="true" />
            <span className="font-display text-lg font-semibold text-[#111111]">
              {item.name}
            </span>
          </div>
        )}
      </button>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {/* Clean Unboxed Metadata */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#5C5952]">
          <span className="text-[#111111]">{item.category}</span>
          {item.options && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#AF140B]">Customizable</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="font-display text-[1.35rem] font-bold leading-snug text-[#111111] sm:text-2xl">
          <button
            type="button"
            onClick={() => onInspect(item)}
            className="text-left transition-colors hover:text-[#AF140B] focus-visible:outline-none focus-visible:underline"
          >
            {item.name}
          </button>
        </h3>

        {/* PHP Price / Price to be confirmed */}
        <p className="mt-1 mb-2 text-sm font-semibold text-[#111111]">
          <PriceLabel pricePhp={item.pricePhp} />
        </p>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-[#5C5952]">
          {item.shortDescription}
        </p>

        {/* Product Option Selector (when applicable) */}
        {item.options && item.options.length > 0 && (
          <div className="mb-4">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#5C5952] uppercase">
              {item.optionLabel ?? 'Select Option'}
            </span>
            <div className="flex flex-wrap gap-2">
              {item.options.map((option) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSelectOption(option)}
                    className={`min-h-[40px] whitespace-nowrap rounded-md border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-[#111111] bg-[#111111] text-[#FFFDF9]'
                        : 'border-[#DDD4BE] bg-[#FAF6EE] text-[#111111] hover:border-[#FD8F00]'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-[#EFE7D4] pt-3.5 sm:pt-4">
          <button
            type="button"
            onClick={() => onInspect(item)}
            className="min-h-[44px] whitespace-nowrap text-sm font-semibold text-[#111111] underline-offset-4 transition-colors hover:text-[#AF140B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
          >
            View Details
          </button>

          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onAdd(item, selectedOption)}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#AF140B] px-4 py-2 text-sm font-semibold text-[#FFFDF9] transition-colors duration-150 hover:bg-[#8E1009] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00]"
            >
              <Plus className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
              <span>Add to Order</span>
            </button>
          ) : (
            <div className="inline-flex min-h-[44px] items-center rounded-lg border border-[#FD8F00] bg-[#FDD364]/25 px-1">
              <button
                type="button"
                aria-label={`Decrease ${item.name} quantity`}
                onClick={() => onDecrement(item.id, selectedOption)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#111111] transition-colors hover:bg-[#FDD364]/60"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="tabular-nums min-w-[2rem] text-center text-sm font-bold text-[#AF140B]">
                {quantity}
              </span>
              <button
                type="button"
                aria-label={`Increase ${item.name} quantity`}
                onClick={() => onAdd(item, selectedOption)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#111111] transition-colors hover:bg-[#FDD364]/60"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
