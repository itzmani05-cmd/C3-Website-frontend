import type { ReactNode } from 'react';

interface PanelProps {
  title: ReactNode;
  /** Optional step number shown before the title (for multi-step tools). */
  step?: number;
  description?: ReactNode;
  /** Controls on the right of the header bar. */
  actions?: ReactNode;
  /** Footer bar, typically the primary action, aligned right. */
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No padding around the body (for lists and tables that run edge to edge). */
  flush?: boolean;
  children?: ReactNode;
}

/** White bordered section with a header bar; the building block of the admin tool pages. */
export default function Panel({ title, step, description, actions, footer, className = '', bodyClassName = '', flush = false, children }: PanelProps) {
  return (
    <section className={['overflow-hidden rounded-lg border border-slate-200 bg-white', className].join(' ')}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 px-4 py-3">
        {step !== undefined && (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ink-900 text-[11px] font-bold tabular-nums text-white">
            {step}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children !== undefined && children !== null && children !== false && (
        <div className={[flush ? '' : 'p-4 sm:p-5', bodyClassName].join(' ')}>{children}</div>
      )}
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3">{footer}</footer>}
    </section>
  );
}
