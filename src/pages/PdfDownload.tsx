import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import api from '../api';
import { getImagePreview } from '../lib/helpers';
import QuestionRenderer from '../components/QuestionRenderer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LoadingState } from '../components/ui/Spinner';
import type { CurriculumTree, ExamQuestion, OptionKey, Test } from '../types/models';

type SourceMode = null | 'units' | 'test';
type AnswerDisplay = 'none' | 'each' | 'end-key' | 'end-explanations';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

const renderAnswerKeyTable = (questionsList: ExamQuestion[]) => {
  const chunkSize = 10;
  const chunks: ExamQuestion[][] = [];
  for (let i = 0; i < questionsList.length; i += chunkSize) {
    chunks.push(questionsList.slice(i, i + chunkSize));
  }

  return (
    <div>
      {chunks.map((chunk, chunkIdx) => (
        <table key={chunkIdx} className="mb-4 w-full table-fixed border-collapse">
          <thead>
            <tr>
              {chunk.map((q, idx) => (
                <th key={q._id} className="border border-black bg-slate-100 p-1.5 text-center text-xs font-bold">
                  Q{chunkIdx * chunkSize + idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {chunk.map((q) => (
                <td key={q._id} className="border border-black p-2 text-center text-sm font-bold">
                  {q.correct_answer.toUpperCase()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  );
};

export default function PdfDownload() {
  const [sourceMode, setSourceMode] = useState<SourceMode>(null);

  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');

  const [examTitle, setExamTitle] = useState('C³ - Assessment Test');
  const [examSubtitle, setExamSubtitle] = useState('Duration: 1.5 Hours | Max Marks: 50');
  const [instructions, setInstructions] = useState('1. Attempt all questions.\n2. Each question carries equal marks.');

  const [layoutColumns, setLayoutColumns] = useState<'1' | '2'>('1');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [answerDisplay, setAnswerDisplay] = useState<AnswerDisplay>('end-key');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [curriculumResponse, testsResponse] = await Promise.all([
          api.get<CurriculumTree>('/api/questions/curriculum'),
          api.get<Test[]>('/api/questions/tests'),
        ]);
        setCurriculum(curriculumResponse.data || []);
        setTests(testsResponse.data || []);
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
    if (!sourceMode || curriculumLoading) return;

    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      setQuestionsError('');
      try {
        let fetchedQuestions: ExamQuestion[] = [];

        if (sourceMode === 'test') {
          if (selectedTestId) {
            const response = await api.get<ExamQuestion[]>('/api/questions/exam', { params: { testId: selectedTestId } });
            fetchedQuestions = response.data || [];
          }
        } else {
          const params: Record<string, string> = {};
          if (unitId && unitId !== 'all') params.unitId = unitId;
          if (topicId && topicId !== 'all') params.topicId = topicId;
          if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;

          const response = await api.get<ExamQuestion[]>('/api/questions', { params });
          fetchedQuestions = response.data || [];
        }

        setQuestions(fetchedQuestions);
        setSelectedQuestionIds(new Set(fetchedQuestions.map((q) => q._id)));
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestionsError('Failed to fetch questions matching the criteria.');
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [sourceMode, unitId, topicId, subtopicId, selectedTestId, curriculumLoading]);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnitId(e.target.value);
    setTopicId('all');
    setSubtopicId('all');
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopicId(e.target.value);
    setSubtopicId('all');
  };

  const toggleQuestionSelection = (id: string) => {
    const updated = new Set(selectedQuestionIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setSelectedQuestionIds(updated);
  };

  const selectAllQuestions = () => setSelectedQuestionIds(new Set(questions.map((q) => q._id)));
  const deselectAllQuestions = () => setSelectedQuestionIds(new Set());

  const handlePrint = () => window.print();

  const exportToWord = () => {
    const documentElement = document.querySelector('.assessment-document');
    if (!documentElement) return;

    const htmlContent = documentElement.innerHTML;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${examTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
            margin: 1in;
          }
          h1, h2, h3, h4 {
            font-family: 'Times New Roman', Times, serif;
            margin: 0;
            padding: 0;
          }
          .document-header {
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 3px double #000000;
            padding-bottom: 12px;
          }
          .doc-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .doc-subtitle {
            font-size: 11pt;
            font-style: italic;
            margin-bottom: 12px;
          }
          .curriculum-header {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 12px;
          }
          .doc-instructions {
            text-align: left;
            border: 1px solid #000000;
            padding: 10px;
            margin-top: 12px;
            margin-bottom: 20px;
          }
          .doc-instructions ul {
            margin-top: 4px;
            margin-left: 20px;
            padding-left: 0;
          }
          .questions-grid {
            display: table;
            width: 100%;
          }
          .doc-question-card {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .doc-question-header {
            margin-bottom: 6px;
          }
          .question-number {
            font-weight: bold;
            margin-right: 6px;
          }
          .question-text {
            font-weight: normal;
          }
          .doc-options-grid {
            margin-left: 24px;
            margin-bottom: 12px;
          }
          .doc-option-item {
            margin-bottom: 4px;
          }
          .option-label {
            font-weight: bold;
            margin-right: 6px;
          }
          .doc-inline-answer {
            margin-top: 8px;
            margin-left: 24px;
            border-left: 3px solid #059669;
            padding-left: 10px;
            color: #059669;
          }
          .answer-badge {
            font-weight: bold;
          }
          .explanation-text-box {
            color: #4b5563;
            font-size: 10pt;
          }
          .document-answer-key {
            margin-top: 30px;
            border-top: 2px solid #000000;
            padding-top: 15px;
            page-break-before: always;
          }
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .compact-key-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .compact-key-table td {
            border: 1px solid #000000;
            padding: 6px;
            text-align: center;
          }
          .document-explanations-key {
            margin-top: 30px;
            border-top: 2px solid #000000;
            padding-top: 15px;
            page-break-before: always;
          }
          .explanation-detail-item {
            border-bottom: 1px dashed #cccccc;
            padding-bottom: 12px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .matching-columns-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-top: 8px;
            margin-bottom: 12px;
          }
          .matching-columns-table td {
            border: none;
            padding: 4px 12px 4px 0;
            vertical-align: top;
            width: 50%;
          }
          .matching-column-header-inline {
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 6px;
          }
          .ar-container-inline {
            margin-left: 26px;
            margin-top: 6px;
            margin-bottom: 12px;
          }
          .ar-line-item {
            margin: 4px 0;
            font-weight: 500;
            line-height: 1.45;
          }
        </style>
      </head>
      <body>
    `;
    const footer = '</body></html>';

    const source = header + htmlContent + footer;
    const blob = new Blob(['\ufeff' + source], { type: 'application/msword' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_assessment.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (curriculumLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Assessment Generator</h1>
        <LoadingState message="Loading curriculum..." />
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Assessment Generator</h1>
        <p className="font-medium text-danger-600">{curriculumError}</p>
      </div>
    );
  }

  if (!sourceMode) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Assessment Generator</h1>
        <div className="flex flex-col items-center py-16">
          <h3 className="mb-1 text-lg font-bold text-slate-900">What would you like to generate a question paper from?</h3>
          <p className="mb-7 text-sm text-slate-500">Choose a source to continue.</p>
          <div className="flex max-w-2xl flex-wrap justify-center gap-5">
            <button
              onClick={() => setSourceMode('units')}
              className="min-w-55 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-7 text-left text-base font-bold text-slate-900 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
            >
              Units (Curriculum)
              <div className="mt-2 text-xs font-normal text-slate-500">Build a paper from Unit / Topic / Subtopic curriculum questions.</div>
            </button>
            <button
              onClick={() => setSourceMode('test')}
              className="min-w-55 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-7 text-left text-base font-bold text-slate-900 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
            >
              Test
              <div className="mt-2 text-xs font-normal text-slate-500">Download the question set belonging to a specific exam Test.</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedUnit = curriculum.find((u) => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find((t) => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const printableQuestions = questions.filter((q) => selectedQuestionIds.has(q._id));

  return (
    <div className="mx-auto max-w-350">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Assessment Generator</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        {/* Config Panel */}
        <div className="no-print flex flex-col gap-5">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Filter Questions</h3>
                <p className="mt-0.5 text-xs text-slate-400">Source: {sourceMode === 'test' ? 'Test' : 'Units (Curriculum)'}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSourceMode(null);
                  setSelectedTestId('');
                  setUnitId('');
                  setTopicId('');
                  setSubtopicId('');
                }}
              >
                Change Source
              </Button>
            </div>

            {sourceMode === 'test' ? (
              <div>
                {tests.length > 0 ? (
                  <Select label="Select Test" value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                    <option value="">Select a test...</option>
                    {tests.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} {t.publishToStudent ? '(Published)' : '(Draft)'}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="py-2 font-medium text-danger-600">No tests available. Please create a test first.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Select label="Unit" value={unitId} onChange={handleUnitChange}>
                  <option value="all">All Units</option>
                  {curriculum.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select label="Topic" value={topicId} onChange={handleTopicChange} disabled={!unitId || unitId === 'all'}>
                    <option value="all">All Topics</option>
                    {topics.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <Select label="Subtopic" value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)} disabled={!topicId || topicId === 'all'}>
                    <option value="all">All Subtopics</option>
                    {subtopics.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Assessment Details</h3>
            <div className="flex flex-col gap-4">
              <Input label="Exam Title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="e.g. Unit 1 Examination" />
              <Input
                label="Subtitle / Metadata"
                value={examSubtitle}
                onChange={(e) => setExamSubtitle(e.target.value)}
                placeholder="e.g. Subject: Strength of Materials | Time: 1 hr"
              />
              <Textarea label="General Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Enter instructions, one per line..." />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Layout Preferences</h3>
            <div className="flex flex-col gap-4">
              <Select label="Answers & Explanations" value={answerDisplay} onChange={(e) => setAnswerDisplay(e.target.value as AnswerDisplay)}>
                <option value="none">Exclude Answers (Student Question Paper)</option>
                <option value="each">Show Answer directly under each question</option>
                <option value="end-key">Include Answer Key at the end of PDF</option>
                <option value="end-explanations">Include Answer Key & Explanations at the end</option>
              </Select>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select label="Columns Layout" value={layoutColumns} onChange={(e) => setLayoutColumns(e.target.value as '1' | '2')}>
                  <option value="1">1 Column (Standard)</option>
                  <option value="2">2 Columns (Compact/Exam Style)</option>
                </Select>
                <Select label="Text Size" value={fontSize} onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </Select>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" onClick={handlePrint} disabled={printableQuestions.length === 0}>
                  Export as PDF
                </Button>
                <Button className="flex-1" variant="secondary" onClick={exportToWord} disabled={printableQuestions.length === 0}>
                  Export as Word
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Select Questions</h3>
              <p className="text-xs text-slate-400">
                Selected {selectedQuestionIds.size} of {questions.length}
              </p>
            </div>
            <div className="mb-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={selectAllQuestions}>
                Select All
              </Button>
              <Button size="sm" variant="secondary" onClick={deselectAllQuestions}>
                Deselect All
              </Button>
            </div>

            {loadingQuestions ? (
              <p className="text-sm text-slate-500">Loading matching questions...</p>
            ) : questionsError ? (
              <p className="text-sm font-medium text-danger-600">{questionsError}</p>
            ) : questions.length === 0 ? (
              <p className="text-sm text-slate-400">No questions found matching your filter criteria.</p>
            ) : (
              <div className="scrollbar-thin flex max-h-96 flex-col gap-1 overflow-y-auto">
                {questions.map((q, index) => (
                  <label key={q._id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q._id)}
                      onChange={() => toggleQuestionSelection(q._id)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <span className="font-semibold text-slate-500">{index + 1}.</span>
                    <span className="text-slate-700">{q.question}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Preview Panel */}
        <Card className={`p-4 font-size-${fontSize} sm:p-6`}>
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Question Paper Preview</h3>
            <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700">
              {printableQuestions.length} {printableQuestions.length === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          {printableQuestions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText className="mb-3 size-8 text-slate-300" />
              <h4 className="font-semibold text-slate-700">No questions selected</h4>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Select filter criteria and check at least one question in the left panel to populate the assessment preview.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <div className="assessment-document">
              <div className="document-header mb-6 border-b-2 border-double border-slate-900 pb-4 text-center">
                <h1 className="doc-title text-xl font-bold uppercase tracking-tight">{examTitle}</h1>
                <p className="doc-subtitle mt-1 text-sm italic text-slate-600">{examSubtitle}</p>
                <div className="curriculum-header mt-2 text-xs font-bold text-slate-700">
                  {sourceMode === 'test' ? (
                    <p>
                      <strong>{tests.find((t) => t._id === selectedTestId)?.name || 'Selected Test'}</strong>
                    </p>
                  ) : (
                    <p>
                      <strong>{selectedUnit?.name || 'All Units'}</strong>
                      {selectedTopic?.name && topicId !== 'all' && ` - ${selectedTopic.name}`}
                      {subtopicId !== 'all' && subtopicId && subtopics.find((st) => st._id === subtopicId)?.name && ` (${subtopics.find((st) => st._id === subtopicId)?.name})`}
                    </p>
                  )}
                </div>
                {instructions && (
                  <div className="doc-instructions mt-3 rounded-md border border-slate-300 p-3 text-left text-sm">
                    <strong>General Instructions:</strong>
                    <ul className="ml-5 mt-1 list-decimal">
                      {instructions.split('\n').filter((line) => line.trim() !== '').map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className={`questions-grid cols-${layoutColumns} ${layoutColumns === '2' ? 'grid grid-cols-2 gap-x-8' : 'flex flex-col'}`}>
                {printableQuestions.map((q, index) => (
                  <div key={q._id} className="doc-question-card mb-5">
                    <div className="doc-question-header mb-1.5">
                      <span className="question-number font-bold">Q{index + 1}.</span>
                      <span className="question-body">
                        <QuestionRenderer question={q} />
                        {q.questionImage && (
                          <div className="mt-2">
                            <img src={getImagePreview(q.questionImage) ?? undefined} alt={`Question ${index + 1}`} className="max-h-56 rounded-md border border-slate-200 object-contain" />
                          </div>
                        )}
                      </span>
                    </div>

                    <div className="doc-options-grid ml-6 mb-3 flex flex-col gap-1">
                      {OPTION_KEYS.map((opt) => {
                        const hasText = q.options && q.options[opt];
                        const imgUrl = q.optionImages && q.optionImages[opt];
                        if (!hasText && !imgUrl) return null;

                        return (
                          <div key={opt} className="doc-option-item text-sm">
                            <span className="option-label font-bold">({opt.toUpperCase()})</span>{' '}
                            {hasText && <span className="option-text">{q.options[opt]}</span>}
                            {imgUrl && (
                              <div className="mt-1">
                                <img src={getImagePreview(imgUrl) ?? undefined} alt={`Option ${opt.toUpperCase()}`} className="max-h-32 rounded-md border border-slate-200" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {answerDisplay === 'each' && (
                      <div className="doc-inline-answer ml-6 mt-2 border-l-2 border-success-600 pl-2.5 text-success-600">
                        <span className="answer-badge font-bold">Correct Answer: {q.correct_answer.toUpperCase()}</span>
                        {q.explanation && (
                          <div className="explanation-text-box mt-1 text-xs text-slate-500">
                            <strong>Explanation:</strong> {q.explanation}
                            {q.explanationImage && (
                              <div className="mt-1">
                                <img src={getImagePreview(q.explanationImage) ?? undefined} alt="Explanation" className="max-h-40 rounded-md border border-slate-200" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {answerDisplay === 'end-key' && (
                <div className="document-answer-key page-break-before mt-8 border-t-2 border-slate-900 pt-4">
                  <h2 className="section-title mb-3 text-center text-lg font-bold uppercase">Answer Key</h2>
                  {renderAnswerKeyTable(printableQuestions)}
                </div>
              )}

              {answerDisplay === 'end-explanations' && (
                <div className="document-explanations-key page-break-before mt-8 border-t-2 border-slate-900 pt-4">
                  <h2 className="section-title mb-3 text-center text-lg font-bold uppercase">Answers &amp; Detailed Explanations</h2>
                  <div className="flex flex-col gap-4">
                    {printableQuestions.map((q, index) => (
                      <div key={q._id} className="explanation-detail-item border-b border-dashed border-slate-300 pb-3">
                        <h4 className="mb-1 text-sm font-bold">
                          Q{index + 1}. Correct Answer: <span className="ans-highlight text-success-600">{q.correct_answer.toUpperCase()}</span>
                        </h4>
                        <div className="original-q-text mb-2 whitespace-pre-wrap text-sm text-slate-600">
                          <em>Question:</em> <QuestionRenderer question={q} />
                        </div>
                        {q.explanation ? (
                          <div className="ex-content text-sm">
                            <strong>Explanation:</strong> {q.explanation}
                            {q.explanationImage && (
                              <div className="mt-1">
                                <img src={getImagePreview(q.explanationImage) ?? undefined} alt={`Explanation ${index + 1}`} className="max-h-40 rounded-md border border-slate-200" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm italic text-slate-400">No explanation provided for this question.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
