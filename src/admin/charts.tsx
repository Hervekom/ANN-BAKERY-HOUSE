import { useState } from 'react';

/**
 * Dependency-free chart primitives for the admin dashboard.
 *
 * They intentionally use plain SVG + CSS grid instead of pulling in a charting
 * library: the analytics needs are simple, the bundle stays small, and the
 * visuals match the ANN BAKERY HOUSE brand tokens exactly.
 */

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

const CRIMSON = '#AF140B';
const SAFFRON = '#FD8F00';
const GOLD = '#FDD364';
const GREEN = '#3C5826';
const MUTED = '#5C5952';

export const CHART_PALETTE = [CRIMSON, SAFFRON, GREEN, GOLD, MUTED, '#8E1009', '#C97B00', '#2F461D'];

/**
 * Vertical bar chart with hover tooltips. Labels are thinned so they never
 * overlap on narrow screens.
 */
export function BarSeriesChart({
  points,
  formatValue,
  color = CRIMSON,
  height = 220,
  emptyLabel = 'No data for this period',
}: {
  points: ChartDatum[];
  formatValue: (value: number) => string;
  color?: string;
  height?: number;
  emptyLabel?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (points.length === 0) {
    return <ChartEmpty label={emptyLabel} height={height} />;
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const step = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {points.map((point, index) => {
          const ratio = point.value <= 0 ? 0 : point.value / max;
          const barHeight = point.value <= 0 ? 0 : Math.max(2, ratio * 100);
          const isHovered = hovered === point.key;
          return (
            <div
              key={point.key}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHovered(point.key)}
              onMouseLeave={() => setHovered((current) => (current === point.key ? null : current))}
            >
              {isHovered && (
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111111] px-2 py-1 text-[11px] font-semibold text-[#FFFDF9] shadow-lg">
                  {formatValue(point.value)}
                  <span className="ml-1 font-normal text-[#FDD364]">{point.label}</span>
                </div>
              )}
              <div
                role="img"
                aria-label={`${point.label}: ${formatValue(point.value)}`}
                className="w-full rounded-t transition-opacity"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: point.value <= 0 ? '#E8DFC8' : color,
                  opacity: hovered && !isHovered ? 0.6 : 1,
                }}
              />
              {/* Baseline tick for zero-value buckets so the axis reads clearly. */}
              {point.value <= 0 && <div className="h-[1px] w-full bg-[#E8DFC8]" />}
              <span className="sr-only">{index + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px]">
        {points.map((point, index) => (
          <span
            key={`label-${point.key}`}
            className="flex-1 truncate text-center text-[10px] leading-tight text-[#5C5952]"
          >
            {index % step === 0 ? point.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal ranked bar list (products / categories). */
export function HorizontalBarList({
  rows,
  formatValue,
  color = CRIMSON,
  emptyLabel = 'No data for this period',
}: {
  rows: Array<{ key: string; label: string; value: number; hint?: string }>;
  formatValue: (value: number) => string;
  color?: string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <ChartEmpty label={emptyLabel} height={160} />;
  }
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold text-[#111111]">{row.label}</span>
            <span className="tabular-nums shrink-0 text-xs font-bold text-[#111111]">
              {formatValue(row.value)}
              {row.hint && <span className="ml-1.5 font-normal text-[#5C5952]">{row.hint}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F1EAD8]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut chart (sales by category) with an HTML legend. */
export function DonutChart({
  slices,
  formatValue,
  emptyLabel = 'No data for this period',
}: {
  slices: Array<{ key: string; label: string; value: number }>;
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0 || total <= 0) {
    return <ChartEmpty label={emptyLabel} height={180} />;
  }

  const radius = 15.9155; // circumference ≈ 100, so each slice length == its percentage
  let offset = 0; // the -90° rotation below already puts the first slice at 12 o'clock
  const segments = slices.map((slice, index) => {
    const percent = (slice.value / total) * 100;
    const segment = {
      ...slice,
      percent,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
      dash: `${percent} ${100 - percent}`,
      offset,
    };
    offset -= percent;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox="0 0 42 42" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Sales by category">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="#F1EAD8" strokeWidth="5" />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="5"
            strokeDasharray={segment.dash}
            strokeDashoffset={segment.offset}
            pathLength={100}
          />
        ))}
      </svg>
      <ul className="w-full space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
              />
              <span className="truncate font-semibold text-[#111111]">{segment.label}</span>
            </span>
            <span className="tabular-nums shrink-0 font-bold text-[#111111]">
              {formatValue(segment.value)}
              <span className="ml-1.5 font-normal text-[#5C5952]">{segment.percent.toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartEmpty({ label, height }: { label: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-[#DDD4BE] bg-[#FAF6EE] text-xs text-[#5C5952]"
      style={{ height }}
    >
      {label}
    </div>
  );
}
