export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

const DOT: Record<StatusTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  neutral: 'bg-slate-400',
  brand: 'bg-brand-600',
};

/** A small coloured dot followed by a label, for status columns in tables. */
export default function StatusDot({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-slate-700">
      <span className={['size-1.5 shrink-0 rounded-full', DOT[tone]].join(' ')} aria-hidden="true" />
      {children}
    </span>
  );
}
