import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={['mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5', className].join(' ')}>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
