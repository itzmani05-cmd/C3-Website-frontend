import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api';
import { buildPayload, errorMessage, filtersToParams, hasActiveFilters, validateQuestion } from '../../lib/bank';
import type { BankFilters, BankQuestion, BankQuestionSummary, QuestionPage, Scope } from '../../lib/bank';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useModal } from '../ui/ModalProvider';
import Pagination from '../ui/Pagination';
import BankRow from './BankRow';

export const PAGE_SIZE = 20;

interface QuestionListProps {
  scope: Scope;
  filters: BankFilters;
  page: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  /** Bump to force a reload (e.g. after a question was added elsewhere). */
  refreshKey: number;
  /** Called after anything that changes counts (add/delete) so the sidebar can refresh. */
  onMutated: () => void;
  onTotal?: (total: number) => void;
  onAdd?: () => void;
}

const SKELETON_ROWS = 6;

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="h-4 w-8 rounded bg-slate-200" />
          <div className="h-4 flex-1 rounded bg-slate-200" style={{ maxWidth: `${55 + ((i * 13) % 35)}%` }} />
          <div className="ml-auto hidden h-5 w-24 rounded-full bg-slate-200 md:block" />
        </div>
      ))}
    </div>
  );
}

export default function QuestionList({ scope, filters, page, onPageChange, onClearFilters, refreshKey, onMutated, onTotal, onAdd }: QuestionListProps) {
  const { showConfirm } = useModal();

  const [items, setItems] = useState<BankQuestionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const params = useMemo(() => filtersToParams(filters), [filters]);
  const scopeKey = JSON.stringify(scope);
  const queryKey = JSON.stringify([scope, params]);

  // A different topic is a different list altogether: show the skeleton rather than the old rows.
  useEffect(() => {
    setLoaded(false);
    setItems([]);
  }, [scopeKey]);

  // One page at a time from the server. A newer request (fast typing or paging) makes older responses stale, and the
  // previous page stays visible (dimmed) while the next one loads.
  useEffect(() => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    api
      .get<QuestionPage>('/api/question-bank', { params: { ...scope, ...params, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (requestId !== latestRequest.current) return;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError('');
        setLoaded(true);
        onTotal?.(data.total);
        if (data.page !== page) onPageChange(data.page); // server clamps, e.g. after deleting the last item of the last page
      })
      .catch((e) => requestId === latestRequest.current && setError(errorMessage(e)))
      .finally(() => requestId === latestRequest.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page, refreshKey, reload]);

  useEffect(() => setExpandedId(null), [queryKey, page]);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
    onMutated();
  }, [onMutated]);

  // Stable callbacks for the memoised rows: they always call the latest handlers without changing identity.
  const handlers = useRef({} as Record<string, (...args: any[]) => any>);
  handlers.current.save = async (id: string, draft: BankQuestion) => {
    const problem = validateQuestion(draft);
    if (problem) {
      toast.warning(problem);
      return false;
    }
    try {
      await api.put(`/api/question-bank/${id}`, buildPayload(draft));
      toast.success('Question saved');
      setExpandedId(null);
      refresh();
      return true;
    } catch (e) {
      toast.error('Error saving question: ' + errorMessage(e));
      return false;
    }
  };
  handlers.current.remove = async (id: string) => {
    const ok = await showConfirm('Are you sure you want to delete this question?', { title: 'Delete Question', confirmText: 'Delete', variant: 'error' });
    if (!ok) return;
    try {
      await api.delete(`/api/question-bank/${id}`);
      toast.success('Question deleted');
      setExpandedId(null);
      refresh();
    } catch (e) {
      toast.error('Error deleting question: ' + errorMessage(e));
    }
  };

  const onToggle = useCallback((id: string) => setExpandedId((cur) => (cur === id ? null : id)), []);
  const onSave = useCallback((id: string, draft: BankQuestion) => handlers.current.save(id, draft) as Promise<boolean>, []);
  const onDelete = useCallback((id: string) => handlers.current.remove(id), []);

  if (!loaded && loading) return <Skeleton />;
  if (error && !loaded) {
    return <EmptyState icon={<SearchX className="size-8" />} title="Could not load questions" description={error} action={<Button variant="secondary" onClick={() => setReload((n) => n + 1)}>Try again</Button>} />;
  }

  if (loaded && total === 0) {
    return hasActiveFilters(filters) ? (
      <EmptyState icon={<SearchX className="size-8" />} title="No questions match these filters." description="Try removing a filter or searching for something else." action={<Button variant="secondary" onClick={onClearFilters}>Clear filters</Button>} />
    ) : (
      <EmptyState
        title="No questions here yet."
        description="Add a question to start building this topic's question set."
        action={onAdd && <Button icon={<Plus className="size-4" />} onClick={onAdd}>Add question</Button>}
      />
    );
  }

  return (
    <div aria-busy={loading} className={['flex flex-col gap-4 transition-opacity', loading ? 'opacity-60' : ''].join(' ')}>
      {items.map((q, idx) => (
        <BankRow
          key={q._id}
          q={q}
          number={(page - 1) * PAGE_SIZE + idx + 1}
          expanded={expandedId === q._id}
          onToggle={onToggle}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}
      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={onPageChange} />
    </div>
  );
}
