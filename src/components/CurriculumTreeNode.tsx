import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import { Input } from './ui/Field';

type Variant = 'unit' | 'topic';

interface CurriculumTreeNodeProps {
  name: string;
  countLabel: string;
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
}

const VARIANT_STYLES: Record<Variant, { header: string; title: string; badge: string }> = {
  unit: {
    header: 'bg-slate-50 px-5 py-4',
    title: 'text-base font-bold text-slate-900',
    badge: 'bg-black/5 text-slate-500',
  },
  topic: {
    header: 'bg-white px-4 py-3',
    title: 'text-sm font-semibold text-slate-900',
    badge: 'bg-black/[0.04] text-slate-500',
  },
};

export default function CurriculumTreeNode({
  name,
  countLabel,
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
}: CurriculumTreeNodeProps) {
  const styles = VARIANT_STYLES[variant];
  const isUnit = variant === 'unit';

  return (
    <div className={isUnit ? 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft-sm' : 'rounded-xl border border-slate-200/80 bg-white'}>
      <div className={['flex items-center justify-between gap-3', styles.header, expanded ? 'border-b border-slate-100' : ''].join(' ')}>
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
            className="flex size-6 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} wrapperClassName="flex-1" />
              <Button size="sm" onClick={onSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className={styles.title}>{name}</span>
              <span className={['rounded-full px-2 py-0.5 text-[11px] font-semibold', styles.badge].join(' ')}>{countLabel}</span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="secondary" onClick={onStartEdit} aria-label={`Edit ${name}`}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="sm" onClick={onAddChild}>
              {addChildLabel}
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Delete ${name}`}>
              {isUnit ? 'Delete' : <Trash2 className="size-3.5" />}
            </Button>
          </div>
        )}
      </div>

      {expanded && children}
    </div>
  );
}
