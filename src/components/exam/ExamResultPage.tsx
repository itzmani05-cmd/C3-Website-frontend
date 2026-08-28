import { ArrowLeft, Calendar, CheckCircle2, Info, Trophy, TriangleAlert, XCircle } from 'lucide-react';
import QuestionRenderer from '../QuestionRenderer';
import type { ExamQuestion, OptionKey } from '../../types/models';

interface ExamResultPageProps {
  selectedTestName: string;
  studentEmail: string;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  submittedAt: string | null;
  onBackToExams: () => void;
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

export default function ExamResultPage({ selectedTestName, studentEmail, questions, answers, submittedAt, onBackToExams }: ExamResultPageProps) {
  const totalQuestions = questions.length;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const qId = q._id.toString();
    const studentAns = answers[qId];
    if (!studentAns) {
      unansweredCount++;
    } else if (studentAns.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase()) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] xl:max-w-5xl">
        <div className="rounded-t-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 text-center text-white">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            <Trophy className="size-3.5" /> Assessment Completed
          </div>
          <h2 className="flex items-center justify-center gap-2 text-xl font-bold">
            <Trophy className="size-5 text-amber-300" /> {selectedTestName}
          </h2>
          <p className="mt-1 text-sm text-white/80">{studentEmail}</p>

          <div className="mt-6">
            <div className="text-5xl font-extrabold">{percentage}%</div>
            <div className="mt-1 text-sm text-white/80">
              {correctCount} / {totalQuestions} Correct
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill icon={<CheckCircle2 className="size-4" />} label="Corrects" value={correctCount} tone="success" />
            <StatPill icon={<XCircle className="size-4" />} label="Incorrect" value={wrongCount} tone="danger" />
            <StatPill icon={<TriangleAlert className="size-4" />} label="Unanswered" value={unansweredCount} tone="neutral" />
            <StatPill
              icon={<Calendar className="size-4" />}
              label="Submitted"
              value={submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString()}
              tone="brand"
            />
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onBackToExams}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <ArrowLeft className="size-4" /> Return to Exams List
            </button>
          </div>

          {questions.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Detailed Question Review</h3>
              <div className="flex flex-col gap-4">
                {questions.map((q, idx) => {
                  const qId = q._id.toString();
                  const studentAns = answers[qId];
                  const isCorrect = !!studentAns && studentAns.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();
                  const status: 'unanswered' | 'correct' | 'incorrect' = !studentAns ? 'unanswered' : isCorrect ? 'correct' : 'incorrect';

                  const cardBorder = status === 'correct' ? 'border-success-500/30' : status === 'incorrect' ? 'border-danger-500/30' : 'border-slate-200';

                  return (
                    <div key={qId} className={['rounded-2xl border bg-white p-5', cardBorder].join(' ')}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">
                          Question {idx + 1} of {totalQuestions}
                        </span>
                        <span
                          className={[
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                            status === 'correct' ? 'bg-success-soft text-success-600' : status === 'incorrect' ? 'bg-danger-soft text-danger-600' : 'bg-slate-100 text-slate-500',
                          ].join(' ')}
                        >
                          {isCorrect ? <CheckCircle2 className="size-3.5" /> : studentAns ? <XCircle className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                          {status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Unanswered'}
                        </span>
                      </div>

                      <div className="mb-3">
                        <QuestionRenderer question={q} />
                        {q.questionImage && <img src={q.questionImage} alt={`Question ${idx + 1}`} className="mt-2 max-h-64 rounded-lg border border-slate-100" />}
                      </div>

                      <div className="flex flex-col gap-2">
                        {OPTION_KEYS.map((key) => {
                          const optText = q.options?.[key];
                          const optImg = q.optionImages?.[key];
                          if (!optText && !optImg) return null;

                          const isThisCorrect = !!q.correct_answer && key === q.correct_answer.toLowerCase().trim();
                          const isThisStudentChoice = !!studentAns && key === studentAns.toLowerCase().trim();

                          let rowClass = 'border-slate-200';
                          let tag: string | null = null;
                          if (isThisCorrect && isThisStudentChoice) {
                            rowClass = 'border-success-500/40 bg-success-soft/40';
                            tag = 'Your Choice & Correct';
                          } else if (isThisCorrect) {
                            rowClass = 'border-success-500/40 bg-success-soft/40';
                            tag = 'Correct Answer';
                          } else if (isThisStudentChoice) {
                            rowClass = 'border-danger-500/40 bg-danger-soft/40';
                            tag = 'Your Choice';
                          }

                          return (
                            <div key={key} className={['flex items-start gap-3 rounded-lg border px-3 py-2.5', rowClass].join(' ')}>
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                                {key.toUpperCase()}
                              </div>
                              <div className="flex-1">
                                {optText && <p className="text-sm text-slate-700">{optText}</p>}
                                {optImg && <img src={optImg} alt={`Option ${key.toUpperCase()}`} className="mt-1.5 max-h-32 rounded-md border border-slate-100" />}
                              </div>
                              {tag && (
                                <span className={['flex shrink-0 items-center gap-1 text-xs font-semibold', isThisCorrect ? 'text-success-600' : 'text-danger-600'].join(' ')}>
                                  {isThisCorrect ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                                  {tag}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          Your Answer:{' '}
                          <strong className={isCorrect ? 'text-success-600' : studentAns ? 'text-danger-600' : 'text-slate-400'}>
                            {studentAns ? studentAns.toUpperCase() : 'Unanswered'}
                          </strong>
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          Correct Answer: <strong className="text-success-600">{q.correct_answer ? q.correct_answer.toUpperCase() : 'N/A'}</strong>
                        </span>
                        <span
                          className={[
                            'rounded-full px-2.5 py-1 font-bold',
                            status === 'correct' ? 'bg-success-soft text-success-600' : 'bg-danger-soft text-danger-600',
                          ].join(' ')}
                        >
                          {isCorrect ? '✓ +1 Mark' : '✗ 0 Marks'}
                        </span>
                      </div>

                      {(q.explanation || q.explanationImage) && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3.5">
                          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <Info className="size-3.5" /> Explanation:
                          </h4>
                          {q.explanation && <p className="text-sm text-slate-600">{q.explanation}</p>}
                          {q.explanationImage && <img src={q.explanationImage} alt="Explanation Media" className="mt-2 max-h-64 rounded-lg" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: 'success' | 'danger' | 'neutral' | 'brand' }) {
  const toneClasses: Record<string, string> = {
    success: 'bg-success-soft text-success-600',
    danger: 'bg-danger-soft text-danger-600',
    neutral: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-100 text-brand-700',
  };
  return (
    <div className={['flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-center', toneClasses[tone]].join(' ')}>
      <span className="flex items-center gap-1 text-xs font-semibold">
        {icon} {label}
      </span>
      <strong className="text-base font-bold">{value}</strong>
    </div>
  );
}
