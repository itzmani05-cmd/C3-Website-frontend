import { LogOut } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmModal({ onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Stay in Exam
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            Yes, Exit
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <LogOut className="mb-4 size-11 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900">Exit to Exams List?</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your exam is not submitted yet. Your answers are saved, and the timer keeps running in the background — you can resume this exam later.
        </p>
      </div>
    </Modal>
  );
}
