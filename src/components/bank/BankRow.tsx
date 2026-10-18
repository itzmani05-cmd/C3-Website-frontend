import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, ChevronDown, ChevronUp, FileWarning, Image as ImageIcon, Pencil } from 'lucide-react';
import api from '../../api';
import type { BankQuestion, BankQuestionSummary } from '../../lib/bank';
import Button from '../ui/Button';
import Card from '../ui/Card';
import MathText from '../ui/MathText';
import { Spinner } from '../ui/Spinner';
import { useModal } from '../ui/ModalProvider';
import QuestionEditor from './QuestionEditor';
import QuestionPreview from './QuestionPreview';

const TYPE_LABEL: Record<string, string> = { single: 'MCQ', multiple: 'MSQ', numerical: 'NAT' };

interface BankRowProps {
  q: BankQuestionSummary;
  number: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, draft: BankQuestion) => Promise<boolean>;
  onDelete: (id: string) => void;
}

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold';

function BankRow({ q, number, expanded, onToggle, onSave, onDelete }: BankRowProps) {
  const { showConfirm } = useModal();
  const dirty = useRef(false);
  // Expanding a row only previews it; the editor opens when the edit (pencil) button is clicked.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!expanded) setEditing(false);
  }, [expanded]);

  const hasImage = !!(q.hasQuestionImage || q.hasOptionImages || q.hasExplanationImage);
  // The list leaves the (large) base64 images out. When a question that has images is opened, fetch just those.
  const [images, setImages] = useState<Pick<BankQuestion, 'questionImage' | 'optionImages' | 'explanationImage'> | null>(null);
  useEffect(() => {
    if (!expanded || !hasImage) {
      setImages(null);
      return;
    }
    let cancelled = false;
    api
      .get<BankQuestion>(`/api/question-bank/${q._id}`)
      .then(({ data }) => !cancelled && setImages({ questionImage: data.questionImage, optionImages: data.optionImages, explanationImage: data.explanationImage }))
      .catch(() => !cancelled && setImages({}));
    return () => {
      cancelled = true;
    };
  }, [expanded, hasImage, q._id]);
  const imagesReady = !hasImage || images !== null;
  const view = useMemo<BankQuestion>(() => (images ? { ...q, ...images } : q), [q, images]);

  const confirmDiscard = useCallback(async () => {
    if (!dirty.current) return true;
    return showConfirm('This question has unsaved changes (a draft is kept on this device). Discard them?', {
      title: 'Unsaved changes',
      confirmText: 'Discard',
      variant: 'warning',
    });
  }, [showConfirm]);

  const handleToggle = useCallback(async () => {
    if (expanded && !(await confirmDiscard())) return;
    onToggle(q._id);
  }, [expanded, confirmDiscard, onToggle, q._id]);

  const startEdit = () => {
    if (!expanded) onToggle(q._id);
    setEditing(true);
  };

  const stopEdit = useCallback(async () => {
    if (await confirmDiscard()) setEditing(false);
  }, [confirmDiscard]);

  // Up/Down arrows move between rows without tabbing through every badge.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const all = Array.from(document.querySelectorAll<HTMLElement>('[data-bank-row-toggle]'));
    const next = all[all.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const noExplanation = q.hasExplanation === false && !q.hasExplanationImage;
  const panelId = `qb-panel-${q._id}`;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-soft-md">
      <div className="flex items-stretch bg-slate-50">
        <button
          type="button"
          data-bank-row-toggle
          aria-expanded={expanded}
          aria-controls={panelId}
          title={q.source || undefined}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 md:flex-row md:items-start md:justify-between md:gap-4"
        >
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <span className="shrink-0 font-bold text-brand-600">{number}.</span>
            <span className="relative min-w-0 flex-1 overflow-y-hidden break-words text-sm font-medium text-slate-700">
  <MathText>{q.question || ''}</MathText>
</span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center gap-1.5 md:pt-0.5">
            {q.answerType && <span className={[pill, 'bg-slate-200/70 text-slate-600'].join(' ')}>{TYPE_LABEL[q.answerType] ?? q.answerType}</span>}
            {hasImage && <ImageIcon className="size-4 text-slate-400" aria-label="Has images" />}
            {noExplanation && (
              <span className={[pill, 'bg-warning-soft text-warning-text'].join(' ')} title="No explanation yet">
                <FileWarning className="size-3" /> 
              </span>
            )}
            {q.verified && (
              <span className={[pill, 'bg-success-soft text-success-600'].join(' ')} title={q.updatedBy ? `Verified · last edit by ${q.updatedBy}` : 'Verified'}>
                <BadgeCheck className="size-3" /> Verified
              </span>
            )}
            <span className="ml-1 flex items-center text-slate-400">
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </span>
          </span>
        </button>
       
      </div>

      {expanded && (
        <div id={panelId} role="region" aria-label={`Question ${number}`} className="border-t border-slate-100 p-6">
          {editing && !imagesReady ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Spinner className="size-4" /> Loading question…
            </div>
          ) : editing ? (
            <QuestionEditor
              mode="edit"
              draftKey={q._id}
              initial={view}
              onSave={(draft) => onSave(q._id, draft)}
              onDelete={() => onDelete(q._id)}
              onCancel={stopEdit}
              onDirtyChange={(d) => { dirty.current = d; }}
              footnote={q.updatedBy ? `Last edited by ${q.updatedBy}${q.updatedAt ? ` on ${new Date(q.updatedAt).toLocaleString()}` : ''}` : undefined}
            />
          ) : (
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Preview{q.source ? ` · ${q.source}` : ''}
                  {q.year ? ` · ${q.year}` : ''}
                  {q.marks ? ` · ${q.marks} mark${q.marks === 1 ? '' : 's'}` : ''}
                </p>
                <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={startEdit}>
                  Edit
                </Button>
              </div>
              <QuestionPreview question={view} />
              {hasImage && !imagesReady && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                  <Spinner className="size-3.5" /> Loading images…
                </p>
              )}
              {q.updatedBy && (
                <p className="mt-3 text-xs text-slate-400">
                  Last edited by {q.updatedBy}
                  {q.updatedAt ? ` on ${new Date(q.updatedAt).toLocaleString()}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default memo(BankRow);
