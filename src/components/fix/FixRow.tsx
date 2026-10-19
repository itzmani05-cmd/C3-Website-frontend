import { memo, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Image as ImageIcon, Pencil } from 'lucide-react';
import { formatCorrectAnswerLabel } from '../../lib/helpers';
import type { BankQuestion } from '../../lib/bank';
import QuestionForm from '../QuestionForm';
import type { QuestionFormValue } from '../QuestionForm';
import QuestionPreview from '../bank/QuestionPreview';
import Button from '../ui/Button';
import Card from '../ui/Card';
import QuestionRenderer from '../QuestionRenderer';

export interface FixableQuestion extends QuestionFormValue {
  _id: string;
  correctAnswer?: string;
  part?: string;
  section?: string;
  marks?: number;
}

const TYPE_LABEL: Record<string, string> = { single: 'MCQ', multiple: 'MSQ', numerical: 'NAT' };
const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold';

interface FixRowProps {
  q: FixableQuestion;
  number: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, draft: FixableQuestion) => Promise<boolean>;
  onDelete: (id: string) => void;
  /** False when the list already shows the question's part and section as a heading above it. */
  showPlacement?: boolean;
}

/** One question in the Question Fixer: a full-text row that expands to a preview, with an Edit button that opens the form. */
function FixRow({ q, number, expanded, onToggle, onSave, onDelete, showPlacement = true }: FixRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FixableQuestion>(q);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expanded) setEditing(false);
  }, [expanded]);

  const hasImage = !!(q.questionImage || q.explanationImage || Object.values(q.optionImages ?? {}).some(Boolean));
  const panelId = `qf-panel-${q._id}`;

  const startEdit = () => {
    setDraft(q);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(q._id, draft);
    } finally {
      setSaving(false);
    }
  };

  // Up/Down arrows move between rows without tabbing through every badge.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      onToggle(q._id);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const all = Array.from(document.querySelectorAll<HTMLElement>('[data-fix-row-toggle]'));
    const next = all[all.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-soft-md">
      <div
        role="button"
        tabIndex={0}
        data-fix-row-toggle
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onToggle(q._id)}
        onKeyDown={handleKeyDown}
        className="flex w-full cursor-pointer flex-col gap-2 bg-slate-50 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 md:flex-row md:items-start md:justify-between md:gap-4"
      >
        <span className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="shrink-0 font-bold text-brand-600">{number}.</span>
          <div className="min-w-0 flex-1 break-words text-slate-700">
            <QuestionRenderer question={{ question: q.question || '' }} />
          </div>
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5 md:pt-0.5">
          {showPlacement && q.part && (
            <span className={[pill, 'bg-slate-100 text-slate-500'].join(' ')}>
              {q.part}
              {q.section ? ` · ${q.section}` : ''} · {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? '' : 's'}
            </span>
          )}
          {q.answerType && <span className={[pill, 'bg-slate-200/70 text-slate-600'].join(' ')}>{TYPE_LABEL[q.answerType] ?? q.answerType}</span>}
          {hasImage && <ImageIcon className="size-4 text-slate-400" aria-label="Has images" />}
          <span className="ml-1 flex items-center text-slate-400">{expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}</span>
        </span>
      </div>

      {expanded && (
        <div id={panelId} role="region" aria-label={`Question ${number}`} className="border-t border-slate-100 p-6">
          {editing ? (
            <>
              <QuestionForm question={draft} onChange={setDraft} variant="fixer" />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={save} loading={saving}>
                  Save Changes
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="danger" className="ml-auto" onClick={() => onDelete(q._id)} disabled={saving}>
                  Delete Question
                </Button>
              </div>
            </>
          ) : (
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview</p>
                <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={startEdit}>
                  Edit
                </Button>
              </div>
              <QuestionPreview question={q as unknown as BankQuestion} hideQuestion />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default memo(FixRow);
