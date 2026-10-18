import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Admin page title row (same look as PageLayout's header, without requiring an icon). */
export default function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={['mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className].join(' ')}>
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
