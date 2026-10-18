import { Loader2 } from 'lucide-react';

export type LoadingVariant = 'table' | 'cards' | 'form' | 'page';

interface LoadingStateProps {
  /** Announced to screen readers; skeletons don't show text. */
  message?: string;
  /** Rough shape of the content being loaded. */
  variant?: LoadingVariant;
  rows?: number;
  className?: string;
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <Loader2 className={['animate-spin', className].join(' ')} aria-hidden="true" />;
}

/** A grey placeholder block with a soft shimmer. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={['skeleton block rounded', className].join(' ')} />;
}

// Varying widths so skeleton rows look like real content rather than a grid of bars.
const WIDTHS = ['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-2/3', 'w-3/4'];

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-6 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="ml-auto h-2.5 w-20" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-slate-100 px-4 py-3.5 last:border-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={['h-3', WIDTHS[i % WIDTHS.length]].join(' ')} />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="mt-2.5 h-2.5 w-3/4" />
          <div className="mt-5 flex items-center justify-between">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-2 h-2.5 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-3 h-6 w-12" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}

/** Loading placeholder shaped like the content it stands in for. */
export function LoadingState({ message = 'Loading...', variant = 'table', rows, className = '' }: LoadingStateProps) {
  let body;
  if (variant === 'cards') body = <CardsSkeleton rows={rows ?? 3} />;
  else if (variant === 'form') body = <FormSkeleton rows={rows ?? 4} />;
  else if (variant === 'page') body = <PageSkeleton />;
  else body = <TableSkeleton rows={rows ?? 5} />;

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{message}</span>
      {body}
    </div>
  );
}

/** Full-screen loader for app-level waits (e.g. opening the exam portal). */
export function AppLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f4f5f7] px-4">
      <span className="flex size-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-soft-sm">
        <img src="/C3AppLogo-128.png" alt="" className="size-9 object-contain" />
      </span>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-200">
        <span className="loading-bar block h-full w-1/3 rounded-full bg-brand-600" />
      </div>
      <p className="text-[13px] font-medium text-slate-500">{message}</p>
    </div>
  );
}
