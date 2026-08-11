import { ArrowLeft, CheckCircle2, Send, TriangleAlert } from 'lucide-react';
import type { ExamQuestion } from '../../types/models';

interface QuestionSidebarProps {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  unsyncedAnswers: Record<string, string | null>;
  activeQuestionIndex: number;
  onNavigate: (index: number) => void;
  onSubmitClick: () => void;
  onBackToExams: () => void;
}

export default function QuestionSidebar({
  questions,
  answers,
  unsyncedAnswers,
  activeQuestionIndex,
  onNavigate,
  onSubmitClick,
  onBackToExams,
}: QuestionSidebarProps) {
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <aside className="flex w-full flex-col gap-4 border-b border-slate-200 bg-white p-4 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-success-500/20 bg-success-soft px-3 py-3 text-center">
          <span className="block text-2xl font-extrabold text-success-600">{answeredCount}</span>
          <label className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-success-600">
            <CheckCircle2 className="size-3" /> Answered
          </label>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <span className="block text-2xl font-extrabold text-slate-600">{unansweredCount}</span>
          <label className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500">
            <TriangleAlert className="size-3" /> Remaining
          </label>
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Question Map ({activeQuestionIndex + 1} of {questions.length})
      </div>

      <div className="scrollbar-thin max-h-64 overflow-y-auto lg:max-h-none lg:flex-1">
        <div className="grid grid-cols-6 gap-2 lg:grid-cols-5">
          {questions.map((q, idx) => {
            const isActive = idx === activeQuestionIndex;
            const isAnswered = !!answers[q._id];
            const isUnsynced = isAnswered && unsyncedAnswers[q._id] !== undefined;

            let classes = 'border-slate-200 bg-white text-slate-600 hover:border-brand-300';
            if (isAnswered) {
              classes = isUnsynced
                ? 'border-warning-500/40 bg-warning-soft text-warning-text'
                : 'border-success-500/30 bg-success-soft text-success-600';
            }
            if (isActive) {
              classes = 'border-brand-600 bg-brand-600 text-white';
            }

            return (
              <button
                key={q._id}
                onClick={() => onNavigate(idx)}
                className={['flex size-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors', classes].join(' ')}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onSubmitClick}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white shadow-[0_10px_20px_-8px_rgba(79,70,229,0.55)] transition-colors hover:bg-brand-700"
        >
          <Send className="size-4" /> Submit Exam
        </button>
        <button
          onClick={onBackToExams}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="size-3.5" /> Exit to Exams List
        </button>
      </div>
    </aside>
  );
}
