import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import { parseQuestionBlock, parseLineByLine, splitQuestionBlocks } from '../lib/questionParser';
import type { DraftQuestion } from '../lib/questionParser';
import QuestionForm from '../components/QuestionForm';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import { Select, Textarea } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import type { CurriculumTree, Test } from '../types/models';

type DestinationMode = 'curriculum' | 'test';

const statusBadgeClasses: Record<DraftQuestion['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-success-soft text-success-600',
  REJECTED: 'bg-danger-soft text-danger-600',
};

export default function AIGenerator() {
  const { showAlert } = useModal();
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [destinationMode, setDestinationMode] = useState<DestinationMode>('curriculum');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  const [pastedContent, setPastedContent] = useState('');
  const [batch, setBatch] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const currResponse = await api.get<CurriculumTree>('/api/questions/curriculum');
        const currData = currResponse.data || [];
        setCurriculum(currData);

        if (currData.length > 0) {
          const firstUnit = currData[0];
          const firstTopic = firstUnit.topics?.[0];
          const firstSubtopic = firstTopic?.subtopics?.[0];

          setUnitId(firstUnit._id);
          if (firstTopic) setTopicId(firstTopic._id);
          if (firstSubtopic) setSubtopicId(firstSubtopic._id);
        }

        const testsResponse = await api.get<Test[]>('/api/questions/tests');
        const testsData = testsResponse.data || [];
        setTests(testsData);
        if (testsData.length > 0) setSelectedTestId(testsData[0]._id);
      } catch (error) {
        setCurriculumError('Failed to load curriculum or tests from server.');
        console.error('Data load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!unitId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find((u) => u._id === unitId) || curriculum[0];
    const firstTopic = selectedUnit.topics?.[0];

    if (firstTopic && !selectedUnit.topics.some((t) => t._id === topicId)) {
      setTopicId(firstTopic._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, curriculum, topicId]);

  useEffect(() => {
    if (!topicId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find((u) => u._id === unitId) || curriculum[0];
    const selectedTopic = selectedUnit.topics?.find((t) => t._id === topicId);
    const firstSubtopic = selectedTopic?.subtopics?.[0];

    if (selectedTopic && !selectedTopic.subtopics.some((st) => st._id === subtopicId)) {
      setSubtopicId(firstSubtopic?._id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, curriculum, subtopicId, unitId]);

  const fetchQuestionCount = useCallback(async () => {
    if (destinationMode === 'test') {
      if (!selectedTestId) {
        setQuestionCount(0);
        return;
      }
      const selectedTest = tests.find((t) => t._id === selectedTestId);
      if (!selectedTest) {
        setQuestionCount(0);
        return;
      }
      try {
        const response = await api.get(`/api/questions/exam/count?testName=${encodeURIComponent(selectedTest.name)}`);
        setQuestionCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching exam count:', error);
      }
      return;
    }

    if (!topicId) {
      setQuestionCount(0);
      return;
    }

    try {
      let url = `/api/questions/stats/count?topicId=${encodeURIComponent(topicId)}`;
      if (subtopicId) url += `&subtopicId=${encodeURIComponent(subtopicId)}`;
      const response = await api.get(url);
      setQuestionCount(response.data.count);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  }, [destinationMode, selectedTestId, tests, topicId, subtopicId]);

  useEffect(() => {
    fetchQuestionCount();
  }, [fetchQuestionCount]);

  const handleQuickExtract = () => {
    if (!pastedContent.trim()) {
      showAlert('Please paste some content first!', { variant: 'warning' });
      return;
    }

    const subcategory = subtopicId || topicId;

    const blockQuestions = splitQuestionBlocks(pastedContent)
      .map((block, idx) => parseQuestionBlock(block, idx, subcategory))
      .filter((v): v is DraftQuestion => v !== null);

    if (blockQuestions.length > 0) {
      setBatch([...batch, ...blockQuestions]);
      setPastedContent('');
      setMessage(`Extracted ${blockQuestions.length} questions!`);
      return;
    }

    const questions = parseLineByLine(pastedContent, subcategory);

    if (questions.length === 0) {
      showAlert(
        'Could not find any questions in the pasted content. Please ensure questions are numbered (e.g., 1. What is...) and options are labeled (a, b, c, d).',
        { variant: 'error', title: 'No Questions Found' }
      );
      return;
    }

    setBatch([...batch, ...questions]);
    setPastedContent('');
    setMessage(`Extracted ${questions.length} questions!`);
  };

  const addManualQuestion = () => {
    const newQ: DraftQuestion = {
      id: Date.now(),
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: 'a',
      explanation: '',
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory: subtopicId || topicId,
    };
    setBatch([newQ, ...batch]);
  };

  const setStatus = (id: number, status: DraftQuestion['status']) => {
    if (status === 'APPROVED') {
      saveSingleQuestion(id);
    } else {
      setBatch(batch.map((q) => (q.id === id ? { ...q, status } : q)));
    }
  };

  const deleteQuestion = (id: number) => {
    setBatch(batch.filter((q) => q.id !== id));
  };

  const clearBatch = () => setBatch([]);

  const buildPayload = (q: DraftQuestion, selectedTest?: Test) => {
    if (destinationMode === 'test' && selectedTest) {
      return {
        testId: selectedTest._id,
        testName: selectedTest.name,
        type: detectQuestionType(q.question),
        question: q.question,
        questionImage: q.questionImage,
        options: q.options,
        optionImages: q.optionImages,
        correct_answer: q.correct_answer || 'a',
        explanation: q.explanation,
        explanationImage: q.explanationImage,
      };
    }
    return {
      unitId,
      topicId,
      subtopicId,
      type: detectQuestionType(q.question),
      question: q.question,
      questionImage: q.questionImage,
      options: q.options,
      optionImages: q.optionImages,
      correct_answer: q.correct_answer || 'a',
      explanation: q.explanation,
      explanationImage: q.explanationImage,
      status: 'accepted',
      is_published: false,
    };
  };

  const saveSingleQuestion = async (id: number) => {
    const q = batch.find((item) => item.id === id);
    if (!q) return;

    setLoading(true);
    try {
      if (destinationMode === 'test') {
        const selectedTest = tests.find((t) => t._id === selectedTestId);
        if (!selectedTest) throw new Error('No test selected');
        await api.post('/api/questions/exam', buildPayload(q, selectedTest));
      } else {
        await api.post('/api/questions', buildPayload(q));
      }
      setBatch(batch.filter((item) => item.id !== id));
      setMessage('Question saved successfully!');
      fetchQuestionCount();
    } catch (error: any) {
      setMessage('Error saving question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    const toSave = batch.filter((q) => q.status !== 'REJECTED');
    if (toSave.length === 0) {
      showAlert('No questions to save!', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      if (destinationMode === 'test') {
        const selectedTest = tests.find((t) => t._id === selectedTestId);
        if (!selectedTest) throw new Error('No test selected');
        for (const q of toSave) {
          await api.post('/api/questions/exam', buildPayload(q, selectedTest));
        }
      } else {
        for (const q of toSave) {
          await api.post('/api/questions', buildPayload(q));
        }
      }
      setMessage(`Successfully saved ${toSave.length} questions!`);
      setBatch([]);
      fetchQuestionCount();
    } catch (error: any) {
      setMessage('Error saving: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (curriculumLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Question Extractor</h1>
        <LoadingState message="Loading curriculum..." />
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Question Extractor</h1>
        <Banner variant="error" message={curriculumError} />
      </div>
    );
  }

  const units = curriculum;
  const selectedUnit = units.find((u) => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find((t) => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const progressPct = Math.min(100, (questionCount / 25) * 100);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Question Extractor</h1>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(30,41,59,0.055)]">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">01 &middot; Choose destination</h3>

        <div className="mb-5 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
            <input
              type="radio"
              name="destinationMode"
              checked={destinationMode === 'curriculum'}
              onChange={() => setDestinationMode('curriculum')}
              className="cursor-pointer accent-brand-600"
            />
            Extract to Curriculum
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
            <input
              type="radio"
              name="destinationMode"
              checked={destinationMode === 'test'}
              onChange={() => setDestinationMode('test')}
              className="cursor-pointer accent-brand-600"
            />
            Extract to Test
          </label>
        </div>

        {destinationMode === 'curriculum' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select label="Unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {units.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select label="Topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {subtopics.length > 0 && (
              <Select label="Subtopic" value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                {subtopics.map((st) => (
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
              <Select label="Select Test Name" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} wrapperClassName="max-w-sm">
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
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(30,41,59,0.055)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Progress for{' '}
            {destinationMode === 'test'
              ? tests.find((t) => t._id === selectedTestId)?.name || 'Selected Test'
              : subtopicId
                ? subtopics.find((st) => st._id === subtopicId)?.name
                : selectedTopic?.name || ''}
          </span>
          <span className={['text-sm font-bold', destinationMode !== 'test' && questionCount >= 25 ? 'text-success-600' : 'text-slate-500'].join(' ')}>
            {questionCount} {destinationMode === 'test' ? 'questions' : 'of 25 questions'} ready
          </span>
        </div>
        {destinationMode !== 'test' ? (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={['h-full rounded-full transition-all', questionCount >= 25 ? 'bg-success-500' : 'bg-brand-600'].join(' ')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className={['mt-2 text-xs', questionCount >= 25 ? 'font-semibold text-success-600' : 'text-slate-400'].join(' ')}>
              {questionCount >= 25 ? 'This subtopic is ready to go.' : `${25 - questionCount} more ${25 - questionCount === 1 ? 'question' : 'questions'} to complete this set.`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs font-semibold text-success-600">Questions will be saved into the ExamQuestions collection.</p>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(30,41,59,0.055)]">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">02 &middot; Paste source content</h3>
        <Textarea value={pastedContent} onChange={(e) => setPastedContent(e.target.value)} rows={5} placeholder="Enter the questions here" />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleQuickExtract} disabled={loading || !pastedContent.trim()} loading={loading}>
            Extract questions
          </Button>
        </div>
      </div>

      {message && <Banner variant={message.includes('Error') ? 'error' : 'success'} message={message} />}

      {batch.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">Review queue</span>
              <h3 className="text-lg font-bold text-slate-900">
                {batch.length} {batch.length === 1 ? 'question' : 'questions'} ready to review
              </h3>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={addManualQuestion}>
                + Add question
              </Button>
              <Button size="sm" onClick={saveAll} loading={loading}>
                Save all
              </Button>
              <Button variant="ghost" size="sm" onClick={clearBatch} className="text-danger-600 hover:bg-danger-50">
                Clear queue
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {batch.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Question {idx + 1}</h3>
                      <p className="text-xs text-slate-400">{detectQuestionType(q.question)}</p>
                    </div>
                  </div>
                  <span className={['rounded-full px-2.5 py-1 text-xs font-bold capitalize', statusBadgeClasses[q.status]].join(' ')}>{q.status}</span>
                </div>

                <QuestionForm question={q} onChange={(updatedQ) => setBatch(batch.map((item) => (item.id === q.id ? { ...item, ...updatedQ } : item)))} />

                <div className="mt-5 flex gap-3">
                  <Button onClick={() => setStatus(q.id, 'APPROVED')}>Save &amp; Accept</Button>
                  <Button variant="danger" onClick={() => setStatus(q.id, 'REJECTED')}>
                    Reject
                  </Button>
                  <Button variant="ghost" onClick={() => deleteQuestion(q.id)} className="text-danger-600 hover:bg-danger-50">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
