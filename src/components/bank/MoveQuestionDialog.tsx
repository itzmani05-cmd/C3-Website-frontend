import { useEffect, useState } from 'react';
import { MoveRight } from 'lucide-react';
import Button from '../ui/Button';
import { Select } from '../ui/Field';
import Modal from '../ui/Modal';
import type { CurriculumTree } from '../../types/models';

interface MoveQuestionDialogProps {
  open: boolean;
  curriculum: CurriculumTree;
  /** Topic the question is in now. */
  currentTopicId: string;
  moving: boolean;
  onCancel: () => void;
  onConfirm: (topicId: string) => void;
}

/** Picks the unit and topic a question should be moved to. */
export default function MoveQuestionDialog({ open, curriculum, currentTopicId, moving, onCancel, onConfirm }: MoveQuestionDialogProps) {
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');

  useEffect(() => {
    if (!open) return;
    const unit = curriculum.find((u) => u.topics.some((t) => t._id === currentTopicId)) ?? curriculum[0];
    setUnitId(unit?._id ?? '');
    setTopicId(currentTopicId);
  }, [open, curriculum, currentTopicId]);

  const topics = curriculum.find((u) => u._id === unitId)?.topics ?? [];
  const unchanged = topicId === currentTopicId;

  const handleUnitChange = (id: string) => {
    setUnitId(id);
    setTopicId(curriculum.find((u) => u._id === id)?.topics[0]?._id ?? '');
  };

  return (
    <Modal
      open={open}
      onClose={() => !moving && onCancel()}
      size="sm"
      showCloseButton={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={moving}>
            Cancel
          </Button>
          <Button disabled={!topicId || unchanged} loading={moving} icon={<MoveRight className="size-4" />} onClick={() => onConfirm(topicId)}>
            Move question
          </Button>
        </>
      }
    >
      <h3 className="text-lg font-semibold text-slate-900">Move to another unit</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">The question is removed from this topic and added to the one you pick.</p>
      <div className="mt-5 flex flex-col gap-3">
        <Select label="Unit" value={unitId} disabled={moving} onChange={(e) => handleUnitChange(e.target.value)}>
          {curriculum.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select label="Topic" value={topicId} disabled={moving || topics.length === 0} onChange={(e) => setTopicId(e.target.value)}>
          {topics.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
              {t._id === currentTopicId ? ' (current)' : ''}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
