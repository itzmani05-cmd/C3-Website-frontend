import { Bookmark, ChevronLeft, ChevronRight, Eraser, TriangleAlert } from 'lucide-react';
import QuestionRenderer from '../QuestionRenderer';
import MathText from '../ui/MathText';
import { toOptionKeys } from '../../lib/grading';
import type { ExamQuestion } from '../../types/models';

interface QuestionCardProps {
  question: ExamQuestion | undefined;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer: string | undefined;
  isMarkedForReview: boolean;
  onSelectOption: (questionId: string, optionLetter: string) => void;
  onClearSelection: (questionId: string) => void;
  onToggleMarkForReview: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  isMarkedForReview,
  onSelectOption,
  onClearSelection,
  onToggleMarkForReview,
  onPrev,
  onNext,
}: QuestionCardProps) {
  if (!question) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900">No Questions Available</h2>
          <p className="mt-1 text-sm text-slate-500">No questions have been configured or published for this exam session.</p>
        </div>
      </div>
    );
  }

  const isMultiple = question.answerType === 'multiple';
  const selectedKeys = toOptionKeys(selectedAnswer);

  const handleOptionClick = (key: string) => {
    if (!isMultiple) {
      onSelectOption(question._id, key);
      return;
    }
    const next = selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key].sort();
    if (next.length === 0) onClearSelection(question._id);
    else onSelectOption(question._id, next.join(','));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:gap-5 sm:p-8 2xl:max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          {question.part && (
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">
              {question.part}
              {question.section ? ` · ${question.section}` : ''}
            </span>
          )}
          {typeof question.marks === 'number' && (
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
              {question.marks} mark{question.marks === 1 ? '' : 's'}
            </span>
          )}
          {!!question.negativeMarks && (
            <span className="flex items-center gap-1 rounded-md bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700 ring-1 ring-inset ring-danger-600/20">
              <TriangleAlert className="size-3" /> −{question.negativeMarks} for a wrong answer
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">{question.type}</span>
          <button
            onClick={onToggleMarkForReview}
            aria-pressed={isMarkedForReview}
            className={[
              'flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors',
              isMarkedForReview ? 'border-accent-600 bg-accent-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-accent-500 hover:text-accent-600',
            ].join(' ')}
          >
            <Bookmark className="size-3.5" fill={isMarkedForReview ? 'currentColor' : 'none'} />
            {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft-sm sm:p-6">
        <QuestionRenderer question={question} />

        {question.questionImage && (
          <div className="mt-4">
            <img loading="lazy" decoding="async" src={question.questionImage} alt={`Question ${questionIndex + 1}`} className="max-h-72 rounded-lg border border-slate-100 object-contain" />
          </div>
        )}

        {question.answerType === 'numerical' ? (
          <div className="mt-5">
            <label htmlFor={`numerical-answer-${question._id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Enter your answer
            </label>
            <input
              id={`numerical-answer-${question._id}`}
              type="text"
              inputMode="decimal"
              value={selectedAnswer ?? ''}
              onChange={(e) => onSelectOption(question._id, e.target.value)}
              placeholder="Type a numeric value"
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 shadow-soft-sm outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2.5">
            {isMultiple && <p className="text-xs font-semibold text-brand-700">More than one answer may be correct — select all that apply.</p>}
            {Object.entries(question.options || {}).map(([key, text]) => {
              const isSelected = isMultiple ? selectedKeys.includes(key) : selectedAnswer === key;
              const optionImage = question.optionImages?.[key as keyof typeof question.optionImages];

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleOptionClick(key)}
                  role={isMultiple ? 'checkbox' : 'radio'}
                  aria-checked={isSelected}
                  className={[
                    'flex min-h-12 w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors sm:px-4',
                    isSelected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex size-7 shrink-0 items-center justify-center text-xs font-bold',
                      isMultiple ? 'rounded-md' : 'rounded-full',
                      isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {key.toUpperCase()}
                  </div>
                  <div className="flex-1 text-sm text-slate-800">
                    <MathText>{text}</MathText>
                    {optionImage && <img loading="lazy" decoding="async" src={optionImage} alt={`Option ${key}`} className="mt-2 max-h-40 rounded-md border border-slate-100" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-lg:sticky max-lg:bottom-[4.75rem] max-lg:z-20 max-sm:-mx-4 max-lg:border-t max-lg:border-slate-200 max-lg:bg-slate-50/95 max-lg:px-4 max-lg:py-2 max-lg:backdrop-blur flex items-center justify-between gap-2 sm:gap-3">
        <button
          disabled={questionIndex === 0}
          onClick={onPrev}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
        </button>

        {selectedAnswer && (
          <button
            onClick={() => onClearSelection(question._id)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50 sm:px-4"
          >
            <Eraser className="size-4" /> Clear<span className="hidden sm:inline"> answer</span>
          </button>
        )}

        <button
          disabled={questionIndex === totalQuestions - 1}
          onClick={onNext}
          className="ml-auto flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-soft-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          Next<span className="hidden sm:inline"> question</span> <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
