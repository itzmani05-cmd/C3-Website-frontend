import { CheckCircle2, RotateCw, X, XCircle } from 'lucide-react';

interface BannerProps {
  variant: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
  /** Shows a Retry button, for banners that report a failed load. */
  onRetry?: () => void;
}

export default function Banner({ variant, message, onDismiss, onRetry }: BannerProps) {
  const isSuccess = variant === 'success';
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={[
        'mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium',
        isSuccess ? 'border-success-500/20 bg-success-soft text-success-600' : 'border-danger-500/20 bg-danger-soft text-danger-600',
      ].join(' ')}
    >
      <span className="flex items-center gap-2">
        {isSuccess ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-current/30 bg-white/60 px-2.5 text-xs font-semibold hover:bg-white"
        >
          <RotateCw className="size-3.5" /> Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-current/70 hover:bg-black/5"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
