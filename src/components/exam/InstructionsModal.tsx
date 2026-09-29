import type { ReactNode } from 'react';
import { Clock, FileText, ListChecks, TriangleAlert } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { AvailableTest } from '../../types/models';

interface InstructionsModalProps {
  test: AvailableTest;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatFraction = (f: number) => {
  const known: Record<string, string> = { '0.25': '¼', '0.33': '⅓', '0.5': '½', '0.67': '⅔', '0.75': '¾', '1': 'all' };
  return known[f.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')] ?? `${Math.round(f * 100)}%`;
};

export default function InstructionsModal({ test, onConfirm, onCancel }: InstructionsModalProps) {
  const negative = test.negativeMarkFractions || [];
  const negativeText =
    negative.length === 0
      ? 'No negative marking.'
      : negative.length === 1
        ? `A wrong answer to a single-answer question loses ${formatFraction(negative[0])} of that question's marks. Multiple-answer and numerical questions have no negative marking.`
        : 'Some sections deduct marks for wrong single-answer questions. Multiple-answer and numerical questions have no negative marking.';

  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      title={test.name}
      footer={
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Not Yet
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            Start Test Now
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Fact icon={<Clock className="size-4" />} label="Duration" value={`${test.durationMinutes} min`} />
        <Fact icon={<FileText className="size-4" />} label="Questions" value={String(test.questionCount)} />
        <Fact icon={<ListChecks className="size-4" />} label="Total marks" value={String(test.totalMarks)} />
      </div>

      <ul className="mt-5 flex list-disc flex-col gap-2 pl-5 text-sm text-slate-600">
        <li>
          <strong className="text-slate-800">The timer starts as soon as you press "Start Test Now"</strong> and keeps running even if you
          close the page or lose connection.
        </li>
        <li>When time runs out, your test is submitted automatically.</li>
        <li>Your answers are saved as you go. If you get disconnected, they sync when you are back online.</li>
        <li>Questions marked "select all that apply" need every correct option ticked to score.</li>
        <li>{negativeText}</li>
        <li>Open the test in one browser tab only.</li>
      </ul>

      <div className="mt-5 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-xs font-semibold text-warning-text">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        Make sure you have {test.durationMinutes} minutes free before you start.
      </div>
    </Modal>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {icon} {label}
      </span>
      <strong className="text-lg font-bold text-slate-900">{value}</strong>
    </div>
  );
}
