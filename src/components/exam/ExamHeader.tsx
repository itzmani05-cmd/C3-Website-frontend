import { ArrowLeft, Calculator, CheckCircle2, RefreshCw, Wifi } from 'lucide-react';
import ExamTimer from './ExamTimer';

interface ExamHeaderProps {
  selectedTestName: string;
  studentEmail: string;
  online: boolean;
  syncing: boolean;
  unsyncedAnswers: Record<string, string | null>;
  deadline: number | null;
  timerActive: boolean;
  onTimeUp: () => void;
  calculatorOpen: boolean;
  onToggleCalculator: () => void;
  onExit: () => void;
}

export default function ExamHeader({
  selectedTestName,
  studentEmail,
  online,
  syncing,
  unsyncedAnswers,
  deadline,
  timerActive,
  onTimeUp,
  calculatorOpen,
  onToggleCalculator,
  onExit,
}: ExamHeaderProps) {
  const hasUnsynced = Object.keys(unsyncedAnswers).length > 0;

  const syncLabel = !online ? 'Offline' : syncing ? 'Saving changes...' : hasUnsynced ? 'Syncing...' : 'Saved to cloud';
  const syncColorClasses = !online
    ? 'bg-danger-soft text-danger-600'
    : syncing || hasUnsynced
      ? 'bg-warning-soft text-warning-text'
      : 'bg-success-soft text-success-600';

  const SyncIcon = !online ? Wifi : syncing || hasUnsynced ? RefreshCw : CheckCircle2;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6 sm:py-3 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/C3AppLogo-128.png" alt="" className="hidden size-8 shrink-0 object-contain sm:block" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{selectedTestName}</h1>
          <span className="block truncate text-xs text-slate-500">{studentEmail}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit to tests"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Exit to tests</span>
          <span className="sm:hidden">Exit</span>
        </button>

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

        <div
          role="status"
          title={syncLabel}
          aria-label={syncLabel}
          className={['inline-flex items-center justify-center rounded-full p-1.5', syncColorClasses].join(' ')}
        >
          <SyncIcon className={['size-3.5', syncing || hasUnsynced ? 'animate-spin' : ''].join(' ')} />
        </div>

        <ExamTimer deadline={deadline} active={timerActive} onExpire={onTimeUp} />
      </div>
    </header>
  );
}
