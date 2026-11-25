import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Shared, brand-styled UI primitives for the admin dashboard.
 * Lightweight on purpose — no external component library.
 */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] shadow-xs ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#E8DFC8] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#111111] sm:text-3xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-[#5C5952]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[#AF140B] text-[#FFFDF9] hover:bg-[#8E1009]',
  gold: 'bg-[#FDD364] text-[#111111] hover:bg-[#FD8F00]',
  secondary: 'border border-[#DDD4BE] bg-[#FFFDF9] text-[#111111] hover:border-[#FD8F00]',
  danger: 'border border-[#AF140B]/30 bg-[#FFFDF9] text-[#AF140B] hover:bg-[#AF140B] hover:text-[#FFFDF9]',
  ghost: 'text-[#5C5952] hover:bg-[#FAF6EE] hover:text-[#111111]',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1 block text-xs font-semibold text-[#111111]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#5C5952]">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  'min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#AF140B] focus:outline-none';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_CLASS} ${props.className ?? ''}`} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        checked
          ? 'border-[#3C5826] bg-[#3C5826]/10 text-[#3C5826]'
          : 'border-[#DDD4BE] bg-[#FAF6EE] text-[#5C5952]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-3 w-3 rounded-full ${checked ? 'bg-[#3C5826]' : 'bg-[#DDD4BE]'}`}
      />
      {checked ? 'Active' : 'Inactive'}
    </button>
  );
}

type BannerKind = 'info' | 'success' | 'warning' | 'error';

const BANNER_STYLES: Record<BannerKind, string> = {
  info: 'border-[#E8DFC8] bg-[#FAF6EE] text-[#5C5952]',
  success: 'border-[#3C5826]/30 bg-[#3C5826]/10 text-[#2F461D]',
  warning: 'border-[#FD8F00]/40 bg-[#FDD364]/25 text-[#7A4A00]',
  error: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
};

export function Banner({
  kind = 'info',
  children,
  className = '',
}: {
  kind?: BannerKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${BANNER_STYLES[kind]} ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#DDD4BE] bg-[#FAF6EE] p-8 text-center">
      <p className="font-display text-xl font-bold text-[#111111]">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-[#5C5952]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-[#5C5952]">{label}</p>;
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111111]/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-[#111111]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-2.5 py-1 text-sm font-semibold text-[#111111] hover:border-[#AF140B] hover:text-[#AF140B]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
