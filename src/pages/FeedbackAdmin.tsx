import { useEffect, useState } from 'react';
import { CheckCheck, CircleDot, MessageSquareText, Search, Star, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { Badge, Button, Card, EmptyState, Input, LoadingState, PageLayout, Pagination, SegmentedControl, Select, StatCard, useModal } from '../components/ui';
import { useDebouncedValue, usePageState } from '../hooks/useServerPaging';
import type { Paged } from '../types/models';

const PAGE_SIZE = 10;

type FeedbackStatus = 'open' | 'reviewed';
type StatusFilter = 'all' | FeedbackStatus;

interface FeedbackItem {
  id: string;
  category: string;
  rating: number | null;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  reviewedAt: string | null;
  student: { id: string; name: string; email: string } | null;
}

type FeedbackPage = Paged<FeedbackItem> & { counts: { total: number; open: number; reviewed: number } };

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  suggestion: 'Suggestion',
  content: 'Content issue',
  bug: 'App problem',
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function FeedbackAdmin() {
  const { showConfirm } = useModal();
  const [status, setStatus] = useState<StatusFilter>('open');
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const search = useDebouncedValue(searchTerm.trim());
  const [loadFailed, setLoadFailed] = useState(false);
  const [page, setPage] = usePageState(`${status}|${category}|${search}`);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<FeedbackPage>('/api/feedback', {
        params: { page, pageSize: PAGE_SIZE, status: status === 'all' ? undefined : status, category: category || undefined, search: search || undefined },
      })
      .then((response) => {
        if (cancelled) return;
        setLoadFailed(false);
        setData(response.data);
        if (page > response.data.totalPages) setPage(response.data.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoadFailed(true);
        toast.error('Failed to fetch feedback.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, category, search, reloadKey, setPage]);

  const setReviewed = async (item: FeedbackItem, next: FeedbackStatus) => {
    setBusyId(item.id);
    try {
      await api.patch(`/api/feedback/${item.id}`, { status: next });
      reload();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update feedback.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: FeedbackItem) => {
    const confirmed = await showConfirm('Delete this feedback? This cannot be undone.', {
      title: 'Delete Feedback',
      confirmText: 'Delete',
      variant: 'error',
    });
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await api.delete(`/api/feedback/${item.id}`);
      toast.success('Feedback deleted.');
      reload();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete feedback.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = data?.counts;
  const filtered = status !== 'all' || !!category || !!search;

  return (
    <PageLayout icon={MessageSquareText} title="Student Feedback" subtitle="Messages students send from the mobile app.">
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard icon={<MessageSquareText />} value={counts?.total ?? 0} label="Total" tone="neutral" />
        <StatCard icon={<CircleDot />} value={counts?.open ?? 0} label="New" tone="warning" />
        <StatCard icon={<CheckCheck />} value={counts?.reviewed ?? 0} label="Reviewed" tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} wrapperClassName="w-full sm:w-48">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Search feedback"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search message, name or email"
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="min-w-56 flex-1 sm:max-w-sm"
        />
      </div>

      {loading && !data ? (
        <LoadingState message="Loading feedback..." />
      ) : loadFailed && !data ? (
        <EmptyState
          icon={<MessageSquareText className="size-8" />}
          title="Couldn't load feedback"
          description="Check your connection and try again."
          action={<Button onClick={reload}>Try again</Button>}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="size-8" />}
          title={filtered ? 'No matching feedback' : 'No feedback yet'}
          description={filtered ? 'Try a different status, category or search.' : 'When students send feedback from the app, it appears here.'}
        />
      ) : (
        <div className={['flex flex-col gap-3', loading ? 'opacity-60' : ''].join(' ')}>
          {data.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.student?.name || 'Deleted student'}</p>
                  <p className="truncate text-xs text-slate-500">{item.student?.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="neutral">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                  {item.rating !== null && (
                    <Badge variant="warning">
                      <Star className="size-3 fill-current" /> {item.rating}/5
                    </Badge>
                  )}
                  <Badge variant={item.status === 'open' ? 'brand' : 'success'}>{item.status === 'open' ? 'New' : 'Reviewed'}</Badge>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{item.message}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                <div className="flex items-center gap-2">
                  {item.status === 'open' ? (
                    <Button size="sm" variant="secondary" icon={<CheckCheck className="size-4" />} loading={busyId === item.id} onClick={() => setReviewed(item, 'reviewed')}>
                      Mark reviewed
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} loading={busyId === item.id} onClick={() => setReviewed(item, 'open')}>
                      Reopen
                    </Button>
                  )}
                  <Button size="sm" variant="dangerOutline" icon={<Trash2 className="size-4" />} disabled={busyId === item.id} onClick={() => remove(item)} aria-label="Delete feedback" />
                </div>
              </div>
            </Card>
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} totalItems={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </PageLayout>
  );
}
