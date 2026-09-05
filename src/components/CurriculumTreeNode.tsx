import type { ReactNode } from 'react';
import { BookOpen, ChevronDown, ChevronRight, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import { Input, Select } from './ui/Field';

type Variant = 'unit' | 'topic';

interface CurriculumTreeNodeProps {
  name: string;
  countLabel: string;
  order?: number;
  variant: Variant;
  expanded: boolean;
  onToggleExpand: () => void;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  addChildLabel: string;
  onAddChild: () => void;
  children?: ReactNode;
  // Unit-only: lets the edit row also reassign which exam the unit belongs to.
  examOptions?: { _id: string; name: string }[];
  selectedExamId?: string;
  onExamChange?: (examId: string) => void;
}

const VARIANT_STYLES: Record<
  Variant,
  { header: string; title: string; badge: string; icon: ReactNode; iconWrap: string }
> = {
  unit: {
    header: 'bg-slate-50 px-5 py-4',
    title: 'font-heading text-base font-bold text-slate-900',
    badge: 'bg-black/5 text-slate-500',
    icon: <BookOpen className="size-4" />,
    iconWrap: 'bg-brand-100 text-brand-600',
  },
  topic: {
    header: 'bg-white px-4 py-3',
    title: 'text-sm font-semibold text-slate-900',
    badge: 'bg-black/[0.04] text-slate-500',
    icon: <ListTree className="size-3.5" />,
    iconWrap: 'bg-slate-100 text-slate-500',
  },
};

export default function CurriculumTreeNode({
  name,
  countLabel,
  order,
  variant,
  expanded,
  onToggleExpand,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  addChildLabel,
  onAddChild,
  children,
  examOptions,
  selectedExamId,
  onExamChange,
}: CurriculumTreeNodeProps) {
  const styles = VARIANT_STYLES[variant];
  const isUnit = variant === 'unit';

  return (
    <div
      className={
        isUnit
          ? 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft-sm transition-shadow hover:shadow-soft-md'
          : 'overflow-hidden rounded-xl border border-slate-200/80 bg-white'
      }
    >
      <div className={['flex flex-wrap items-center justify-between gap-3', styles.header, expanded ? 'border-b border-slate-100' : ''].join(' ')}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          <span className={['flex size-8 shrink-0 items-center justify-center rounded-lg', styles.iconWrap].join(' ')}>{styles.icon}</span>

          {isEditing ? (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} wrapperClassName="min-w-[160px] flex-1" autoFocus />
              {examOptions && onExamChange && (
                <Select value={selectedExamId} onChange={(e) => onExamChange(e.target.value)} wrapperClassName="w-48">
                  {examOptions.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.name}
                    </option>
                  ))}
                </Select>
              )}
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <span className={['truncate', styles.title].join(' ')}>{name}</span>
              <span className={['shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', styles.badge].join(' ')}>{countLabel}</span>
              {typeof order === 'number' && (
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Order {order}</span>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="secondary" onClick={onStartEdit} aria-label={`Edit ${name}`}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="sm" onClick={onAddChild} aria-label={addChildLabel}>
              <Plus className="size-3.5" />
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Delete ${name}`}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {expanded && children}
    </div>
  );
}
