import { ArrowLeft, Calendar, CheckCircle2, Info, Trophy, TriangleAlert, XCircle } from 'lucide-react';
import QuestionRenderer from '../QuestionRenderer';
import type { ExamQuestion, OptionKey } from '../../types/models';

// Multi-select/numerical questions aren't answerable through the current single-choice exam UI yet;
// this keeps the string comparisons below from crashing on their non-string correct_answer.
const correctAnswerAsString = (value: unknown): string => (typeof value === 'string' ? value : '');

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
    } else if (studentAns.trim().toLowerCase() === correctAnswerAsString(q.correct_answer).trim().toLowerCase()) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const percentageNum = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const percentage = percentageNum.toFixed(2);
  const tier =
    percentageNum >= 90
      ? { label: 'Excellent', className: 'bg-success-500/20 text-success-100' }
      : percentageNum >= 70
        ? { label: 'Good', className: 'bg-white/20 text-white' }
        : percentageNum >= 50
          ? { label: 'Fair', className: 'bg-warning-500/25 text-amber-100' }
          : { label: 'Needs Improvement', className: 'bg-danger-500/25 text-red-100' };

  const correctPct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const wrongPct = totalQuestions > 0 ? (wrongCount / totalQuestions) * 100 : 0;
  const unansweredPct = totalQuestions > 0 ? (unansweredCount / totalQuestions) * 100 : 0;

  const scrollToQuestion = (idx: number) => {
    document.getElementById(`result-question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          {/* Left: score summary + navigator */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="relative bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 text-center text-white">
                <button
                  onClick={onBackToExams}
                  aria-label="Back to exams"
                  className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>

                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  <Trophy className="size-3.5" /> Assessment Completed
                </div>
                <h2 className="font-heading flex items-center justify-center gap-2 text-xl font-bold">
                  <Trophy className="size-5 text-amber-300" /> {selectedTestName}
                </h2>
                <p className="mt-1 text-sm text-white/80">{studentEmail}</p>

                <div className="mt-6">
                  <div className="font-heading text-5xl font-extrabold">{percentage}%</div>
                  <div className="mt-1 text-sm text-white/80">
                    {correctCount} / {totalQuestions} Correct
                  </div>
                  <span className={['mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold', tier.className].join(' ')}>{tier.label}</span>
                </div>

                {totalQuestions > 0 && (
                  <div className="mx-auto mt-6 flex h-2 max-w-sm overflow-hidden rounded-full bg-white/15">
                    {correctPct > 0 && <div className="h-full bg-success-400" style={{ width: `${correctPct}%` }} />}
                    {wrongPct > 0 && <div className="h-full bg-danger-400" style={{ width: `${wrongPct}%` }} />}
                    {unansweredPct > 0 && <div className="h-full bg-white/40" style={{ width: `${unansweredPct}%` }} />}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
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

                <button
                  onClick={onBackToExams}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <ArrowLeft className="size-4" /> Return to Exams List
                </button>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Jump to question</p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, idx) => {
                    const qId = q._id.toString();
                    const studentAns = answers[qId];
                    const isCorrect = !!studentAns && studentAns.trim().toLowerCase() === correctAnswerAsString(q.correct_answer).trim().toLowerCase();
                    const navTone = !studentAns
                      ? 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      : isCorrect
                        ? 'bg-success-soft text-success-600 border-success-500/30 hover:bg-success-soft/70'
                        : 'bg-danger-soft text-danger-600 border-danger-500/30 hover:bg-danger-soft/70';
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => scrollToQuestion(idx)}
                        className={['flex size-8 items-center justify-center rounded-lg border text-xs font-bold transition-colors', navTone].join(' ')}
                        aria-label={`Jump to question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: detailed question review */}
          <div>
            {questions.length > 0 && (
              <>
                <h3 className="font-heading mb-4 text-lg font-bold text-slate-900">Detailed Question Review</h3>
                <div className="flex flex-col gap-4">
                  {questions.map((q, idx) => {
                    const qId = q._id.toString();
                    const studentAns = answers[qId];
                    const isCorrect = !!studentAns && studentAns.trim().toLowerCase() === correctAnswerAsString(q.correct_answer).trim().toLowerCase();
                    const status: 'unanswered' | 'correct' | 'incorrect' = !studentAns ? 'unanswered' : isCorrect ? 'correct' : 'incorrect';

                    const cardBorder = status === 'correct' ? 'border-success-500/30' : status === 'incorrect' ? 'border-danger-500/30' : 'border-slate-200';

                    return (
                      <div id={`result-question-${idx}`} key={qId} className={['scroll-mt-6 rounded-2xl border bg-white p-5', cardBorder].join(' ')}>
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

                            const isThisCorrect = key === correctAnswerAsString(q.correct_answer).toLowerCase().trim();
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
              </>
            )}
          </div>
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
