import type { ReactNode } from 'react';
import Card from './Card';

export type StatCardTone = 'brand' | 'success' | 'danger' | 'warning' | 'neutral';

const TONE_CLASSES: Record<StatCardTone, { icon: string; value: string }> = {
  brand: { icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
  success: { icon: 'bg-success-soft text-success-600', value: 'text-success-600' },
  danger: { icon: 'bg-danger-soft text-danger-600', value: 'text-danger-600' },
  warning: { icon: 'bg-warning-soft text-warning-text', value: 'text-warning-text' },
  neutral: { icon: 'bg-slate-100 text-slate-500', value: 'text-slate-900' },
};

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  tone?: StatCardTone;
  className?: string;
}

export default function StatCard({ icon, value, label, tone = 'brand', className = '' }: StatCardProps) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <Card className={['flex items-center gap-3 px-4 py-3.5', className].join(' ')}>
      <span className={['flex size-9 shrink-0 items-center justify-center rounded-lg', toneClasses.icon].join(' ')}>{icon}</span>
      <div className="min-w-0">
        <p className={['font-heading text-lg font-bold leading-tight', toneClasses.value].join(' ')}>{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
