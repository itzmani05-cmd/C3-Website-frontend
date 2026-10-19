import { useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, FileEdit, FileText, LogOut, PlayCircle } from 'lucide-react';
import InstructionsModal from './InstructionsModal';
import AppFooter from '../ui/AppFooter';
import type { AvailableTest } from '../../types/models';

interface TestSelectionPageProps {
  availableTests: AvailableTest[];
  studentName: string;
  onStartExam: (testId: string, testName: string) => void;
  onLogout: () => void;
}

export default function TestSelectionPage({ availableTests, studentName, onStartExam, onLogout }: TestSelectionPageProps) {
  const [pendingTest, setPendingTest] = useState<AvailableTest | null>(null);

  const handleOpen = (test: AvailableTest) => {
    if (test.submitted || test.inProgress) onStartExam(test._id, test.name);
    else setPendingTest(test);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 bg-ink-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-white">
              <img src="/C3AppLogo-128.png" alt="" className="size-6 object-contain" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-heading text-sm font-bold text-white">C³ Institute</p>
              <p className="truncate text-[11px] text-slate-400">Exam portal</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 border-b border-slate-200 pb-5 sm:mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Your tests</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome, {studentName}. Choose a test to begin or review your results.</p>
        </div>

        {availableTests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {availableTests.map((test) => (
              <div key={test._id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-soft-sm transition-shadow hover:shadow-soft-md sm:p-6">
                <div>
                  {test.submitted ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-600/20">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  ) : test.inProgress ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft/60 px-2 py-0.5 text-xs font-medium text-warning-text ring-1 ring-inset ring-warning-500/30">
                      <PlayCircle className="size-3" /> In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">
                      <FileEdit className="size-3" /> Exam
                    </span>
                  )}
                  <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">{test.name}</h3>
                  {!test.submitted && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" /> {test.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3.5" /> {test.questionCount} questions
                      </span>
                    </div>
                  )}
                  {test.submitted && (
                    <p className="mt-2 text-sm text-slate-500">
                      You scored <strong className="text-slate-700">{test.percentage}%</strong> (
                      {test.score}/{test.maxScore && test.maxScore > 0 ? test.maxScore : test.totalQuestions} marks). You can review your detailed scorecard and
                      explanation keys.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleOpen(test)}
                  className={[
                    'mt-5 flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
                    test.submitted ? 'border border-slate-300 bg-white text-slate-700 shadow-soft-sm hover:bg-slate-50' : 'bg-brand-600 text-white shadow-soft-sm hover:bg-brand-700',
                  ].join(' ')}
                >
                  {test.submitted ? 'View Result' : test.inProgress ? 'Resume Test' : 'Start Assessment'} <ChevronRight className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <FileText className="mx-auto mb-3 size-8 text-slate-300" />
            <h3 className="font-semibold text-slate-700">No tests yet</h3>
            <p className="mt-1 text-sm text-slate-500">There are no tests available right now. Please check back later.</p>
          </div>
        )}
      </main>

      <AppFooter area="Exam portal" help="Trouble signing in or starting a test? Contact your institute admin." />

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
