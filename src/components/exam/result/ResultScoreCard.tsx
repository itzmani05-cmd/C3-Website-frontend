import type { ReactNode } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Trophy, TriangleAlert, XCircle } from 'lucide-react';

export interface ResultTally {
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
}

interface ResultScoreCardProps {
  testName: string;
  studentEmail: string;
  tally: ResultTally;
  /** Marks scored and available; without them the score is the share of correct answers. */
  score?: number | null;
  maxScore?: number | null;
  submittedAt: string | null;
  onBack: () => void;
}

const tierFor = (pct: number) =>
  pct >= 90
    ? { label: 'Excellent', className: 'bg-success-500/20 text-success-100' }
    : pct >= 70
      ? { label: 'Good', className: 'bg-white/20 text-white' }
      : pct >= 50
        ? { label: 'Fair', className: 'bg-warning-500/25 text-amber-100' }
        : { label: 'Needs Improvement', className: 'bg-danger-500/25 text-red-100' };

/** The headline result: percentage, tier, a correct / wrong / unanswered bar and the counts. */
export default function ResultScoreCard({ testName, studentEmail, tally, score, maxScore, submittedAt, onBack }: ResultScoreCardProps) {
  const { correct, wrong, unanswered, total } = tally;
  const weighted = typeof score === 'number' && typeof maxScore === 'number' && maxScore > 0;
  const pct = weighted ? (score / maxScore) * 100 : total > 0 ? (correct / total) * 100 : 0;
  const scoreLabel = weighted ? `${score} / ${maxScore} marks` : `${correct} / ${total} Correct`;
  const tier = tierFor(pct);
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="relative bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 text-center text-white">
        <button
          onClick={onBack}
          aria-label="Back to exams"
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          <Trophy className="size-3.5" /> Assessment Completed
        </div>
        <h2 className="font-heading flex items-center justify-center gap-2 text-xl font-bold">{testName}</h2>
        <p className="mt-1 text-sm text-white/80">{studentEmail}</p>

        <div className="mt-6">
          <div className="font-heading text-5xl font-extrabold">{pct.toFixed(2)}%</div>
          <div className="mt-1 text-sm text-white/80">{scoreLabel}</div>
          <span className={['mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold', tier.className].join(' ')}>{tier.label}</span>
        </div>

        {total > 0 && (
          <div className="mx-auto mt-6 flex h-2 max-w-sm overflow-hidden rounded-full bg-white/15">
            {correct > 0 && <div className="h-full bg-success-400" style={{ width: `${share(correct)}%` }} />}
            {wrong > 0 && <div className="h-full bg-danger-400" style={{ width: `${share(wrong)}%` }} />}
            {unanswered > 0 && <div className="h-full bg-white/40" style={{ width: `${share(unanswered)}%` }} />}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-3">
          <StatPill icon={<CheckCircle2 className="size-4" />} label="Correct" value={correct} tone="success" />
          <StatPill icon={<XCircle className="size-4" />} label="Incorrect" value={wrong} tone="danger" />
          <StatPill icon={<TriangleAlert className="size-4" />} label="Unanswered" value={unanswered} tone="neutral" />
          <StatPill
            icon={<Calendar className="size-4" />}
            label="Submitted"
            value={(submittedAt ? new Date(submittedAt) : new Date()).toLocaleDateString()}
            tone="brand"
          />
        </div>

        <button
          onClick={onBack}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <ArrowLeft className="size-4" /> Return to Exams List
        </button>
      </div>
    </div>
  );
}

const PILL_TONES = {
  success: 'bg-success-soft text-success-600',
  danger: 'bg-danger-soft text-danger-600',
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-100 text-brand-700',
};

function StatPill({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: keyof typeof PILL_TONES }) {
  return (
    <div className={['flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-center', PILL_TONES[tone]].join(' ')}>
      <span className="flex items-center gap-1 text-xs font-semibold">
        {icon} {label}
      </span>
      <strong className="text-base font-bold">{value}</strong>
    </div>
  );
}
