import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { BUSINESS_INFO, formatPhp } from '../data/menu';

interface PriceLabelProps {
  pricePhp: number | null;
  pendingLabel?: string;
  align?: 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

const TOOLTIP_TEXT =
  'Prices are provided via WhatsApp confirmation for accurate, fresh quotes in PHP (₱).';

export default function PriceLabel({
  pricePhp,
  pendingLabel = BUSINESS_INFO.pricePendingText,
  align = 'left',
  className = '',
  iconClassName = '',
}: PriceLabelProps) {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!pinnedOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setPinnedOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinnedOpen]);

  if (pricePhp !== null) {
    return <span className={`tabular-nums ${className}`}>{formatPhp(pricePhp)}</span>;
  }

  return (
    <span
      ref={containerRef}
      className={`group/price relative inline-flex items-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={pinnedOpen}
        onClick={() => setPinnedOpen((prev) => !prev)}
        className="inline-flex cursor-help items-center gap-1 text-left underline decoration-[#FD8F00]/80 decoration-dotted underline-offset-4 transition-colors hover:text-[#AF140B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD8F00] focus-visible:rounded-xs"
      >
        <span>{pendingLabel}</span>
        <Info
          className={`h-3.5 w-3.5 shrink-0 text-[#FD8F00] ${iconClassName}`}
          aria-hidden="true"
        />
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-30 mb-2 w-56 max-w-[calc(100vw-3rem)] rounded-lg border border-[#FDD364]/40 bg-[#111111] px-3 py-2 text-left text-xs font-normal leading-relaxed text-[#FFFDF9] shadow-lg transition-all duration-150 ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${
          pinnedOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-1 opacity-0 group-hover/price:visible group-hover/price:translate-y-0 group-hover/price:opacity-100 group-focus-within/price:visible group-focus-within/price:translate-y-0 group-focus-within/price:opacity-100'
        }`}
      >
        {TOOLTIP_TEXT}
        <span
          aria-hidden="true"
          className={`absolute top-full h-2 w-2 -translate-y-1 rotate-45 border-r border-b border-[#FDD364]/40 bg-[#111111] ${
            align === 'right' ? 'right-4' : 'left-4'
          }`}
        />
      </span>
    </span>
  );
}
