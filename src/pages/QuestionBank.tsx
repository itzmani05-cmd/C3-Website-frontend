import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileDown, ListTree, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { buildPayload, EMPTY_FILTERS, EMPTY_QUESTION, errorMessage, filtersFromSearch, filtersToSearchPatch, validateQuestion } from '../lib/bank';
import type { BankFilters, BankQuestion, Scope } from '../lib/bank';
import QuestionEditor from '../components/bank/QuestionEditor';
import QuestionList from '../components/bank/QuestionList';
import DeleteAllDialog from '../components/bank/DeleteAllDialog';
import BankPdfExport from '../components/bank/BankPdfExport';
import TopicSidebar from '../components/bank/TopicSidebar';
import FilterBar from '../components/bank/FilterBar';
import PageHeader from '../components/ui/PageHeader';
import RowMenu from '../components/ui/RowMenu';
import Card from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { CurriculumTree, Exam } from '../types/models';

export default function QuestionBank() {
  const [sp, setSp] = useSearchParams();

  const [exams, setExams] = useState<Exam[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingExams, setLoadingExams] = useState(true);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [matching, setMatching] = useState<number | undefined>();

  // ----- URL state: the selected exam/topic/page/filters live in the address, so a refresh keeps your place -----

  const patch = useCallback(
    (changes: Record<string, string | null>) =>
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, v)));
          return next;
        },
        { replace: true }
      ),
    [setSp]
  );

  const examId = sp.get('exam') && exams.some((e) => e._id === sp.get('exam')) ? sp.get('exam')! : exams[0]?._id ?? '';
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const spKey = sp.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo<BankFilters>(() => filtersFromSearch(sp), [spKey]);

  const flatTopics = useMemo(() => curriculum.flatMap((u) => u.topics.map((t) => ({ ...t, unitName: u.name }))), [curriculum]);
  const topicId = flatTopics.some((t) => t._id === sp.get('topic')) ? sp.get('topic')! : flatTopics[0]?._id ?? '';
  const topicIndex = flatTopics.findIndex((t) => t._id === topicId);
  const selectedTopic = flatTopics[topicIndex];
  const scope: Scope = { topicId };

  // ----- data -----

  const fetchCounts = useCallback(async () => {
    try {
      setCounts((await api.get<Record<string, number>>('/api/question-bank/counts')).data || {});
    } catch (error) {
      console.error('Error fetching question counts:', error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = (await api.get<Exam[]>('/api/questions/exams')).data;
        setExams(Array.isArray(list) ? list : []);
      } catch {
        setLoadError('Failed to load exams from server.');
      } finally {
        setLoadingExams(false);
      }
    })();
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setCurriculumLoading(true);
    api
      .get<CurriculumTree>('/api/questions/curriculum', { params: { examId } })
      .then((res) => {
        if (cancelled) return;
        // A stale or failing backend can answer with something that is not a curriculum tree.
        const tree = Array.isArray(res.data) ? res.data : [];
        setCurriculum(tree.map((u) => ({ ...u, topics: (u.topics ?? []).map((t) => ({ ...t, subtopics: t.subtopics ?? [] })) })));
      })
      .catch(() => !cancelled && setLoadError('Failed to load curriculum from server.'))
      .finally(() => !cancelled && setCurriculumLoading(false));
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const onMutated = useCallback(() => fetchCounts(), [fetchCounts]);
  const bump = () => setRefreshKey((n) => n + 1);

  // ----- navigation -----

  const selectTopic = (id: string) => {
    setIsAdding(false);
    setSidebarOpen(false);
    patch({ topic: id, page: null });
  };
  const setFilters = useCallback((next: BankFilters) => patch({ ...filtersToSearchPatch(next), page: null }), [patch]);
  const setPage = useCallback(
    (p: number) => {
      patch({ page: p > 1 ? String(p) : null });
    },
    [patch]
  );
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters]);

  // ----- actions -----

  const handleCreate = async (draft: BankQuestion): Promise<boolean> => {
    const problem = validateQuestion(draft);
    if (problem) {
      toast.warning(problem);
      return false;
    }
    try {
      await api.post('/api/question-bank', { ...buildPayload(draft), topicId });
      toast.success('Question added to the bank!');
      setIsAdding(false);
      bump();
      fetchCounts();
      return true;
    } catch (error) {
      toast.error('Error creating question: ' + errorMessage(error));
      return false;
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const response = await api.delete(`/api/question-bank/topic/${topicId}`);
      toast.success(response.data?.message || 'Bulk deletion completed successfully.');
      setDeleteAllOpen(false);
      bump();
      fetchCounts();
    } catch (error) {
      toast.error('Error in bulk delete: ' + errorMessage(error));
    } finally {
      setDeletingAll(false);
    }
  };

  // ----- render -----

  const shell = 'mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl';
  const pageHeader = <PageHeader title="Question Bank" description="Topic-wise question sets, stored separately from unit and test questions" />;

  if (loadingExams || (curriculumLoading && curriculum.length === 0)) {
    return <div className={shell}>{pageHeader}<LoadingState message="Loading curriculum..." /></div>;
  }
  if (loadError) return <div className={shell}>{pageHeader}<Banner variant="error" message={loadError} onRetry={() => window.location.reload()} /></div>;
  if (exams.length === 0) {
    return <div className={shell}>{pageHeader}<p className="py-2 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p></div>;
  }

  return (
    <div className={shell}>
      {pageHeader}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <button type="button" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 lg:hidden">
            <span className="flex items-center gap-2"><ListTree className="size-4" /> {selectedTopic?.name ?? 'Choose a topic'}</span>
            <span className="text-xs text-slate-400">{sidebarOpen ? 'Hide' : 'Show'}</span>
          </button>
          <Card className={[sidebarOpen ? 'block' : 'hidden', 'no-scrollbar p-3 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto'].join(' ')}>
            {exams.length > 1 ? (
              <Select aria-label="Exam" value={examId} wrapperClassName="mb-3" onChange={(e) => patch({ exam: e.target.value, topic: null, page: null })}>
                {exams.map((ex) => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
              </Select>
            ) : (
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">{exams[0].name}</p>
            )}
            <TopicSidebar curriculum={curriculum} counts={counts} selectedTopicId={topicId} onSelectTopic={selectTopic} />
          </Card>
        </aside>

        <main className="min-w-0">
          {!topicId ? (
            <EmptyState title="No topic selected." description="This exam has no topics yet. Add units and topics under Manage Exams first." />
          ) : (
            <>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                total={matching}
                leading={
                  <h2 className="max-w-full shrink-0 truncate text-xl font-semibold text-slate-900 sm:max-w-[18rem]" title={selectedTopic?.name}>
                    {selectedTopic?.name}
                  </h2>
                }
                actions={
                  <RowMenu
                    vertical
                    label="Question bank actions"
                    buttonClassName="inline-flex size-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    items={[
                      { label: isAdding ? 'Cancel add' : 'Add question', icon: Plus, onSelect: () => setIsAdding((v) => !v) },
                      { label: 'Download as PDF', icon: FileDown, hidden: (counts[topicId] ?? 0) === 0, onSelect: () => setPdfOpen(true) },
                      { label: 'Delete all', icon: Trash2, danger: true, hidden: (counts[topicId] ?? 0) === 0, onSelect: () => setDeleteAllOpen(true) },
                    ]}
                  />
                }
              />
              {isAdding && (
                <Card className="mb-5 border-brand-200 bg-brand-50/30 p-6">
                  <h3 className="mb-4 text-sm font-semibold text-slate-900">Add question to {selectedTopic?.name}</h3>
                  <QuestionEditor mode="new" draftKey={`new:${topicId}`} initial={EMPTY_QUESTION} onSave={handleCreate} onCancel={() => setIsAdding(false)} />
                </Card>
              )}
              <QuestionList
                scope={scope}
                filters={filters}
                page={page}
                onPageChange={setPage}
                onClearFilters={clearFilters}
                refreshKey={refreshKey}
                onMutated={onMutated}
                onTotal={setMatching}
                onAdd={() => setIsAdding(true)}
              />
            </>
          )}
        </main>
      </div>

      <BankPdfExport
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        scope={scope}
        filters={filters}
        topicName={selectedTopic?.name ?? 'Question Bank'}
        examName={exams.find((e) => e._id === examId)?.name ?? ''}
      />

      <DeleteAllDialog
        open={deleteAllOpen}
        topicName={selectedTopic?.name ?? ''}
        count={counts[topicId] ?? 0}
        deleting={deletingAll}
        onCancel={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
