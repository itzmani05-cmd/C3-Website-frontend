import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success-soft/60 text-success-600 ring-success-500/20',
  danger: 'bg-danger-soft/60 text-danger-600 ring-danger-500/20',
  warning: 'bg-warning-soft/60 text-warning-text ring-warning-500/25',
  info: 'bg-blue-50 text-info-600 ring-info-500/20',
  neutral: 'bg-slate-50 text-slate-600 ring-slate-500/15',
  brand: 'bg-brand-50 text-brand-700 ring-brand-500/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
