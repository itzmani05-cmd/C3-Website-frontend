import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <Loader2 className={['animate-spin', className].join(' ')} aria-hidden="true" />;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={['flex flex-col items-center justify-center gap-3 py-16 text-slate-500', className].join(' ')}>
      <Spinner className="size-7 text-brand-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
