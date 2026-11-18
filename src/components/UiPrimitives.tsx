import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCareSync } from '../store/useCareSyncStore';

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export const ScreenHeader: React.FC<{
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}> = ({ title, subtitle, showBack = false, rightSlot }) => {
  const { back } = useCareSync();
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 px-3 py-2.5 text-white shadow-sm pt-safe"
      style={{ backgroundColor: 'var(--g)' }}
    >
      {showBack && (
        <button
          type="button"
          onClick={back}
          aria-label="Go back"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/95 active:bg-white/15"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1 pl-1">
        <div className="truncate text-base font-semibold leading-tight">{title}</div>
        {subtitle && <div className="truncate text-xs text-white/85">{subtitle}</div>}
      </div>
      {rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
    </header>
  );
};

export const SyncStatusBar: React.FC = () => {
  const { state } = useCareSync();
  if (!state.off) {
    return null;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full min-h-[42px] items-center gap-2.5 px-4 py-2 text-left text-[13px]"
      style={{ backgroundColor: 'var(--aml)', color: 'var(--tx)' }}
    >
      <span
        className="h-2.5 w-2.5 flex-none rounded-full"
        style={{ backgroundColor: 'var(--am)' }}
      />
      <span className="font-semibold">Offline • No connection</span>
      <span className="flex-1" />
      <span className="text-xs opacity-85">
        {state.pending > 0
          ? `${state.pending} queued • Last synced: ${state.lastSyncedLabel}`
          : `Saved locally • Last synced: ${state.lastSyncedLabel}`}
      </span>
    </div>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  blink?: boolean;
}> = ({ children, className = '', style, onClick, blink = false }) => {
  const baseClass = `rounded-xl border p-3.5 mb-2.5 transition-colors ${blink ? 'animate-makset-blink' : ''} ${className}`;
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    borderColor: 'var(--ln)',
    ...style,
  };
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} w-full text-left active:opacity-90`}
        style={cardStyle}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={baseClass} style={cardStyle}>
      {children}
    </div>
  );
};

export const ListRowCard: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  blink?: boolean;
  style?: React.CSSProperties;
}> = ({ children, onClick, blink = false, style }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2.5 flex w-full min-h-[56px] items-center gap-3 rounded-xl border p-3 text-left transition-colors active:opacity-90 ${blink ? 'animate-makset-blink' : ''}`}
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ln)', ...style }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      <ChevronRight className="h-5 w-5 flex-none opacity-60" style={{ color: 'var(--mu)' }} />
    </button>
  );
};

export const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'danger' | 'whatsapp';
  compact?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}> = ({
  children,
  onClick,
  variant = 'solid',
  compact = false,
  className = '',
  type = 'button',
  disabled = false,
}) => {
  const heightCls = compact ? 'min-h-[42px] px-3 py-2 text-[13px]' : 'min-h-[48px] px-4 py-3 text-[15px]';
  const style: React.CSSProperties =
    variant === 'outline'
      ? { backgroundColor: 'var(--card)', color: 'var(--g)', border: '1.5px solid var(--g)' }
      : variant === 'danger'
        ? { backgroundColor: 'var(--rd)', color: '#ffffff' }
        : variant === 'whatsapp'
          ? { backgroundColor: '#1fa855', color: '#ffffff' }
          : { backgroundColor: 'var(--g)', color: '#ffffff' };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`my-1.5 flex w-full items-center justify-center gap-2 rounded-xl font-semibold transition-opacity active:opacity-85 disabled:opacity-60 ${heightCls} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
};

export const FieldLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mb-1 mt-2.5 text-xs font-medium ${className}`} style={{ color: 'var(--mu)' }}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mb-1.5 text-sm font-bold ${className}`} style={{ color: 'var(--g)' }}>
    {children}
  </div>
);

export const SingleChoiceChips: React.FC<{
  options: string[];
  value: string;
  onChange: (val: string) => void;
  allowDeselect?: boolean;
  centered?: boolean;
}> = ({ options, value, onChange, allowDeselect = false, centered = false }) => (
  <div className={`flex flex-wrap gap-1.5 ${centered ? 'justify-center' : ''}`}>
    {options.map((opt) => {
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(allowDeselect && active ? '' : opt)}
          className="min-h-[38px] rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={
            active
              ? { backgroundColor: 'var(--g)', color: '#ffffff', borderColor: 'var(--g)' }
              : { backgroundColor: 'var(--card)', color: 'var(--tx)', borderColor: 'var(--ln)' }
          }
        >
          {opt}
        </button>
      );
    })}
  </div>
);

export const MultiChoiceChips: React.FC<{
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
}> = ({ options, values, onChange }) => {
  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="min-h-[38px] rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={
              active
                ? { backgroundColor: 'var(--g)', color: '#ffffff', borderColor: 'var(--g)' }
                : { backgroundColor: 'var(--card)', color: 'var(--tx)', borderColor: 'var(--ln)' }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

export const Avatar: React.FC<{ name: string; inverse?: boolean }> = ({ name, inverse = false }) => (
  <div
    className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-sm font-bold"
    style={{
      backgroundColor: inverse ? '#ffffff' : 'var(--gl)',
      color: 'var(--g)',
    }}
  >
    {initials(name)}
  </div>
);

export const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full min-h-[44px] rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-700/30 ${props.className || ''}`}
    style={{
      backgroundColor: 'var(--card)',
      color: 'var(--tx)',
      borderColor: 'var(--ln)',
      ...props.style,
    }}
  />
);

export const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`w-full min-h-[44px] rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-700/30 ${props.className || ''}`}
    style={{
      backgroundColor: 'var(--card)',
      color: 'var(--tx)',
      borderColor: 'var(--ln)',
      ...props.style,
    }}
  />
);

export const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-700/30 ${props.className || ''}`}
    style={{
      backgroundColor: 'var(--card)',
      color: 'var(--tx)',
      borderColor: 'var(--ln)',
      ...props.style,
    }}
  />
);
