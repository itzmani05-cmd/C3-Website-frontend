import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { Input } from '../ui/Field';
import Modal from '../ui/Modal';

const CONFIRM_WORD = 'DELETE';

interface DeleteAllDialogProps {
  open: boolean;
  topicName: string;
  count: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** One confirmation for deleting every question in a topic: says exactly what goes, and asks to type DELETE. */
export default function DeleteAllDialog({ open, topicName, count, deleting, onCancel, onConfirm }: DeleteAllDialogProps) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const ready = typed.trim() === CONFIRM_WORD && !deleting;
  const noun = `${count} question${count === 1 ? '' : 's'}`;

  return (
    <Modal
      open={open}
      onClose={() => !deleting && onCancel()}
      size="sm"
      showCloseButton={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!ready} loading={deleting} icon={<Trash2 className="size-4" />} onClick={onConfirm}>
            Delete {noun}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger-600">
          <Trash2 className="size-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Delete all questions?</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This permanently deletes <strong className="text-slate-800">{noun}</strong> from <strong className="text-slate-800">{topicName}</strong>. This can&rsquo;t be undone.
        </p>

        <div className="mt-5 w-full text-left">
          <Input
            autoFocus
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ready) onConfirm();
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
