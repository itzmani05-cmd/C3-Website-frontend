import { formatCorrectAnswerLabel } from '../../lib/helpers';
import type { BankQuestion } from '../../lib/bank';
import MathText from '../ui/MathText';

/** Read-only rendering of a question: text, options (correct one highlighted) or numerical answer, and explanation. */
export default function QuestionPreview({ question: shown }: { question: BankQuestion }) {
  const correct = Array.isArray(shown.correct_answer) ? shown.correct_answer : [String(shown.correct_answer ?? '')];
  const numerical = shown.answerType === 'numerical';

  return (
    <>
      <div className="text-sm text-slate-800">
        <MathText>{shown.question || ''}</MathText>
      </div>
      {shown.questionImage && <img src={shown.questionImage} alt="Question figure" className="mt-3 max-h-64 rounded-lg border border-slate-100 object-contain" />}

      {numerical ? (
        <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success-600">
          Answer: {formatCorrectAnswerLabel(shown.correct_answer)}
          {shown.answerMin != null && shown.answerMax != null && shown.answerMin !== shown.answerMax && ` (accepted ${shown.answerMin} – ${shown.answerMax})`}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {(['a', 'b', 'c', 'd'] as const).map((k) => {
            const isCorrect = correct.includes(k);
            return (
              <li key={k} className={['flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm', isCorrect ? 'border-success-500 bg-success-soft/60' : 'border-slate-200'].join(' ')}>
                <span className={['flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', isCorrect ? 'bg-success-600 text-white' : 'bg-slate-100 text-slate-600'].join(' ')}>{k.toUpperCase()}</span>
                <span className="min-w-0">
                  <MathText>{shown.options?.[k] || ''}</MathText>
                  {shown.optionImages?.[k] && <img src={shown.optionImages[k]!} alt={`Option ${k.toUpperCase()}`} className="mt-1.5 max-h-28 rounded-md border border-slate-100" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {(shown.explanation || shown.explanationImage) && (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Explanation</p>
          <MathText>{shown.explanation || ''}</MathText>
          {shown.explanationImage && <img src={shown.explanationImage} alt="Explanation figure" className="mt-2 max-h-64 rounded-lg" />}
        </div>
      )}
    </>
  );
}
