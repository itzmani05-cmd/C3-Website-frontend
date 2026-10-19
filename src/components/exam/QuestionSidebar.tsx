import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Check, LayoutGrid, Send, X } from 'lucide-react';
import type { ExamQuestion } from '../../types/models';

interface QuestionSidebarProps {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  unsyncedAnswers: Record<string, string | null>;
  visitedQuestions: Set<string>;
  markedForReview: Set<string>;
  activeQuestionIndex: number;
  selectedTestName: string;
  onNavigate: (index: number) => void;
  onSubmitClick: () => void;
  onExitClick: () => void;
}

type QuestionStatus = 'answered' | 'not-answered' | 'not-visited' | 'marked' | 'answered-marked';

function getStatus(answered: boolean, visited: boolean, marked: boolean): QuestionStatus {
  if (answered && marked) return 'answered-marked';
  if (marked) return 'marked';
  if (answered) return 'answered';
  if (visited) return 'not-answered';
  return 'not-visited';
}

const SHIELD = '[clip-path:polygon(0_0,100%_0,100%_64%,50%_100%,0_64%)]';

const SHAPE_CLASSES: Record<QuestionStatus, string> = {
  answered: `${SHIELD} bg-success-500 text-white`,
  'not-answered': `${SHIELD} bg-danger-500 text-white`,
  'not-visited': 'rounded-md border-2 border-slate-300 bg-white text-slate-500',
  marked: 'rounded-full bg-accent-500 text-white',
  'answered-marked': 'rounded-full bg-accent-500 text-white',
};

const LEGEND_ITEMS: { status: QuestionStatus; label: string }[] = [
  { status: 'answered', label: 'Answered' },
  { status: 'not-answered', label: 'Not Answered' },
  { status: 'not-visited', label: 'Not Visited' },
  { status: 'marked', label: 'Marked for Review' },
  { status: 'answered-marked', label: 'Answered & Marked for Review' },
];

const EMPTY_STATUS_COUNTS: Record<QuestionStatus, number> = {
  answered: 0,
  'not-answered': 0,
  'not-visited': 0,
  marked: 0,
  'answered-marked': 0,
};

function StatusSwatch({ status, size = 'sm', children }: { status: QuestionStatus; size?: 'sm' | 'md'; children: ReactNode }) {
  const dims = size === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs';
  return (
    <span className={['relative flex shrink-0 items-center justify-center font-bold', dims, SHAPE_CLASSES[status]].join(' ')}>
      {children}
      {status === 'answered-marked' && (
        <span
          className={[
            'absolute flex items-center justify-center rounded-full bg-success-500 text-white ring-2 ring-white',
            size === 'sm' ? '-bottom-0.5 -right-0.5 size-2.5' : '-bottom-1 -right-1 size-3.5',
          ].join(' ')}
        >
          <Check className={size === 'sm' ? 'size-1.5' : 'size-2'} strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
}

export default function QuestionSidebar({
  questions,
  answers,
  unsyncedAnswers,
  visitedQuestions,
  markedForReview,
  activeQuestionIndex,
  selectedTestName,
  onNavigate,
  onSubmitClick,
  onExitClick,
}: QuestionSidebarProps) {

  const questionStatuses = questions.map((q) => getStatus(!!answers[q._id], visitedQuestions.has(q._id), markedForReview.has(q._id)));
  const statusCounts = questionStatuses.reduce(
    (counts, status) => ({ ...counts, [status]: counts[status] + 1 }),
    EMPTY_STATUS_COUNTS
  );

  const questionGroups: { label: string | null; items: number[] }[] = [];
  questions.forEach((q, idx) => {
    const label = q.part || null;
    const lastGroup = questionGroups[questionGroups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(idx);
    } else {
      questionGroups.push({ label, items: [idx] });
    }
  });

  // On phones and tablets the palette opens as a bottom sheet instead of pushing the question down.
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    sheetCloseRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen]);

  const answeredTotal = statusCounts.answered + statusCounts['answered-marked'];

  const legend = (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.status} className={['flex items-center gap-2', item.status === 'answered-marked' ? 'col-span-2' : ''].join(' ')}>
          <StatusSwatch status={item.status} size="sm">
            {statusCounts[item.status]}
          </StatusSwatch>
          <span className="text-[11px] font-medium leading-tight text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );

  const palette = (
    <div className="scrollbar-thin flex flex-col gap-4 overflow-y-auto lg:max-h-[420px]">
      {questionGroups.map((group, groupIdx) => (
        <div key={groupIdx}>
          {group.label && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2.5 lg:grid-cols-5 2xl:grid-cols-6">
            {group.items.map((idx) => {
              const q = questions[idx];
              const isActive = idx === activeQuestionIndex;
              const isAnswered = !!answers[q._id];
              const isUnsynced = isAnswered && unsyncedAnswers[q._id] !== undefined;
              const status = questionStatuses[idx];

              return (
                <button
                  key={q._id}
                  onClick={() => {
                    onNavigate(idx);
                    setSheetOpen(false);
                  }}
                  aria-current={isActive}
                  aria-label={`Question ${idx + 1}, ${status.replace('-', ' ')}`}
                  className={[
                    'flex justify-center rounded-md p-0.5 transition-transform hover:scale-105',
                    isActive ? 'scale-105 ring-2 ring-brand-500 ring-offset-1' : '',
                    isUnsynced ? 'animate-pulse' : '',
                  ].join(' ')}
                >
                  <StatusSwatch status={status} size="md">
                    {idx + 1}
                  </StatusSwatch>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const exitButton = (
    <button
      onClick={onExitClick}
      className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <ArrowLeft className="size-3.5" /> Exit to tests
    </button>
  );

  const submitButton = (
    <button
      onClick={onSubmitClick}
      className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-soft-sm transition-colors hover:bg-brand-700"
    >
      <Send className="size-4" /> Submit test
    </button>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="scrollbar-thin hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 lg:flex xl:w-80 2xl:w-96">
        {legend}
        {exitButton}
        {palette}
        {submitButton}
      </aside>

      {/* Phones / tablets: sticky bar + bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button
          onClick={() => setSheetOpen(true)}
          aria-label={`Question palette, ${answeredTotal} of ${questions.length} answered`}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <LayoutGrid className="size-4" /> Questions
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
            {answeredTotal}/{questions.length}
          </span>
        </button>
        <div className="flex-1 [&>button]:w-full">{submitButton}</div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={`${selectedTestName} question palette`}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-4 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Question palette</p>
              <button
                ref={sheetCloseRef}
                onClick={() => setSheetOpen(false)}
                aria-label="Close question palette"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            {legend}
            <div className="min-h-0 flex-1 overflow-y-auto">{palette}</div>
            {exitButton}
          </div>
        </div>
      )}
    </>
  );
}
