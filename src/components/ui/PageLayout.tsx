import type { ComponentType, ReactNode } from 'react';
import Banner from './Banner';
import { LoadingState } from './Spinner';
import type { LoadingVariant } from './Spinner';

interface PageHeaderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** Buttons shown on the right of the header. */
  actions?: ReactNode;
}

/** Admin page title row: icon badge, title, subtitle and optional actions. */
// The icon is kept in the props for callers, but the enterprise header is text-only.
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard admin page width. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">{children}</div>;
}

interface PageLayoutProps extends PageHeaderProps {
  /** While true, shows a spinner instead of the page body. */
  loading?: boolean;
  loadingMessage?: string;
  /** Shape of the loading skeleton (defaults to stat cards + table). */
  loadingVariant?: LoadingVariant;
  /** When set, shows this error instead of the page body. */
  error?: string;
  children: ReactNode;
}

/** Page container + header, with built-in loading and error states for the body. */
export default function PageLayout({ loading, loadingMessage, loadingVariant = 'page', error, children, ...header }: PageLayoutProps) {
  let body = children;
  if (loading) body = <LoadingState message={loadingMessage} variant={loadingVariant} />;
  else if (error) body = <Banner variant="error" message={error} />;

  return (
    <PageContainer>
      <PageHeader {...header} />
      {body}
    </PageContainer>
  );
}
