import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success-600',
  danger: 'bg-danger-soft text-danger-600',
  warning: 'bg-warning-soft text-warning-text',
  info: 'bg-blue-50 text-info-600',
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-100 text-brand-700',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
