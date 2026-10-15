import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType, formatCorrectAnswerLabel } from '../lib/helpers';
import QuestionForm from '../components/QuestionForm';
import type { QuestionFormValue } from '../components/QuestionForm';
import PageHeader from '../components/ui/PageHeader';
import { Pagination, useModal, usePagination } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { CurriculumTree, Exam } from '../types/models';

interface BankQuestion extends QuestionFormValue {
  _id: string;
}

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

const errorMessage = (error: any) => error.response?.data?.message || error.message;

export default function QuestionBank() {
  const { showConfirm, showPrompt } = useModal();

  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState<QuestionFormValue>(initialFormState);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await api.get<Record<string, number>>('/api/question-bank/counts');
      setCounts(response.data || {});
    } catch (error) {
      console.error('Error fetching question counts:', error);
    }
  }, []);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await api.get<Exam[]>('/api/questions/exams');
        const data = response.data || [];
        setExams(data);
        if (data.length > 0) {
          setExamId(data[0]._id);
        } else {
          setCurriculumLoading(false);
        }
      } catch (error) {
        setCurriculumError('Failed to load exams from server.');
        setCurriculumLoading(false);
      }
    };
    loadExams();
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (!examId) return;
    const loadCurriculum = async () => {
      setCurriculumLoading(true);
      try {
        const response = await api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId } });
        const data = response.data || [];
        setCurriculum(data);
        setUnitId(data[0]?._id || '');
        setTopicId(data[0]?.topics?.[0]?._id || '');
      } catch (error) {
        setCurriculumError('Failed to load curriculum from server.');
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadCurriculum();
  }, [examId]);

  const fetchQuestions = useCallback(async () => {
    if (!topicId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<BankQuestion[]>('/api/question-bank', { params: { topicId } });
      setQuestions(response.data || []);
    } catch (error) {
      toast.error('Failed to load questions: ' + errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    setExpandedId(null);
    setIsAdding(false);
    fetchQuestions();
  }, [fetchQuestions]);

  const selectedUnit = curriculum.find((u) => u._id === unitId);
  const topicsList = selectedUnit?.topics ?? [];
  const selectedTopic = topicsList.find((t) => t._id === topicId);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnitId = e.target.value;
    setUnitId(newUnitId);
    setTopicId(curriculum.find((u) => u._id === newUnitId)?.topics?.[0]?._id || '');
  };

  const refresh = async () => {
    await Promise.all([fetchQuestions(), fetchCounts()]);
  };

  const buildPayload = (q: QuestionFormValue) => ({
    type: detectQuestionType(q.question || ''),
    question: q.question,
    questionImage: q.questionImage,
    options: q.options,
    optionImages: q.optionImages,
    correct_answer: q.correct_answer,
    answerType: q.answerType || 'single',
    explanation: q.explanation,
    explanationImage: q.explanationImage,
  });

  const validate = (q: QuestionFormValue) => {
    if (!q.question?.trim()) return 'Question text is required.';
    if (q.answerType === 'numerical') {
      if (!q.correct_answer) return 'A numerical correct answer is required.';
    } else {
      const o = q.options;
      if (!o?.a?.trim() || !o?.b?.trim() || !o?.c?.trim() || !o?.d?.trim()) return 'All options (A, B, C, D) are required.';
    }
    return '';
  };

  const handleCreate = async () => {
    const problem = validate(newQuestionForm);
    if (problem) {
      toast.warning(problem);
      return;
    }
    try {
      setLoading(true);
      await api.post('/api/question-bank', { ...buildPayload(newQuestionForm), topicId });
      toast.success('Question added to the bank!');
      setNewQuestionForm(initialFormState);
      setIsAdding(false);
      await refresh();
    } catch (error) {
      toast.error('Error creating question: ' + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (q: BankQuestion) => {
    const problem = validate(q);
    if (problem) {
      toast.warning(problem);
      return;
    }
    const confirmed = await showConfirm('Are you sure you want to update this question?', { title: 'Update Question' });
    if (!confirmed) return;
    try {
      setLoading(true);
      await api.put(`/api/question-bank/${q._id}`, buildPayload(q));
      toast.success('Question updated successfully!');
      setExpandedId(null);
      await refresh();
    } catch (error) {
      toast.error('Error updating question: ' + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this question?', {
      title: 'Delete Question',
      confirmText: 'Delete',
      variant: 'error',
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await api.delete(`/api/question-bank/${id}`);
      toast.success('Question deleted successfully!');
      await refresh();
    } catch (error) {
      toast.error('Error deleting question: ' + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedTopic) return;
    const confirmed = await showConfirm(
      `Are you sure you want to delete ALL ${questions.length} questions in topic "${selectedTopic.name}"? This cannot be undone!`,
      { title: 'Bulk Delete Warning', confirmText: 'Continue', variant: 'error' }
    );
    if (!confirmed) return;

    const responseText = await showPrompt("Type 'DELETE' to confirm deletion of all questions in this topic.", {
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
      const response = await api.delete(`/api/question-bank/topic/${topicId}`);
      toast.success(response.data?.message || 'Bulk deletion completed successfully.');
      await refresh();
    } catch (error) {
      toast.error('Error in bulk delete: ' + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const questionsPage = usePagination(questions, 10, [topicId]);

  const pageHeader = (
    <PageHeader title="Question Bank" description="Topic-wise question sets, stored separately from unit and test questions" />
  );
  const shell = 'mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl';

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
        <Banner variant="error" message={curriculumError} />
      </div>
    );
  }

  return (
    <div className={shell}>
      {pageHeader}

      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Select Topic</h3>
        {exams.length === 0 ? (
          <p className="py-2 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Select label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)} wrapperClassName="max-w-sm">
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Unit" value={unitId} onChange={handleUnitChange}>
                {curriculum.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <Select label="Topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {topicsList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({counts[t._id] ?? 0})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Card>

      {topicId ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? 'Cancel Add' : 'Add Question'}
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">Questions in {selectedTopic?.name}</p>
                <Badge variant="brand">{questions.length}</Badge>
              </div>
              {questions.length > 0 && (
                <Button variant="danger" size="sm" onClick={handleDeleteAll}>
                  Delete all
                </Button>
              )}
            </div>
          </div>

          {isAdding && (
            <Card className="mb-5 border-brand-200 bg-brand-50/40 p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <Plus className="size-4" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">Add Question to Bank</h3>
              </div>
              <QuestionForm question={newQuestionForm} onChange={setNewQuestionForm} variant="fixer" />
              <div className="mt-5 flex gap-3">
                <Button onClick={handleCreate} loading={loading}>
                  Add Question
                </Button>
                <Button variant="secondary" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {loading && questions.length === 0 ? (
            <LoadingState message="Loading questions..." />
          ) : questions.length === 0 ? (
            <EmptyState title="No questions in this topic yet." description="Use Add Question to start building this topic's question set." />
          ) : (
            <div className="flex flex-col gap-4">
              {questionsPage.pageItems.map((q, idx) => (
                <Card key={q._id} className="overflow-hidden transition-shadow hover:shadow-soft-md">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                    className="flex w-full items-center justify-between gap-3 rounded-t-2xl bg-slate-50 px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="shrink-0 font-bold text-brand-600">Q{questionsPage.startIndex + idx + 1}.</span>
                      <span className="truncate font-semibold text-slate-800">
                        {(q.question || '').length > 100 ? `${(q.question || '').substring(0, 100)}...` : q.question}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3.5">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                        Ans: {formatCorrectAnswerLabel(q.correct_answer)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        {expandedId === q._id ? (
                          <>
                            <ChevronUp className="size-3.5" /> Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3.5" /> Expand
                          </>
                        )}
                      </span>
                    </div>
                  </button>

                  {expandedId === q._id && (
                    <div className="border-t border-slate-100 p-6">
                      <QuestionForm
                        question={q}
                        onChange={(updated) => setQuestions(questions.map((item) => (item._id === q._id ? { ...item, ...updated } : item)))}
                        variant="fixer"
                      />
                      <div className="mt-5 flex gap-3">
                        <Button onClick={() => handleUpdate(q)}>Save Changes</Button>
                        <Button variant="danger" onClick={() => handleDelete(q._id)}>
                          Delete Question
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              <Pagination
                page={questionsPage.page}
                totalPages={questionsPage.totalPages}
                totalItems={questionsPage.totalItems}
                pageSize={questionsPage.pageSize}
                onPageChange={questionsPage.setPage}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState title="No topic selected." description="This exam has no topics yet. Add units and topics under Manage Exams first." />
      )}
    </div>
  );
}
