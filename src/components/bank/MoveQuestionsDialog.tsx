import { useEffect, useState } from 'react';
import { MoveRight } from 'lucide-react';
import Button from '../ui/Button';
import { Select } from '../ui/Field';
import Modal from '../ui/Modal';
import type { CurriculumTree } from '../../types/models';

export type MoveEnd = { unitId: string } | { topicId: string };

type Kind = 'unit' | 'topic';

interface MoveQuestionsDialogProps {
  open: boolean;
  curriculum: CurriculumTree;
  /** Question count per topic id. */
  counts: Record<string, number>;
  /** Topic the dialog starts on as the source. */
  initialTopicId: string;
  moving: boolean;
  onCancel: () => void;
  onConfirm: (from: MoveEnd, to: MoveEnd) => void;
}

interface EndState {
  kind: Kind;
  unitId: string;
  topicId: string;
}

const segment = (active: boolean) =>
  [
    'flex-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
    active ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
  ].join(' ');

/** One end of the move: a unit, or a topic inside a unit. */
function EndPicker({
  title,
  value,
  onChange,
  curriculum,
  disabled,
  unitSuffix,
}: {
  title: string;
  value: EndState;
  onChange: (next: EndState) => void;
  curriculum: CurriculumTree;
  disabled: boolean;
  unitSuffix?: (unitId: string) => string;
}) {
  const topics = curriculum.find((u) => u._id === value.unitId)?.topics ?? [];
  const setUnit = (unitId: string) => onChange({ ...value, unitId, topicId: curriculum.find((u) => u._id === unitId)?.topics[0]?._id ?? '' });
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <div className="flex w-40 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button type="button" disabled={disabled} className={segment(value.kind === 'unit')} onClick={() => onChange({ ...value, kind: 'unit' })}>
            Unit
          </button>
          <button type="button" disabled={disabled} className={segment(value.kind === 'topic')} onClick={() => onChange({ ...value, kind: 'topic' })}>
            Topic
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Select aria-label={`${title} unit`} value={value.unitId} disabled={disabled} onChange={(e) => setUnit(e.target.value)}>
          {curriculum.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
              {unitSuffix ? ` ${unitSuffix(u._id)}` : ''}
            </option>
          ))}
        </Select>
        {value.kind === 'topic' && (
          <Select aria-label={`${title} topic`} value={value.topicId} disabled={disabled || topics.length === 0} onChange={(e) => onChange({ ...value, topicId: e.target.value })}>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}

/** Moves questions from a unit or a topic to a unit or a topic (unit→unit, unit→topic, topic→unit, topic→topic). */
export default function MoveQuestionsDialog({ open, curriculum, counts, initialTopicId, moving, onCancel, onConfirm }: MoveQuestionsDialogProps) {
  const [from, setFrom] = useState<EndState>({ kind: 'topic', unitId: '', topicId: '' });
  const [to, setTo] = useState<EndState>({ kind: 'unit', unitId: '', topicId: '' });

  useEffect(() => {
    if (!open) return;
    const fromUnit = curriculum.find((u) => u.topics.some((t) => t._id === initialTopicId)) ?? curriculum[0];
    const toUnit = curriculum.find((u) => u._id !== fromUnit?._id) ?? fromUnit;
    setFrom({ kind: 'topic', unitId: fromUnit?._id ?? '', topicId: fromUnit?.topics.some((t) => t._id === initialTopicId) ? initialTopicId : fromUnit?.topics[0]?._id ?? '' });
    setTo({ kind: 'unit', unitId: toUnit?._id ?? '', topicId: toUnit?.topics[0]?._id ?? '' });
  }, [open, curriculum, initialTopicId]);

  const unitCount = (id: string) => (curriculum.find((u) => u._id === id)?.topics ?? []).reduce((sum, t) => sum + (counts[t._id] ?? 0), 0);
  const count = from.kind === 'unit' ? unitCount(from.unitId) : counts[from.topicId] ?? 0;
  const nameOf = (s: EndState) => {
    const unit = curriculum.find((u) => u._id === s.unitId);
    return s.kind === 'unit' ? unit?.name : unit?.topics.find((t) => t._id === s.topicId)?.name;
  };

  let problem = '';
  if (!from.unitId || !to.unitId || (from.kind === 'topic' && !from.topicId) || (to.kind === 'topic' && !to.topicId)) problem = 'Pick where to move from and to.';
  else if (to.kind === 'topic' && from.kind === 'topic' && from.topicId === to.topicId) problem = 'The source and destination topic are the same.';
  else if (to.kind === 'unit' && from.unitId === to.unitId) problem = 'Pick a different unit to move into.';
  else if (count === 0) problem = 'There are no questions to move from the source.';

  const hint =
    to.kind === 'topic'
      ? `All of them go into "${nameOf(to)}".`
      : 'Each goes into the topic of the destination unit with the same name. A topic that does not exist there yet is created.';

  const ready = !problem && !moving;
  const end = (s: EndState): MoveEnd => (s.kind === 'unit' ? { unitId: s.unitId } : { topicId: s.topicId });

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
          <Button disabled={!ready} loading={moving} icon={<MoveRight className="size-4" />} onClick={() => onConfirm(end(from), end(to))}>
            Move {count} question{count === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <h3 className="text-lg font-semibold text-slate-900">Move questions</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">Move everything in a unit or topic into another unit or topic.</p>
      <div className="mt-4 flex flex-col gap-3">
        <EndPicker title="From" value={from} onChange={setFrom} curriculum={curriculum} disabled={moving} unitSuffix={(id) => `(${unitCount(id)})`} />
        <EndPicker title="To" value={to} onChange={setTo} curriculum={curriculum} disabled={moving} />
      </div>
      {problem ? <p className="mt-3 text-xs text-danger-600">{problem}</p> : <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </Modal>
  );
}
