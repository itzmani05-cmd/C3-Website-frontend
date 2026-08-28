import { Bookmark, ChevronLeft, ChevronRight, Eraser } from 'lucide-react';
import QuestionRenderer from '../QuestionRenderer';
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-5 sm:p-8 2xl:max-w-4xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{question.type}</span>
          <button
            onClick={onToggleMarkForReview}
            aria-pressed={isMarkedForReview}
            className={[
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
              isMarkedForReview ? 'border-accent-600 bg-accent-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-accent-500 hover:text-accent-600',
            ].join(' ')}
          >
            <Bookmark className="size-3.5" fill={isMarkedForReview ? 'currentColor' : 'none'} />
            {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <QuestionRenderer question={question} />

        {question.questionImage && (
          <div className="mt-4">
            <img src={question.questionImage} alt={`Question ${questionIndex + 1}`} className="max-h-72 rounded-lg border border-slate-100 object-contain" />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {Object.entries(question.options || {}).map(([key, text]) => {
            const isSelected = selectedAnswer === key;
            const optionImage = question.optionImages?.[key as keyof typeof question.optionImages];

            return (
              <div
                key={key}
                onClick={() => onSelectOption(question._id, key)}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors',
                  isSelected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {key.toUpperCase()}
                </div>
                <div className="flex-1 text-sm text-slate-800">
                  {text}
                  {optionImage && <img src={optionImage} alt={`Option ${key}`} className="mt-2 max-h-40 rounded-md border border-slate-100" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          disabled={questionIndex === 0}
          onClick={onPrev}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-4" /> Previous
        </button>

        {selectedAnswer && (
          <button
            onClick={() => onClearSelection(question._id)}
            className="flex items-center gap-1.5 rounded-lg border border-danger-200 px-4 py-2.5 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-50"
          >
            <Eraser className="size-4" /> Clear Answer
          </button>
        )}

        <button
          disabled={questionIndex === totalQuestions - 1}
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next Question <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
