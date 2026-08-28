import { CheckCircle2, ChevronRight, FileEdit, LogOut } from 'lucide-react';
import type { AvailableTest } from '../../types/models';

interface TestSelectionPageProps {
  availableTests: AvailableTest[];
  studentEmail: string;
  onStartExam: (testId: string, testName: string) => void;
  onLogout: () => void;
}

export default function TestSelectionPage({ availableTests, studentEmail, onStartExam, onLogout }: TestSelectionPageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <img src="/C3AppLogo.png" alt="C³" className="h-[30px] object-contain" />
          <h2 className="text-base font-bold text-slate-900">C³ Assessment</h2>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <LogOut className="size-4" /> Sign Out
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 xl:max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Active Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome, {studentEmail}. Please select a test to begin your examination.</p>
        </div>

        {availableTests.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {availableTests.map((test) => (
              <div key={test._id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-soft-sm">
                <div>
                  {test.submitted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-600">
                      <CheckCircle2 className="size-3" /> Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                      <FileEdit className="size-3" /> Exam
                    </span>
                  )}
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{test.name}</h3>
                  {test.submitted && (
                    <p className="mt-2 text-sm text-slate-500">
                      You scored <strong className="text-slate-700">{test.percentage}%</strong> ({test.score}/{test.totalQuestions} correct). You can review your
                      detailed scorecard and explanation keys.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onStartExam(test._id, test.name)}
                  className={[
                    'mt-5 flex items-center justify-center gap-1.5 rounded-lg py-3 text-sm font-bold transition-colors',
                    test.submitted ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-brand-600 text-white hover:bg-brand-700',
                  ].join(' ')}
                >
                  {test.submitted ? 'View Result' : 'Start Assessment'} <ChevronRight className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <h3 className="font-semibold text-slate-700">No Exams Configured</h3>
            <p className="mt-1 text-sm text-slate-400">There are currently no active tests as of now. Please check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
