import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, RotateCcw, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { Pagination, useModal } from '../components/ui';
import Badge from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Field';
import StatCard from '../components/ui/StatCard';
import { LoadingState } from '../components/ui/Spinner';
import type { FeedbackCategory, FeedbackItem, FeedbackPage, FeedbackStatus } from '../types/models';

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: 'General',
  suggestion: 'Suggestion',
  content: 'Content',
  bug: 'Problem',
};

const CATEGORY_VARIANTS: Record<FeedbackCategory, BadgeVariant> = {
  general: 'neutral',
  suggestion: 'brand',
  content: 'info',
  bug: 'danger',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={['size-3.5', n <= value ? 'fill-amber-500 text-amber-500' : 'text-slate-300'].join(' ')} />
      ))}
    </span>
  );
}

export default function Feedback() {
  const { showConfirm } = useModal();
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | FeedbackStatus>('');
  const [category, setCategory] = useState<'' | FeedbackCategory>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Wait for a pause in typing before asking the server, and go back to the first page for the new search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      const response = await api.get<FeedbackPage>('/api/feedback', {
        params: { page, pageSize: PAGE_SIZE, status: status || undefined, category: category || undefined, search: search || undefined },
      });
      setData(response.data);
      // The server moves us to the last page when the one we asked for no longer exists (e.g. after a delete).
      if (response.data.page !== page) setPage(response.data.page);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, status, category, search]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = (value: '' | FeedbackStatus) => {
    setStatus(value);
    setPage(1);
  };
  const changeCategory = (value: '' | FeedbackCategory) => {
    setCategory(value);
    setPage(1);
  };

  const setReviewed = async (item: FeedbackItem, next: FeedbackStatus) => {
    setBusyId(item._id);
    try {
      await api.patch(`/api/feedback/${item._id}`, { status: next });
      toast.success(next === 'reviewed' ? 'Marked as reviewed.' : 'Moved back to open.');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating feedback.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: FeedbackItem) => {
    const confirmed = await showConfirm(
      `Delete this feedback from ${item.student.name || item.student.email || 'a student'}?\n\nThis cannot be undone.`,
      { title: 'Delete Feedback', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmed) return;

    setBusyId(item._id);
    try {
      await api.delete(`/api/feedback/${item._id}`);
      toast.success('Feedback deleted.');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting feedback.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = data?.counts;
  const hasFilters = Boolean(status || category || search);
  const items = data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <MessageSquare className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Student Feedback</h1>
            <p className="mt-0.5 text-sm text-slate-500">What students send from the mobile app</p>
          </div>
        </div>
      </div>

      {counts && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<MessageSquare className="size-4" />} value={counts.total} label="Total feedback" />
          <StatCard icon={<MessageSquare className="size-4" />} value={counts.open} label="Open" tone="warning" />
          <StatCard icon={<CheckCircle2 className="size-4" />} value={counts.reviewed} label="Reviewed" tone="success" />
          <StatCard
            icon={<Star className="size-4" />}
            value={data?.rating.average != null ? `${data.rating.average.toFixed(1)} / 5` : '—'}
            label={data?.rating.count ? `Average rating (${data.rating.count})` : 'Average rating'}
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Search message, student name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search feedback"
        />
        <Select value={status} onChange={(e) => changeStatus(e.target.value as '' | FeedbackStatus)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
        </Select>
        <Select value={category} onChange={(e) => changeCategory(e.target.value as '' | FeedbackCategory)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </Select>
      </div>

      {loading && <LoadingState message="Loading feedback..." />}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="size-8" />}
          title={hasFilters ? 'No feedback matches these filters.' : 'No feedback yet.'}
          description={hasFilters ? 'Try a different search or clear the filters.' : 'Feedback students send from the app will appear here.'}
        />
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isOpen = item.status === 'open';
          const initial = (item.student.name || item.student.email || '?').trim().charAt(0).toUpperCase();
          const busy = busyId === item._id;

          return (
            <Card
              key={item._id}
              className={[
                'flex flex-col gap-3 border-l-4 px-5 py-4 transition-shadow hover:shadow-soft-md',
                isOpen ? 'border-l-warning-500' : 'border-l-success-500',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{initial}</div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.student.name || 'Unnamed student'}</span>
                    <Badge variant={CATEGORY_VARIANTS[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                    <Badge variant={isOpen ? 'warning' : 'success'}>{isOpen ? 'Open' : 'Reviewed'}</Badge>
                    {item.rating != null && <Stars value={item.rating} />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{item.student.email}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy}
                    onClick={() => setReviewed(item, isOpen ? 'reviewed' : 'open')}
                    icon={isOpen ? <CheckCircle2 className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                  >
                    {isOpen ? 'Mark reviewed' : 'Reopen'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => remove(item)}
                    aria-label="Delete feedback"
                    className="text-danger-600 hover:bg-danger-50"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.message}</p>

              <p className="text-xs text-slate-400">
                {formatDateTime(item.createdAt)}
                {item.platform ? ` · ${item.platform}` : ''}
                {item.appVersion ? ` · v${item.appVersion}` : ''}
                {item.reviewedAt ? ` · reviewed ${formatDateTime(item.reviewedAt)}` : ''}
              </p>
            </Card>
          );
        })}
      </div>

      {data && (
        <Pagination page={data.page} totalPages={data.totalPages} totalItems={data.total} pageSize={data.pageSize} onPageChange={setPage} />
      )}
    </div>
  );
}
