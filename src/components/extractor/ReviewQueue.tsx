import { useRef } from 'react';
import { Pagination, Panel, StatusDot, usePagination } from '../ui';
import Button from '../ui/Button';
import QuestionForm from '../QuestionForm';
import { detectQuestionType } from '../../lib/helpers';
import { useExtractorQueue } from '../../stores/extractorQueueStore';
import type { DraftQuestion } from '../../lib/questionParser';

const PAGE_SIZE = 10;

interface ReviewQueueProps {
  onAddQuestion: () => void;
  onSave: (question: DraftQuestion) => void;
  onSaveAll: () => void;
  saving: boolean;
}

/** Step 3: check each extracted question, then save it or reject it. */
export default function ReviewQueue({ onAddQuestion, onSave, onSaveAll, saving }: ReviewQueueProps) {
  const queue = useExtractorQueue((s) => s.queue);
  const clear = useExtractorQueue((s) => s.clear);
  // Each queued question is a full edit form, so only one page of them is rendered at a time.
  const page = usePagination(queue, PAGE_SIZE);
  const topRef = useRef<HTMLDivElement>(null);

  if (queue.length === 0) return null;

  const goToPage = (next: number) => {
    page.setPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={topRef} className="scroll-mt-4">
      <Panel
        step={3}
        title="Review queue"
        description={`${queue.length} ${queue.length === 1 ? 'question' : 'questions'} extracted. Check each one, then save.`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={clear} className="text-danger-600 hover:bg-danger-50">
              Clear queue
            </Button>
            <Button variant="secondary" size="sm" onClick={onAddQuestion}>
              Add question
            </Button>
            <Button size="sm" onClick={onSaveAll} loading={saving}>
              Save all
            </Button>
          </>
        }
        bodyClassName="flex flex-col gap-4 bg-slate-50/60"
      >
        {page.pageItems.map((q, idx) => (
          <ReviewCard key={q.id} question={q} number={page.startIndex + idx + 1} onSave={() => onSave(q)} />
        ))}
        <Pagination page={page.page} totalPages={page.totalPages} totalItems={page.totalItems} pageSize={page.pageSize} onPageChange={goToPage} className="py-0" />
      </Panel>
    </div>
  );
}

const STATUS_LABEL: Record<DraftQuestion['status'], string> = { APPROVED: 'Accepted', REJECTED: 'Rejected', PENDING: 'Pending' };
const STATUS_TONE = { APPROVED: 'success', REJECTED: 'danger', PENDING: 'neutral' } as const;
const TAG = 'rounded-md bg-white px-2.5 py-1 font-medium text-slate-700 ring-1 ring-inset ring-slate-300';

function ReviewCard({ question: q, number, onSave }: { question: DraftQuestion; number: number; onSave: () => void }) {
  const update = useExtractorQueue((s) => s.update);
  const remove = useExtractorQueue((s) => s.remove);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900 px-2 font-heading text-lg font-bold tabular-nums text-white">
          {String(number).padStart(2, '0')}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">
          <span className="rounded-md bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20">
            {q.questionType ?? detectQuestionType(q.question)}
          </span>
          {(q.marksValue || (q.part && q.section)) && (
            <span className={TAG}>
              {q.marksValue ?? 1} mark{(q.marksValue ?? 1) === 1 ? '' : 's'}
            </span>
          )}
          {q.destination?.label && (
            <span className={TAG}>
              {q.destination.mode === 'test' ? 'Test' : 'Topic'}: {q.destination.label}
            </span>
          )}
          {q.part && q.section && (
            <span className={TAG}>
              {q.part} · {q.section}
            </span>
          )}
        </div>
        <StatusDot tone={STATUS_TONE[q.status]}>{STATUS_LABEL[q.status]}</StatusDot>
      </div>
      <div className="p-4">
        <QuestionForm question={q} onChange={(updated) => update(q.id, updated)} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <Button size="sm" variant="ghost" onClick={() => remove([q.id])} className="text-danger-600 hover:bg-danger-50">
          Delete
        </Button>
        <Button size="sm" variant="dangerOutline" onClick={() => update(q.id, { status: 'REJECTED' })}>
          Reject
        </Button>
        <Button size="sm" onClick={onSave}>
          Save &amp; accept
        </Button>
      </div>
    </div>
  );
}
