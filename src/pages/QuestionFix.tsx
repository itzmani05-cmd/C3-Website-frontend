import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Wrench } from 'lucide-react';
import api from '../api';
import { detectQuestionType, normalizeCorrectAnswer } from '../lib/helpers';
import QuestionForm from '../components/QuestionForm';
import type { QuestionFormValue } from '../components/QuestionForm';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { CurriculumTree, Test } from '../types/models';

interface FixableQuestion extends QuestionFormValue {
  _id: string;
  correctAnswer?: string;
}

const initialFormState: QuestionFormValue = {
  question: '',
  questionImage: null,
  options: { a: '', b: '', c: '', d: '' },
  optionImages: { a: null, b: null, c: null, d: null },
  correct_answer: 'a',
  explanation: '',
  explanationImage: null,
};

type DestinationMode = 'curriculum' | 'test';

export default function QuestionFix() {
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [destinationMode, setDestinationMode] = useState<DestinationMode>('curriculum');

  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [questions, setQuestions] = useState<FixableQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState<QuestionFormValue>(initialFormState);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [curriculumResponse, testsResponse] = await Promise.all([
          api.get<CurriculumTree>('/api/questions/curriculum'),
          api.get<Test[]>('/api/questions/tests'),
        ]);

        const data = curriculumResponse.data || [];
        setCurriculum(data);
        if (data.length > 0) setUnitId(data[0]._id);

        const testsData = testsResponse.data || [];
        setTests(testsData);
        if (testsData.length > 0) setSelectedTestId(testsData[0]._id);
      } catch (error) {
        setCurriculumError('Failed to load curriculum or tests from server.');
        console.error('Curriculum load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (destinationMode === 'test') {
      if (!selectedTestId) {
        setQuestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await api.get<FixableQuestion[]>('/api/questions/exam', { params: { testId: selectedTestId } });
        setQuestions(response.data || []);
      } catch (error) {
        console.error('Error fetching exam questions:', error);
        setMessage('Failed to load questions.');
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
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setMessage('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [destinationMode, unitId, topicId, subtopicId, selectedTestId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleModeChange = (mode: DestinationMode) => {
    setDestinationMode(mode);
    setExpandedId(null);
    setIsAdding(false);
    setMessage('');
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnitId(e.target.value);
    setTopicId('');
    setSubtopicId('');
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopicId(e.target.value);
    setSubtopicId('');
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleSubtopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubtopicId(e.target.value);
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
    if (!confirmed) return;
    try {
      setLoading(true);
      const endpoint = destinationMode === 'test' ? `/api/questions/exam/${id}` : `/api/questions/${id}`;
      await api.put(endpoint, { ...updatedData, type: detectQuestionType(updatedData.question || '') });
      setMessage('Question updated successfully!');
      setExpandedId(null);
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error updating question: ' + (error.response?.data?.message || error.message));
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
      setMessage('Question deleted successfully!');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error deleting question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllQuestions = async () => {
    let targetName = '';

    if (destinationMode === 'test') {
      const selectedTest = tests.find((t) => t._id === selectedTestId);
      if (!selectedTest) {
        await showAlert('Please select a test first to perform a bulk delete.', { variant: 'warning' });
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
        await showAlert('Please select a topic or subtopic first to perform a bulk delete.', { variant: 'warning' });
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
      await showAlert('Deletion cancelled. Confirmation text did not match.', { variant: 'error' });
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
      setMessage(response.data?.message || 'Bulk deletion completed successfully.');
      fetchQuestions();
      setTimeout(() => setMessage(''), 4000);
    } catch (error: any) {
      setMessage('Error in bulk delete: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionForm.question?.trim()) {
      await showAlert('Question text is required.', { variant: 'warning' });
      return;
    }
    const opts = newQuestionForm.options;
    if (!opts?.a?.trim() || !opts?.b?.trim() || !opts?.c?.trim() || !opts?.d?.trim()) {
      await showAlert('All options (A, B, C, D) are required.', { variant: 'warning' });
      return;
    }

    if (destinationMode === 'test' && !selectedTestId) {
      await showAlert('Please select a test first.', { variant: 'warning' });
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

      setMessage('Question created successfully!');
      setNewQuestionForm(initialFormState);
      setIsAdding(false);
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error creating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const selectedUnitObj = curriculum.find((u) => u._id === unitId);
  const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
  const selectedTopicObj = topicsList.find((t) => t._id === topicId);
  const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

  const getAnswerDisplay = (q: FixableQuestion) => normalizeCorrectAnswer(q.correct_answer || q.correctAnswer).toUpperCase();

  const pageHeader = (
    <div className="mb-6 flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Wrench className="size-5" />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Question Fixer</h1>
        <p className="mt-0.5 text-sm text-slate-500">Review, edit, and clean up existing questions</p>
      </div>
    </div>
  );

  if (curriculumLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl 2xl:max-w-5xl">
        {pageHeader}
        <LoadingState message="Loading curriculum..." />
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="mx-auto w-full max-w-4xl 2xl:max-w-5xl">
        {pageHeader}
        <Banner variant="error" message={curriculumError} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl 2xl:max-w-5xl">
      {pageHeader}

      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Select Category</h3>

        <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => handleModeChange('curriculum')}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              destinationMode === 'curriculum' ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Unit-wise Questions
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('test')}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              destinationMode === 'test' ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Test Questions
          </button>
        </div>

        {destinationMode === 'curriculum' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Unit" value={unitId} onChange={handleUnitChange}>
              {curriculum.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select label="Topic" value={topicId} onChange={handleTopicChange}>
              <option value="">All Topics</option>
              {topicsList.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {subtopicsList.length > 0 && (
              <Select label="Subtopic" value={subtopicId} onChange={handleSubtopicChange} disabled={!topicId}>
                <option value="">All Subtopics</option>
                {subtopicsList.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        ) : (
          <div>
            {tests.length > 0 ? (
              <Select label="Select Test" value={selectedTestId} onChange={handleTestChange} wrapperClassName="max-w-sm">
                {tests.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} {t.publishToStudent ? '(Published)' : '(Draft)'}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="py-2 font-medium text-danger-600">No tests available. Please configure tests first.</p>
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800">Questions in this selection</p>
          <Badge variant="brand">{questions.length}</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel Add' : 'Add Question'}
          </Button>
          {((destinationMode === 'test' && selectedTestId) || (destinationMode === 'curriculum' && topicId)) && questions.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleDeleteAllQuestions}>
              Delete all
            </Button>
          )}
        </div>
      </div>

      {message && <Banner variant={message.includes('Error') ? 'error' : 'success'} message={message} />}

      {isAdding && (
        <Card className="mb-5 border-brand-200 bg-brand-50/40 p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Plus className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">Create New Question</h3>
          </div>
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
      ) : !loading && questions.length === 0 ? (
        <EmptyState title="No questions found." description="Try a different unit, topic, or test — or add a new question above." />
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => (
            <Card key={q._id} className="overflow-hidden transition-shadow hover:shadow-soft-md">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                className="flex w-full items-center justify-between gap-3 rounded-t-2xl bg-slate-50 px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="shrink-0 font-extrabold text-brand-600">Q{idx + 1}.</span>
                  <span className="truncate font-semibold text-slate-800">
                    {(q.question || '').length > 100 ? `${(q.question || '').substring(0, 100)}...` : q.question}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3.5">
                  <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">Ans: {getAnswerDisplay(q)}</span>
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
                    onChange={(updatedQ) => {
                      setQuestions(questions.map((item) => (item._id === q._id ? { ...item, ...updatedQ } : item)));
                    }}
                    variant="fixer"
                  />
                  <div className="mt-5 flex gap-3">
                    <Button onClick={() => handleUpdateQuestion(q._id, q)}>Save Changes</Button>
                    <Button variant="danger" onClick={() => handleDeleteQuestion(q._id)}>
                      Delete Question
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
