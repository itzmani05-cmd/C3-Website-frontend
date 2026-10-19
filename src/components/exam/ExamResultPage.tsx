import AppFooter from '../ui/AppFooter';
import ResultScoreCard from './result/ResultScoreCard';
import type { ResultTally } from './result/ResultScoreCard';
import ResultQuestionCard from './result/ResultQuestionCard';
import type { AnswerStatus } from './result/ResultQuestionCard';
import { isAnswerCorrect } from '../../lib/grading';
import type { ExamQuestion } from '../../types/models';

interface ExamResultPageProps {
  selectedTestName: string;
  studentEmail: string;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  submittedAt: string | null;
  score?: number | null;
  maxScore?: number | null;
  onBackToExams: () => void;
}

const JUMP_TONES: Record<AnswerStatus, string> = {
  unanswered: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
  correct: 'bg-success-soft text-success-600 border-success-500/30 hover:bg-success-soft/70',
  incorrect: 'bg-danger-soft text-danger-600 border-danger-500/30 hover:bg-danger-soft/70',
};

/** A student's submitted test: the score card, a question jump grid and every question reviewed. */
export default function ExamResultPage({ selectedTestName, studentEmail, questions, answers, submittedAt, score, maxScore, onBackToExams }: ExamResultPageProps) {
  const reviewed = questions.map((question) => {
    const answer = answers[question._id.toString()];
    const status: AnswerStatus = !answer ? 'unanswered' : isAnswerCorrect(question, answer) ? 'correct' : 'incorrect';
    return { question, answer, status };
  });
  const count = (status: AnswerStatus) => reviewed.filter((r) => r.status === status).length;
  const tally: ResultTally = { correct: count('correct'), wrong: count('incorrect'), unanswered: count('unanswered'), total: questions.length };

  const jumpTo = (idx: number) => document.getElementById(`result-question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div data-no-anchor className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="flex flex-col gap-6 lg:sticky lg:top-8">
            <ResultScoreCard
              testName={selectedTestName}
              studentEmail={studentEmail}
              tally={tally}
              score={score}
              maxScore={maxScore}
              submittedAt={submittedAt}
              onBack={onBackToExams}
            />

            {reviewed.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Jump to question</p>
                <div className="flex flex-wrap gap-2">
                  {reviewed.map(({ question, status }, idx) => (
                    <button
                      key={question._id}
                      type="button"
                      onClick={() => jumpTo(idx)}
                      className={['flex size-8 items-center justify-center rounded-lg border text-xs font-bold transition-colors', JUMP_TONES[status]].join(' ')}
                      aria-label={`Jump to question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {reviewed.length > 0 && (
              <>
                <h3 className="font-heading mb-4 text-lg font-bold text-slate-900">Detailed Question Review</h3>
                <div className="flex flex-col gap-4">
                  {reviewed.map(({ question, answer, status }, idx) => (
                    <ResultQuestionCard key={question._id} question={question} index={idx} total={reviewed.length} answer={answer} status={status} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <AppFooter area="Exam portal" help="Questions about your result? Contact your institute admin." containerClassName="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" />
    </div>
  );
}
