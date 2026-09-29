import { useCallback, useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import { parseQuestionBlock, parseLineByLine, parseOneQuestionPerLine, splitQuestionBlocks } from '../lib/questionParser';
import type { DraftQuestion } from '../lib/questionParser';
import QuestionForm from '../components/QuestionForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Select, Textarea } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import type { CurriculumTree, Exam, Test } from '../types/models';

type DestinationMode = 'curriculum' | 'test';

const statusBadgeClasses: Record<DraftQuestion['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-success-soft text-success-600',
  REJECTED: 'bg-danger-soft text-danger-600',
};

export default function AIGenerator() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [destinationMode, setDestinationMode] = useState<DestinationMode>('curriculum');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [partName, setPartName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionCounts, setSectionCounts] = useState<{ part: string; section: string; count: number }[]>([]);

  const [pastedContent, setPastedContent] = useState('');
  const [batch, setBatch] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedTest = tests.find((t) => t._id === selectedTestId);
  const pattern = selectedTest?.pattern;
  const selectedPart = pattern?.find((p) => p.name === partName);
  const selectedSection = selectedPart?.sections.find((s) => s.name === sectionName);
  const currentMarks = selectedSection?.marksPerQuestion ?? 1;

  const getSectionCapacity = (part: string, section: string, target: number) => {
    const saved = sectionCounts.find((c) => c.part === part && c.section === section)?.count || 0;
    const queued = batch.filter((q) => q.part === part && q.section === section && q.status !== 'REJECTED').length;
    return { saved, queued, remaining: Math.max(0, target - saved - queued) };
  };
  const currentSectionCapacity = selectedSection ? getSectionCapacity(partName, sectionName, selectedSection.numQuestions) : null;

  useEffect(() => {
    if (!pattern || pattern.length === 0) {
      setPartName('');
      setSectionName('');
      return;
    }
    if (!pattern.some((p) => p.name === partName)) {
      setPartName(pattern[0].name);
    }
  }, [selectedTestId, pattern]);

  useEffect(() => {
    if (!selectedPart) return;
    if (!selectedPart.sections.some((s) => s.name === sectionName)) {
      setSectionName(selectedPart.sections[0]?.name || '');
    }
  }, [partName, selectedPart]);

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
    const loadCurriculum = async () => {
      setCurriculumLoading(true);
      try {
        const [currResponse, testsResponse] = await Promise.all([
          api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId } }),
          api.get<Test[]>('/api/questions/tests', { params: { examId } }),
        ]);
        const currData = currResponse.data || [];
        setCurriculum(currData);

        const firstUnit = currData[0];
        const firstTopic = firstUnit?.topics?.[0];
        const firstSubtopic = firstTopic?.subtopics?.[0];

        setUnitId(firstUnit?._id || '');
        setTopicId(firstTopic?._id || '');
        setSubtopicId(firstSubtopic?._id || '');

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

    loadCurriculum();
  }, [examId]);

  useEffect(() => {
    if (!unitId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find((u) => u._id === unitId) || curriculum[0];
    const firstTopic = selectedUnit.topics?.[0];

    if (firstTopic && !selectedUnit.topics.some((t) => t._id === topicId)) {
      setTopicId(firstTopic._id);
    }
  }, [unitId, curriculum, topicId]);

  useEffect(() => {
    if (!topicId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find((u) => u._id === unitId) || curriculum[0];
    const selectedTopic = selectedUnit.topics?.find((t) => t._id === topicId);
    const firstSubtopic = selectedTopic?.subtopics?.[0];

    if (selectedTopic && !selectedTopic.subtopics.some((st) => st._id === subtopicId)) {
      setSubtopicId(firstSubtopic?._id || '');
    }
  }, [topicId, curriculum, subtopicId, unitId]);

  const fetchQuestionCount = useCallback(async () => {
    if (destinationMode === 'test') {
      if (!selectedTestId || !selectedTest) {
        setQuestionCount(0);
        setSectionCounts([]);
        return;
      }
      setCountLoading(true);
      try {
        const response = await api.get(`/api/questions/exam/count?testName=${encodeURIComponent(selectedTest.name)}`);
        setQuestionCount(response.data.count || 0);

        if (pattern && pattern.length > 0) {
          const sectionResponse = await api.get('/api/questions/exam/section-counts', {
            params: { testName: selectedTest.name },
          });
          setSectionCounts(sectionResponse.data || []);
        } else {
          setSectionCounts([]);
        }
      } catch (error) {
        console.error('Error fetching exam count:', error);
      } finally {
        setCountLoading(false);
      }
      return;
    }

    if (!topicId) {
      setQuestionCount(0);
      return;
    }

    setCountLoading(true);
    try {
      let url = `/api/questions/stats/count?topicId=${encodeURIComponent(topicId)}`;
      if (subtopicId) url += `&subtopicId=${encodeURIComponent(subtopicId)}`;
      const response = await api.get(url);
      setQuestionCount(response.data.count);
    } catch (error) {
      console.error('Error fetching count:', error);
    } finally {
      setCountLoading(false);
    }
  }, [destinationMode, selectedTestId, selectedTest, pattern, topicId, subtopicId]);

  useEffect(() => {
    setHasSearched(false);
    setQuestionCount(0);
  }, [destinationMode, examId, unitId, topicId, subtopicId, selectedTestId]);

  const handleSubmitFilters = () => {
    setHasSearched(true);
    fetchQuestionCount();
  };

  const tagAndClampForDestination = (questions: DraftQuestion[]): { accepted: DraftQuestion[]; skipped: number } => {
    if (destinationMode !== 'test' || !pattern || pattern.length === 0) return { accepted: questions, skipped: 0 };

    const tagged = questions.map((q) => ({ ...q, part: partName, section: sectionName, marksValue: currentMarks }));
    if (!selectedSection) return { accepted: tagged, skipped: 0 };

    const remaining = currentSectionCapacity?.remaining ?? selectedSection.numQuestions;
    return { accepted: tagged.slice(0, remaining), skipped: Math.max(0, tagged.length - remaining) };
  };

  const handleQuickExtract = () => {
    if (!pastedContent.trim()) {
      toast.warning('Please paste some content first!');
      return;
    }

    if (destinationMode === 'test' && selectedSection && (currentSectionCapacity?.remaining ?? 0) <= 0) {
      toast.error(`"${sectionName}" in "${partName}" is already full (${selectedSection.numQuestions}/${selectedSection.numQuestions}). Pick a different section.`);
      return;
    }

    const subcategory = subtopicId || topicId;
    let raw: DraftQuestion[] = splitQuestionBlocks(pastedContent)
      .map((block, idx) => parseQuestionBlock(block, idx, subcategory))
      .filter((v): v is DraftQuestion => v !== null);

    if (raw.length === 0) {
      raw = parseLineByLine(pastedContent, subcategory);
    }
    if (raw.length === 0) {
      raw = parseOneQuestionPerLine(pastedContent, subcategory);
    }

    if (raw.length === 0) {
      toast.error(
        'Could not find any questions in the pasted content. Please ensure questions are numbered (e.g., 1. What is...) and options are labeled (a, b, c, d).'
      );
      return;
    }

    const { accepted, skipped } = tagAndClampForDestination(raw);
    setBatch([...batch, ...accepted]);
    setPastedContent('');

    if (skipped > 0) {
      toast.warning(
        `Extracted ${accepted.length} of ${raw.length} questions — "${sectionName}" only had room for ${accepted.length} more. The rest were left out; paste them into a different section.`
      );
    } else {
      toast.success(`Extracted ${accepted.length} question${accepted.length === 1 ? '' : 's'}!`);
    }
  };

  const addManualQuestion = () => {
    if (destinationMode === 'test' && selectedSection && (currentSectionCapacity?.remaining ?? 0) <= 0) {
      toast.error(`"${sectionName}" in "${partName}" is already full (${selectedSection.numQuestions}/${selectedSection.numQuestions}). Pick a different section.`);
      return;
    }

    const newQ: DraftQuestion = {
      id: Date.now(),
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: 'a',
      answerType: 'single',
      explanation: '',
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory: subtopicId || topicId,
      ...(destinationMode === 'test' && pattern && pattern.length > 0 ? { part: partName, section: sectionName, marksValue: currentMarks } : {}),
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
    const answerType = q.answerType || 'single';
    const correctAnswer = answerType === 'single' && !q.correct_answer ? 'a' : q.correct_answer;

    if (destinationMode === 'test' && selectedTest) {
      return {
        testId: selectedTest._id,
        testName: selectedTest.name,
        part: q.part || '',
        section: q.section || '',
        marks: q.marksValue ?? 1,
        type: detectQuestionType(q.question),
        answerType,
        question: q.question,
        questionImage: q.questionImage,
        options: q.options,
        optionImages: q.optionImages,
        correct_answer: correctAnswer,
        explanation: q.explanation,
        explanationImage: q.explanationImage,
      };
    }

    return {
      unitId,
      topicId,
      subtopicId,
      type: detectQuestionType(q.question),
      answerType,
      question: q.question,
      questionImage: q.questionImage,
      options: q.options,
      optionImages: q.optionImages,
      correct_answer: correctAnswer,
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
      toast.success('Question saved successfully!');
      setHasSearched(true);
      fetchQuestionCount();
    } catch (error: any) {
      toast.error('Error saving question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    const toSave = batch.filter((q) => q.status !== 'REJECTED');
    if (toSave.length === 0) {
      toast.warning('No questions to save!');
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
      toast.success(`Successfully saved ${toSave.length} questions!`);
      setBatch([]);
      setHasSearched(true);
      fetchQuestionCount();
    } catch (error: any) {
      toast.error('Error saving: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const pageHeader = (
    <div className="mb-6 flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Lightbulb className="size-5" />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Question Extractor</h1>
        <p className="mt-0.5 text-sm text-slate-500">Paste raw content and turn it into review-ready questions</p>
      </div>
    </div>
  );

  if (curriculumLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {pageHeader}
        <LoadingState message="Loading curriculum..." />
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {pageHeader}
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
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      {pageHeader}

      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">01 &middot; Choose destination</h3>

        <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setDestinationMode('curriculum')}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              destinationMode === 'curriculum' ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Extract to Curriculum
          </button>
          <button
            type="button"
            onClick={() => setDestinationMode('test')}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              destinationMode === 'test' ? 'bg-white text-brand-700 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            Extract to Test
          </button>
        </div>

        {destinationMode === 'curriculum' && (
          <div className="flex flex-col gap-4">
            {exams.length > 0 ? (
              <Select label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)} wrapperClassName="max-w-sm">
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="py-2 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p>
            )}
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
          </div>
        )}

        {destinationMode === 'test' && (
          <div className="flex flex-col gap-4">
            {exams.length > 0 ? (
              <Select label="Exam" value={examId} onChange={(e) => setExamId(e.target.value)} wrapperClassName="max-w-sm">
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="py-2 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p>
            )}
            {tests.length > 0 ? (
              <Select label="Select Test Name" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} wrapperClassName="max-w-sm">
                {tests.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} {t.publishToStudent ? '(Published)' : '(Draft)'}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="py-2 font-medium text-danger-600">No tests available for this exam. Please configure one first.</p>
            )}

            {pattern && pattern.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Part" value={partName} onChange={(e) => setPartName(e.target.value)}>
                  {pattern.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Select label="Section" value={sectionName} onChange={(e) => setSectionName(e.target.value)}>
                  {selectedPart?.sections.map((s) => {
                    const cap = getSectionCapacity(partName, s.name, s.numQuestions);
                    const full = cap.remaining <= 0;
                    return (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.marksPerQuestion} mark{s.marksPerQuestion === 1 ? '' : 's'} each) — {cap.saved + cap.queued}/{s.numQuestions}
                        {full ? ' (Full)' : ''}
                      </option>
                    );
                  })}
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSubmitFilters}
            loading={countLoading}
            disabled={destinationMode === 'test' ? !selectedTestId : !topicId}
          >
            Submit
          </Button>
        </div>
      </Card>

      {hasSearched && (
        <Card className="mb-6 p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Progress for{' '}
              {destinationMode === 'test'
                ? tests.find((t) => t._id === selectedTestId)?.name || 'Selected Test'
                : subtopicId
                  ? subtopics.find((st) => st._id === subtopicId)?.name
                  : selectedTopic?.name || ''}
            </span>
            <span className={['text-sm font-bold', destinationMode === 'curriculum' && questionCount >= 25 ? 'text-success-600' : 'text-slate-500'].join(' ')}>
              {questionCount} {destinationMode === 'curriculum' ? 'of 25 questions' : 'questions'} ready
            </span>
          </div>
          {destinationMode === 'curriculum' ? (
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

          {destinationMode === 'test' && pattern && pattern.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
              {pattern.map((p) => (
                <div key={p.name}>
                  <p className="mb-1.5 text-xs font-semibold text-slate-600">{p.name}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {p.sections.map((s) => {
                      const count = sectionCounts.find((c) => c.part === p.name && c.section === s.name)?.count || 0;
                      const done = count >= s.numQuestions;
                      return (
                        <div key={s.name} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">{s.name}</span>
                            <span className={['font-bold', done ? 'text-success-600' : 'text-slate-500'].join(' ')}>
                              {count} / {s.numQuestions}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={['h-full rounded-full transition-all', done ? 'bg-success-500' : 'bg-brand-600'].join(' ')}
                              style={{ width: `${Math.min(100, (count / s.numQuestions) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mb-6 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">02 &middot; Paste source content</h3>
        <Textarea value={pastedContent} onChange={(e) => setPastedContent(e.target.value)} rows={5} placeholder="Enter the questions here" />
        {destinationMode === 'test' && selectedSection && (currentSectionCapacity?.remaining ?? 0) <= 0 && (
          <p className="mt-2 text-xs font-semibold text-danger-600">
            "{sectionName}" is already full ({selectedSection.numQuestions}/{selectedSection.numQuestions}). Pick a different section before extracting.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleQuickExtract}
            disabled={loading || !pastedContent.trim() || (destinationMode === 'test' && !!selectedSection && (currentSectionCapacity?.remaining ?? 0) <= 0)}
            loading={loading}
          >
            Extract questions
          </Button>
        </div>
      </Card>

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
              <Card key={q.id} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Question {idx + 1}</h3>
                      <p className="text-xs text-slate-400">
                        {detectQuestionType(q.question)}
                        {q.part && q.section && ` · ${q.part} · ${q.section} · ${q.marksValue ?? 1} mark${(q.marksValue ?? 1) === 1 ? '' : 's'}`}
                      </p>
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
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
