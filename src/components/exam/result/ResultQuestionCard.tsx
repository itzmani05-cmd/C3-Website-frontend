import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';
import QuestionRenderer from '../../QuestionRenderer';
import MathText from '../../ui/MathText';
import { toOptionKeys } from '../../../lib/grading';
import { getImagePreview } from '../../../lib/helpers';
import type { ExamQuestion, OptionKey } from '../../../types/models';

export type AnswerStatus = 'correct' | 'incorrect' | 'unanswered';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

const STATUS = {
  correct: { border: 'border-success-500/30', badge: 'bg-success-soft text-success-600', label: 'Correct', Icon: CheckCircle2 },
  incorrect: { border: 'border-danger-500/30', badge: 'bg-danger-soft text-danger-600', label: 'Incorrect', Icon: XCircle },
  unanswered: { border: 'border-slate-200', badge: 'bg-slate-100 text-slate-500', label: 'Unanswered', Icon: TriangleAlert },
};

interface ResultQuestionCardProps {
  question: ExamQuestion;
  index: number;
  total: number;
  answer: string | undefined;
  status: AnswerStatus;
}

/** One question of the student's result: their answer against the correct one, and the explanation. */
export default function ResultQuestionCard({ question: q, index, total, answer, status }: ResultQuestionCardProps) {
  const { border, badge, label, Icon } = STATUS[status];

  return (
    <div id={`result-question-${index}`} className={['scroll-mt-6 rounded-2xl border bg-white p-5', border].join(' ')}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">
          Question {index + 1} of {total}
        </span>
        <span className={['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', badge].join(' ')}>
          <Icon className="size-3.5" />
          {label}
        </span>
      </div>

      <div className="mb-3">
        <QuestionRenderer question={q} />
        {q.questionImage && <img loading="lazy" decoding="async" src={getImagePreview(q.questionImage) ?? undefined} alt={`Question ${index + 1}`} className="mt-2 max-h-64 rounded-lg border border-slate-100" />}
      </div>

      <div className="flex flex-col gap-2">
        {q.answerType === 'numerical' ? <NumericalAnswer question={q} answer={answer} correct={status === 'correct'} /> : <OptionRows question={q} answer={answer} />}
      </div>

      {(q.explanation || q.explanationImage) && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3.5">
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Info className="size-3.5" /> Explanation:
          </h4>
          {q.explanation && <p className="text-sm text-slate-600"><MathText>{q.explanation}</MathText></p>}
          {q.explanationImage && <img loading="lazy" decoding="async" src={getImagePreview(q.explanationImage) ?? undefined} alt="Explanation Media" className="mt-2 max-h-64 rounded-lg" />}
        </div>
      )}
    </div>
  );
}

function NumericalAnswer({ question, answer, correct }: { question: ExamQuestion; answer: string | undefined; correct: boolean }) {
  const tone = answer ? (correct ? 'border-success-500/40 bg-success-soft/40 text-success-700' : 'border-danger-500/40 bg-danger-soft/40 text-danger-700') : 'border-slate-200 text-slate-500';
  return (
    <>
      <div className={['flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm', tone].join(' ')}>
        <span className="font-semibold">Your Answer:</span> {answer || 'Not answered'}
      </div>
      {!correct && (
        <div className="flex items-center gap-2 rounded-lg border border-success-500/40 bg-success-soft/40 px-3 py-2.5 text-sm text-success-700">
          <span className="font-semibold">Correct Answer:</span> {String(question.correct_answer ?? '')}
        </div>
      )}
    </>
  );
}

function OptionRows({ question: q, answer }: { question: ExamQuestion; answer: string | undefined }) {
  const correctKeys = toOptionKeys(q.correct_answer);
  const chosenKeys = toOptionKeys(answer);

  return (
    <>
      {OPTION_KEYS.map((key) => {
        const text = q.options?.[key];
        const image = q.optionImages?.[key];
        if (!text && !image) return null;

        const isCorrect = correctKeys.includes(key);
        const isChosen = chosenKeys.includes(key);
        const tag = isCorrect && isChosen ? 'Your Choice & Correct' : isCorrect ? 'Correct Answer' : isChosen ? 'Your Choice' : null;
        const rowClass = isCorrect ? 'border-success-500/40 bg-success-soft/40' : isChosen ? 'border-danger-500/40 bg-danger-soft/40' : 'border-slate-200';

        return (
          <div key={key} className={['flex items-start gap-3 rounded-lg border px-3 py-2.5', rowClass].join(' ')}>
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">{key.toUpperCase()}</div>
            <div className="flex-1">
              {text && <p className="text-sm text-slate-700"><MathText>{text}</MathText></p>}
              {image && <img loading="lazy" decoding="async" src={getImagePreview(image) ?? undefined} alt={`Option ${key.toUpperCase()}`} className="mt-1.5 max-h-32 rounded-md border border-slate-100" />}
            </div>
            {tag && (
              <span className={['flex shrink-0 items-center gap-1 text-xs font-semibold', isCorrect ? 'text-success-600' : 'text-danger-600'].join(' ')}>
                {isCorrect ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {tag}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
