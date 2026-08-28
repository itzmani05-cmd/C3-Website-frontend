import { ArrowLeft, Check, Send, TriangleAlert, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
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

// Flat top, angled bottom converging to a point — the "shield" badge shape used for
// Answered / Not Answered, matching the exam-portal reference the sidebar is modeled on.
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
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const questionStatuses = questions.map((q) => getStatus(!!answers[q._id], visitedQuestions.has(q._id), markedForReview.has(q._id)));
  const statusCounts = questionStatuses.reduce(
    (counts, status) => ({ ...counts, [status]: counts[status] + 1 }),
    EMPTY_STATUS_COUNTS
  );

  return (
    <aside className="scrollbar-thin flex w-full flex-col gap-4 overflow-y-auto border-b border-slate-200 bg-white p-4 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-l xl:w-80 2xl:w-96">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className={['flex items-center gap-2', item.status === 'answered-marked' ? 'col-span-2' : ''].join(' ')}>
            <StatusSwatch status={item.status} size="sm">
              {statusCounts[item.status]}
            </StatusSwatch>
            <span className="text-[11px] font-semibold leading-tight text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onExitClick}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
      >
        <ArrowLeft className="size-3.5" /> Exit to Exams List
      </button>

      <div className="scrollbar-thin max-h-64 overflow-y-auto lg:max-h-[420px]">
        <div className="grid grid-cols-6 gap-2.5 lg:grid-cols-5 2xl:grid-cols-6">
          {questions.map((q, idx) => {
            const isActive = idx === activeQuestionIndex;
            const isAnswered = !!answers[q._id];
            const isUnsynced = isAnswered && unsyncedAnswers[q._id] !== undefined;
            const status = questionStatuses[idx];

            return (
              <button
                key={q._id}
                onClick={() => onNavigate(idx)}
                aria-current={isActive}
                aria-label={`Question ${idx + 1}, ${status.replace('-', ' ')}`}
                className={[
                  'transition-transform hover:scale-105',
                  isActive ? 'scale-105' : '',
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

      <button
        onClick={onSubmitClick}
        className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-[0_10px_20px_-8px_rgba(79,70,229,0.55)] transition-colors hover:bg-brand-700"
      >
        <Send className="size-4" /> Submit Exam
      </button>
    </aside>
  );
}
