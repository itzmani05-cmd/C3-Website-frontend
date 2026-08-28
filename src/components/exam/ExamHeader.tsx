import { Calculator, CheckCircle2, Clock, FileEdit, RefreshCw, Wifi } from 'lucide-react';

interface ExamHeaderProps {
  selectedTestName: string;
  studentEmail: string;
  online: boolean;
  syncing: boolean;
  unsyncedAnswers: Record<string, string | null>;
  remainingTime: number;
  formatTime: (secs: number) => string;
  calculatorOpen: boolean;
  onToggleCalculator: () => void;
}

export default function ExamHeader({
  selectedTestName,
  studentEmail,
  online,
  syncing,
  unsyncedAnswers,
  remainingTime,
  formatTime,
  calculatorOpen,
  onToggleCalculator,
}: ExamHeaderProps) {
  const isTimeCritical = remainingTime < 600;
  const hasUnsynced = Object.keys(unsyncedAnswers).length > 0;

  const syncLabel = !online ? 'Offline' : syncing ? 'Saving changes...' : hasUnsynced ? 'Syncing...' : 'Saved to cloud';
  const syncColorClasses = !online
    ? 'bg-danger-soft text-danger-600'
    : syncing || hasUnsynced
      ? 'bg-warning-soft text-warning-text'
      : 'bg-success-soft text-success-600';

  const SyncIcon = !online ? Wifi : syncing || hasUnsynced ? RefreshCw : CheckCircle2;

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <FileEdit className="size-[22px] text-brand-600" />
        <div>
          <h1 className="text-base font-bold text-slate-900">{selectedTestName} Portal</h1>
          <span className="text-xs text-slate-500">{studentEmail}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleCalculator}
          aria-pressed={calculatorOpen}
          aria-label={calculatorOpen ? 'Close calculator' : 'Open calculator'}
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            calculatorOpen ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ].join(' ')}
        >
          <Calculator className="size-3.5" />
          <span className="hidden sm:inline">Calculator</span>
        </button>

        <div className={['inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold', syncColorClasses].join(' ')}>
          <SyncIcon className={['size-3.5', syncing || hasUnsynced ? 'animate-spin' : ''].join(' ')} />
          <span>{syncLabel}</span>
        </div>

        <div
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            isTimeCritical ? 'bg-danger-soft text-danger-600' : 'bg-slate-100 text-slate-700',
          ].join(' ')}
        >
          <Clock className="size-3.5" />
          <span>{formatTime(remainingTime)}</span>
        </div>
      </div>
    </header>
  );
}
