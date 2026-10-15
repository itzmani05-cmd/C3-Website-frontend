import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDot, Clock, FileText, LogOut, MinusCircle, Award } from 'lucide-react';
import InstructionsModal from './InstructionsModal';
import Badge from '../ui/Badge';
import type { AvailableTest } from '../../types/models';

interface TestSelectionPageProps {
  availableTests: AvailableTest[];
  studentName: string;
  onStartExam: (testId: string, testName: string) => void;
  onLogout: () => void;
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.trim().slice(0, 2) || '?').toUpperCase();
};

const negativeMarkingLabel = (fractions: number[]) => {
  const values = [...new Set((fractions || []).filter((f) => f > 0))];
  if (values.length === 0) return 'No negative marking';
  if (values.length > 1) return 'Negative marking varies by section';
  return `−${Math.round(values[0] * 100) / 100} per wrong answer`;
};

export default function TestSelectionPage({ availableTests, studentName, onStartExam, onLogout }: TestSelectionPageProps) {
  const [pendingTest, setPendingTest] = useState<AvailableTest | null>(null);

  const handleOpen = (test: AvailableTest) => {
    if (test.submitted || test.inProgress) onStartExam(test._id, test.name);
    else setPendingTest(test);
  };

  const completed = availableTests.filter((t) => t.submitted).length;
  const inProgress = availableTests.filter((t) => t.inProgress && !t.submitted).length;
  const notStarted = availableTests.length - completed - inProgress;
  const firstName = studentName.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/C3AppLogo-128.png" alt="" className="size-7 object-contain" />
            <span className="text-sm font-semibold text-slate-900">C³ Exam Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                {initialsOf(studentName)}
              </span>
              <span className="max-w-[12rem] truncate text-sm font-medium text-slate-700">{studentName}</span>
            </div>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Welcome, {firstName}</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a test to begin. Your answers are saved as you go.</p>
          </div>
          {availableTests.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">
                <strong className="font-semibold text-slate-900">{notStarted}</strong> not started
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">
                <strong className="font-semibold text-slate-900">{inProgress}</strong> in progress
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">
                <strong className="font-semibold text-slate-900">{completed}</strong> completed
              </span>
            </div>
          )}
        </div>

        {availableTests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableTests.map((test) => {
              const maxScore = test.maxScore && test.maxScore > 0 ? test.maxScore : test.totalQuestions;
              return (
                <div
                  key={test._id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-soft-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-snug text-slate-900">{test.name}</h3>
                    {test.submitted ? (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" /> Completed
                      </Badge>
                    ) : test.inProgress ? (
                      <Badge variant="warning">
                        <CircleDot className="size-3" /> In progress
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Not started</Badge>
                    )}
                  </div>

                  {test.submitted ? (
                    <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium text-slate-500">Your score</p>
                      <p className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-slate-900">{test.percentage}%</span>
                        <span className="text-sm tabular-nums text-slate-500">
                          {test.score} / {maxScore} marks
                        </span>
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-success-500" style={{ width: `${Math.min(Math.max(test.percentage ?? 0, 0), 100)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="size-4 text-slate-400" />
                        <dt className="sr-only">Duration</dt>
                        <dd>{test.durationMinutes} min</dd>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="size-4 text-slate-400" />
                        <dt className="sr-only">Questions</dt>
                        <dd>{test.questionCount} questions</dd>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Award className="size-4 text-slate-400" />
                        <dt className="sr-only">Total marks</dt>
                        <dd>{test.totalMarks} marks</dd>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-slate-600">
                        <MinusCircle className="size-4 text-slate-400" />
                        <dt className="sr-only">Negative marking</dt>
                        <dd>{negativeMarkingLabel(test.negativeMarkFractions)}</dd>
                      </div>
                    </dl>
                  )}

                  <button
                    onClick={() => handleOpen(test)}
                    className={[
                      'mt-5 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                      test.submitted
                        ? 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
                    ].join(' ')}
                  >
                    {test.submitted ? 'View result' : test.inProgress ? 'Resume test' : 'Start test'}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <FileText className="mx-auto size-8 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">No tests available yet</h3>
            <p className="mt-1 text-sm text-slate-500">Your institute hasn’t published a test for you. Please check back later.</p>
          </div>
        )}
      </main>

      {pendingTest && (
        <InstructionsModal
          test={pendingTest}
          onCancel={() => setPendingTest(null)}
          onConfirm={() => {
            const test = pendingTest;
            setPendingTest(null);
            onStartExam(test._id, test.name);
          }}
        />
      )}
    </div>
  );
}
