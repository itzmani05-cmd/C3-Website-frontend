import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, Library, ListTree, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import QuestionForm from '../components/QuestionForm';
import FixRow from '../components/fix/FixRow';
import type { FixableQuestion } from '../components/fix/FixRow';
import AddFromBankDialog from '../components/fix/AddFromBankDialog';
import BankPdfExport from '../components/bank/BankPdfExport';
import type { PdfQuestion } from '../components/bank/BankPdfExport';
import TopicSidebar from '../components/bank/TopicSidebar';
import PageHeader from '../components/ui/PageHeader';
import RowMenu from '../components/ui/RowMenu';
import type { QuestionFormValue } from '../components/QuestionForm';
import { Pagination, useModal, usePagination } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { CurriculumTree, Exam, Test } from '../types/models';

const initialFormState: QuestionFormValue = {
  question: '',
  questionImage: null,
  options: { a: '', b: '', c: '', d: '' },
  optionImages: { a: null, b: null, c: null, d: null },
  correct_answer: 'a',
  answerType: 'single',
  explanation: '',
  explanationImage: null,
};

type DestinationMode = 'curriculum' | 'test';

export default function QuestionFix() {
  const { showConfirm, showPrompt } = useModal();
  const [destinationMode, setDestinationMode] = useState<DestinationMode>('curriculum');

  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [filterPart, setFilterPart] = useState('');
  const [filterSection, setFilterSection] = useState('');

  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [questions, setQuestions] = useState<FixableQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const latestRequest = useRef(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState<QuestionFormValue>(initialFormState);

  useEffect(() => {
    const loadData = async () => {
      try {
        const examsResponse = await api.get<Exam[]>('/api/questions/exams');
        const examsData = examsResponse.data || [];
        setExams(examsData);
        if (examsData.length > 0) {
          setExamId(examsData[0]._id);
        } else {
          setCurriculumLoading(false);
        }
      } catch (error) {
        setCurriculumError('Failed to load exams from server.');
        console.error('Data load error:', error);
        setCurriculumLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!examId) return;
    const loadExamScopedData = async () => {
      setCurriculumLoading(true);
      try {
        const [curriculumResponse, testsResponse] = await Promise.all([
          api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId } }),
          api.get<Test[]>('/api/questions/tests', { params: { examId } }),
        ]);
        const data = curriculumResponse.data || [];
        setCurriculum(data);
        setUnitId(data[0]?._id || '');
        setTopicId(data[0]?.topics?.[0]?._id || '');
        setSubtopicId('');

        const testsData = testsResponse.data || [];
        setTests(testsData);
        setSelectedTestId(testsData[0]?._id || '');
      } catch (error) {
        setCurriculumError('Failed to load curriculum or tests from server.');
        console.error('Curriculum load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadExamScopedData();
  }, [examId]);

  const fetchQuestions = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (destinationMode === 'test') {
      if (!selectedTestId) {
        setQuestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await api.get<FixableQuestion[]>('/api/questions/exam', { params: { testId: selectedTestId } });
        if (requestId === latestRequest.current) setQuestions(response.data || []);
      } catch (error) {
        console.error('Error fetching exam questions:', error);
        if (requestId === latestRequest.current) setQuestions([]);
        toast.error('Failed to load questions.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!unitId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { unitId };
      if (topicId && topicId !== 'all') params.topicId = topicId;
      if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;

      const response = await api.get<FixableQuestion[]>('/api/questions', { params });
      if (requestId === latestRequest.current) setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      if (requestId === latestRequest.current) setQuestions([]);
        toast.error('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [destinationMode, unitId, topicId, subtopicId, selectedTestId]);

  // Questions load as soon as a selection is made; changing the selection starts from a clean list.
  useEffect(() => {
    setSearch('');
    setExpandedId(null);
    setIsAdding(false);
  }, [destinationMode, examId, unitId, topicId, subtopicId, selectedTestId]);

  useEffect(() => {
    if (!curriculumLoading) fetchQuestions();
  }, [curriculumLoading, fetchQuestions]);

  useEffect(() => {
    setFilterPart('');
    setFilterSection('');
  }, [selectedTestId]);

  const selectedTest = tests.find((t) => t._id === selectedTestId);
  const pattern = selectedTest?.pattern;
  const needle = search.trim().toLowerCase();
  const visibleQuestions = questions.filter(
    (q) =>
      (!filterPart || q.part === filterPart) &&
      (!filterSection || q.section === filterSection) &&
      (!needle || [q.question, q.options?.a, q.options?.b, q.options?.c, q.options?.d, q.explanation].some((t) => t?.toLowerCase().includes(needle)))
  );

  const handleModeChange = (mode: DestinationMode) => {
    setDestinationMode(mode);
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTestId(e.target.value);
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleUpdateQuestion = async (id: string, updatedData: FixableQuestion) => {
    const confirmed = await showConfirm('Are you sure you want to update this question?', { title: 'Update Question' });
    if (!confirmed) return false;
    try {
      setLoading(true);
      const endpoint = destinationMode === 'test' ? `/api/questions/exam/${id}` : `/api/questions/${id}`;
      await api.put(endpoint, { ...updatedData, type: detectQuestionType(updatedData.question || '') });
      toast.success('Question updated successfully!');
      setExpandedId(null);
      fetchQuestions();
      return true;
    } catch (error: any) {
      toast.error('Error updating question: ' + (error.response?.data?.message || error.message));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this question?', {
      title: 'Delete Question',
      confirmText: 'Delete',
      variant: 'error',
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const endpoint = destinationMode === 'test' ? `/api/questions/exam/${id}` : `/api/questions/${id}`;
      await api.delete(endpoint);
      toast.success('Question deleted successfully!');
      fetchQuestions();
    } catch (error: any) {
      toast.error('Error deleting question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllQuestions = async () => {
    let targetName = '';

    if (destinationMode === 'test') {
      const selectedTest = tests.find((t) => t._id === selectedTestId);
      if (!selectedTest) {
        toast.warning('Please select a test first to perform a bulk delete.');
        return;
      }
      targetName = `Test: "${selectedTest.name}"`;
    } else {
      const selectedUnitObj = curriculum.find((u) => u._id === unitId);
      const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
      const selectedTopicObj = topicsList.find((t) => t._id === topicId);
      const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

      if (subtopicId && subtopicId !== 'all') {
        const st = subtopicsList.find((s) => s._id === subtopicId);
        targetName = `Subtopic: "${st?.name}"`;
      } else if (topicId && topicId !== 'all') {
        const t = topicsList.find((tp) => tp._id === topicId);
        targetName = `Topic: "${t?.name}"`;
      } else {
        toast.warning('Please select a topic or subtopic first to perform a bulk delete.');
        return;
      }
    }

    const confirmMessage = `Are you sure you want to delete ALL questions in ${targetName}? This will permanently delete all these questions and cannot be undone!`;
    const confirmed = await showConfirm(confirmMessage, { title: 'Bulk Delete Warning', confirmText: 'Continue', variant: 'error' });
    if (!confirmed) return;

    const responseText = await showPrompt("Type 'DELETE' to confirm deletion of all questions in this category.", {
      title: 'Final Confirmation',
      confirmText: 'Confirm Delete',
      placeholder: 'DELETE',
    });
    if (responseText !== 'DELETE') {
      toast.error('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      setLoading(true);
      let response;
      if (destinationMode === 'test') {
        response = await api.delete('/api/questions/exam/delete/bulk', { params: { testId: selectedTestId } });
      } else {
        const params: Record<string, string> = {};
        if (topicId && topicId !== 'all') params.topicId = topicId;
        if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;
        response = await api.delete('/api/questions/delete/bulk', { params });
      }
      toast.success(response.data?.message || 'Bulk deletion completed successfully.');
      fetchQuestions();
    } catch (error: any) {
      toast.error('Error in bulk delete: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionForm.question?.trim()) {
      toast.warning('Question text is required.');
      return;
    }
    if (newQuestionForm.answerType !== 'numerical') {
      const opts = newQuestionForm.options;
      if (!opts?.a?.trim() || !opts?.b?.trim() || !opts?.c?.trim() || !opts?.d?.trim()) {
        toast.warning('All options (A, B, C, D) are required.');
        return;
      }
    } else if (!newQuestionForm.correct_answer) {
      toast.warning('A numerical correct answer is required.');
      return;
    }

    if (destinationMode === 'test' && !selectedTestId) {
      toast.warning('Please select a test first.');
      return;
    }

    try {
      setLoading(true);

      if (destinationMode === 'test') {
        const selectedTest = tests.find((t) => t._id === selectedTestId);
        const payload = {
          testId: selectedTestId,
          testName: selectedTest?.name,
          type: detectQuestionType(newQuestionForm.question),
          question: newQuestionForm.question,
          questionImage: newQuestionForm.questionImage,
          options: newQuestionForm.options,
          optionImages: newQuestionForm.optionImages,
          correct_answer: newQuestionForm.correct_answer,
          answerType: newQuestionForm.answerType || 'single',
          explanation: newQuestionForm.explanation,
          explanationImage: newQuestionForm.explanationImage,
        };

        await api.post('/api/questions/exam', payload);
      } else {
        const payload: Record<string, unknown> = {
          unitId,
          topicId: topicId || null,
          subtopicId: subtopicId && subtopicId !== 'all' ? subtopicId : null,
          type: detectQuestionType(newQuestionForm.question),
          question: newQuestionForm.question,
          questionImage: newQuestionForm.questionImage,
          options: newQuestionForm.options,
          optionImages: newQuestionForm.optionImages,
          correct_answer: newQuestionForm.correct_answer,
          answerType: newQuestionForm.answerType || 'single',
          explanation: newQuestionForm.explanation,
          explanationImage: newQuestionForm.explanationImage,
          status: 'accepted',
          is_published: true,
        };

        if (!payload.topicId && curriculum.length > 0) {
          const currentUnitObj = curriculum.find((u) => u._id === unitId);
          if (currentUnitObj && currentUnitObj.topics?.length > 0) {
            payload.topicId = currentUnitObj.topics[0]._id;
          }
        }

        await api.post('/api/questions', payload);
      }

      toast.success('Question created successfully!');
      setNewQuestionForm(initialFormState);
      setIsAdding(false);
      fetchQuestions();
    } catch (error: any) {
      toast.error('Error creating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const selectedUnitObj = curriculum.find((u) => u._id === unitId);
  const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
  const selectedTopicObj = topicsList.find((t) => t._id === topicId);
  const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

  const shell = 'mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl';
  const pageHeader = <PageHeader title="Question Fixer" description="Review, edit, and clean up existing questions" />;

  const handleSelectTopic = (id: string) => {
    const unit = curriculum.find((u) => u.topics.some((t) => t._id === id));
    if (unit) setUnitId(unit._id);
    setTopicId(id);
    setSubtopicId('');
    setSidebarOpen(false);
  };

  const handleSelectSubtopic = (topic: string, sub: string) => {
    const unit = curriculum.find((u) => u.topics.some((t) => t._id === topic));
    if (unit) setUnitId(unit._id);
    setTopicId(topic);
    setSubtopicId(sub);
    setSidebarOpen(false);
  };

  const heading =
    destinationMode === 'test'
      ? selectedTest?.name
      : subtopicsList.find((st) => st._id === subtopicId)?.name ?? selectedTopicObj?.name ?? selectedUnitObj?.name;
  const canDeleteAll = questions.length > 0 && (destinationMode === 'test' ? !!selectedTestId : !!topicId);

  const modeButton = (mode: DestinationMode, label: string) => (
    <button
      type="button"
      onClick={() => handleModeChange(mode)}
      className={[
        'flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
        destinationMode === mode ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {label}
    </button>
  );

  // How many questions each part and each part-section holds in the current selection, for the group headings.
  const sectionCounts = new Map<string, number>();
  for (const q of visibleQuestions) {
    if (q.part) sectionCounts.set(q.part, (sectionCounts.get(q.part) ?? 0) + 1);
    if (q.section) sectionCounts.set(`${q.part ?? ''}||${q.section}`, (sectionCounts.get(`${q.part ?? ''}||${q.section}`) ?? 0) + 1);
  }

  const questionsPage = usePagination(visibleQuestions, 10, [filterPart, filterSection, search, destinationMode, topicId, subtopicId, selectedTestId]);

  if (curriculumLoading) {
    return (
      <div className={shell}>
        {pageHeader}
        <LoadingState message="Loading curriculum..." />
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className={shell}>
        {pageHeader}
        <Banner variant="error" message={curriculumError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className={shell}>
        {pageHeader}
        <p className="py-2 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p>
      </div>
    );
  }

  return (
    <div className={shell}>
      {pageHeader}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <button
            type="button"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <ListTree className="size-4" /> {heading ?? 'Choose a category'}
            </span>
            <span className="text-xs text-slate-400">{sidebarOpen ? 'Hide' : 'Show'}</span>
          </button>
          <Card className={[sidebarOpen ? 'block' : 'hidden', 'no-scrollbar p-3 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto'].join(' ')}>
            <div className="mb-3 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {modeButton('curriculum', 'Unit-wise')}
              {modeButton('test', 'Test')}
            </div>

            {exams.length > 1 && (
              <Select aria-label="Exam" value={examId} wrapperClassName="mb-3" onChange={(e) => setExamId(e.target.value)}>
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            )}

            {destinationMode === 'curriculum' ? (
              <>
                <TopicSidebar
                curriculum={curriculum}
                counts={{}}
                hideCounts
                selectedTopicId={topicId}
                onSelectTopic={handleSelectTopic}
                selectedSubtopicId={subtopicId}
                onSelectSubtopic={handleSelectSubtopic}
              />
              </>
            ) : tests.length > 0 ? (
              <div className="flex flex-col gap-3">
                <Select aria-label="Test" value={selectedTestId} onChange={handleTestChange}>
                  {tests.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} {t.publishToStudent ? '(Published)' : '(Draft)'}
                    </option>
                  ))}
                </Select>
                {pattern && pattern.length > 0 && (
                  <>
                    <Select
                      aria-label="Filter by part"
                      value={filterPart}
                      onChange={(e) => {
                        setFilterPart(e.target.value);
                        setFilterSection('');
                      }}
                    >
                      <option value="">All parts</option>
                      {pattern.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    <Select aria-label="Filter by section" value={filterSection} onChange={(e) => setFilterSection(e.target.value)} disabled={!filterPart}>
                      <option value="">All sections</option>
                      {pattern
                        .find((p) => p.name === filterPart)
                        ?.sections.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </Select>
                  </>
                )}
              </div>
            ) : (
              <p className="px-1 py-2 text-sm font-medium text-danger-600">No tests available for this exam. Please configure one first.</p>
            )}
          </Card>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="max-w-full shrink-0 truncate text-xl font-semibold text-slate-900 sm:max-w-[18rem]" title={heading}>
              {heading}
            </h2>
            <div className="min-w-[180px] flex-1">
              <Input
                aria-label="Search questions"
                placeholder="Search here anything.."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="text-sm text-slate-500">
                {visibleQuestions.length}
                {visibleQuestions.length !== questions.length ? ` of ${questions.length}` : ''} {visibleQuestions.length === 1 ? 'question' : 'questions'}
              </span>
              <RowMenu
                vertical
                label="Question fixer actions"
                buttonClassName="inline-flex size-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                items={[
                  { label: isAdding ? 'Cancel add' : 'Add question', icon: Plus, onSelect: () => setIsAdding((v) => !v) },
                  { label: 'Add from Bank or Practice', icon: Library, hidden: destinationMode !== 'test' || !selectedTest, onSelect: () => setBankOpen(true) },
                  { label: 'Download as PDF', icon: FileDown, hidden: visibleQuestions.length === 0, onSelect: () => setPdfOpen(true) },
                  { label: 'Delete all', icon: Trash2, danger: true, hidden: !canDeleteAll, onSelect: handleDeleteAllQuestions },
                ]}
              />
            </div>
          </div>

          {isAdding && (
            <Card className="mb-5 border-brand-200 bg-brand-50/30 p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Add question{heading ? ` to ${heading}` : ''}</h3>
              <QuestionForm question={newQuestionForm} onChange={setNewQuestionForm} variant="fixer" />
              <div className="mt-5 flex gap-3">
                <Button onClick={handleCreateQuestion} loading={loading}>
                  Create Question
                </Button>
                <Button variant="secondary" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {loading && questions.length === 0 ? (
            <LoadingState message="Loading questions..." />
          ) : visibleQuestions.length === 0 ? (
            <EmptyState
              title={needle ? 'No questions match your search.' : 'No questions found.'}
              description={needle ? 'Try searching for something else.' : 'Pick another unit, topic or test — or add a new question.'}
              action={needle ? <Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button> : undefined}
            />
          ) : (
            <div aria-busy={loading} className={['flex flex-col gap-4 transition-opacity', loading ? 'pointer-events-none opacity-60' : ''].join(' ')}>
              {questionsPage.pageItems.map((q, idx) => {
                // Part and section are shown once as a heading above their questions, not repeated on every row.
                const prev = questionsPage.pageItems[idx - 1];
                const newPart = !!q.part && q.part !== prev?.part;
                const newSection = !!q.section && (newPart || q.section !== prev?.section);
                return (
                  <Fragment key={q._id}>
                    {newPart && (
                      <div className={['flex items-center gap-3', idx > 0 ? 'mt-3' : ''].join(' ')}>
                        <h3 className="shrink-0 text-sm font-bold uppercase tracking-wide text-slate-800">{q.part}</h3>
                        <span className="h-px flex-1 bg-slate-300" />
                        <span className="shrink-0 text-xs font-semibold text-slate-500">{sectionCounts.get(q.part ?? '') ?? 0} questions</span>
                      </div>
                    )}
                    {newSection && (
                      <p className="-mb-1 flex items-center gap-2 text-xs font-semibold text-brand-700">
                        <span className="rounded-md bg-brand-50 px-2 py-1 ring-1 ring-inset ring-brand-600/15">{q.section}</span>
                        <span className="text-slate-400">{sectionCounts.get(`${q.part ?? ''}||${q.section}`) ?? 0} questions</span>
                      </p>
                    )}
                    <FixRow
                      q={q}
                      number={questionsPage.startIndex + idx + 1}
                      expanded={expandedId === q._id}
                      onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                      onSave={handleUpdateQuestion}
                      onDelete={handleDeleteQuestion}
                      showPlacement={false}
                    />
                  </Fragment>
                );
              })}
              <Pagination
                page={questionsPage.page}
                totalPages={questionsPage.totalPages}
                totalItems={questionsPage.totalItems}
                pageSize={questionsPage.pageSize}
                onPageChange={questionsPage.setPage}
              />
            </div>
          )}
        </main>
      </div>

      {selectedTest && (
        <AddFromBankDialog
          open={bankOpen}
          onClose={() => setBankOpen(false)}
          test={selectedTest}
          examId={examId}
          curriculum={curriculum}
          existingBankIds={new Set(questions.map((q) => q.bankQuestionId).filter((id): id is string => !!id))}
          existingPracticeIds={new Set(questions.map((q) => q.practiceQuestionId).filter((id): id is string => !!id))}
          countIn={(part, section) => questions.filter((q) => (q.part ?? '') === part && (q.section ?? '') === section).length}
          onAdded={fetchQuestions}
          initialPart={filterPart}
          initialSection={filterSection}
        />
      )}

      <BankPdfExport
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        questions={visibleQuestions as unknown as PdfQuestion[]}
        topicName={heading ?? 'Questions'}
        examName={exams.find((e) => e._id === examId)?.name ?? ''}
      />
    </div>
  );
}
