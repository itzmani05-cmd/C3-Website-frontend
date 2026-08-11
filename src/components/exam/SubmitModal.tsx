import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface SubmitModalProps {
  answeredCount: number;
  unansweredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubmitModal({ answeredCount, unansweredCount, onConfirm, onCancel }: SubmitModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            Yes, Submit Exam
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <CircleHelp className="mb-4 size-11 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900">Submit Your Exam?</h2>
        <p className="mt-2 text-sm text-slate-500">
          You are about to submit your exam. Once submitted, you will not be able to change or review any answers.
        </p>

        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-success-soft py-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-success-600">
              <CheckCircle2 className="size-3.5" /> Answered
            </span>
            <strong className="text-xl font-bold text-success-600">{answeredCount}</strong>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <XCircle className="size-3.5" /> Unanswered
            </span>
            <strong className="text-xl font-bold text-slate-600">{unansweredCount}</strong>
          </div>
        </div>
      </div>
    </Modal>
  );
}
