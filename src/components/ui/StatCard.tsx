import type { ReactNode } from 'react';
import Card from './Card';

export type StatCardTone = 'brand' | 'success' | 'danger' | 'warning' | 'neutral';

const TONE_CLASSES: Record<StatCardTone, { icon: string; value: string }> = {
  brand: { icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
  success: { icon: 'bg-success-soft text-success-600', value: 'text-slate-900' },
  danger: { icon: 'bg-danger-soft text-danger-600', value: 'text-slate-900' },
  warning: { icon: 'bg-warning-soft text-warning-text', value: 'text-slate-900' },
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
    <Card className={['p-3 sm:p-4', className].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-slate-500 sm:text-[13px]">{label}</p>
        <span className={['hidden size-7 shrink-0 items-center justify-center rounded-md sm:flex [&>svg]:size-3.5', toneClasses.icon].join(' ')}>{icon}</span>
      </div>
      <p className={['mt-2 font-heading text-xl font-bold leading-none tabular-nums sm:text-2xl', toneClasses.value].join(' ')}>{value}</p>
    </Card>
  );}
