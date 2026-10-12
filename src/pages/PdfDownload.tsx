import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { BookOpen, ClipboardList, Download } from 'lucide-react';
import api from '../api';
import Button from '../components/ui/Button';
import { PageHeader, PageLayout, Panel } from '../components/ui';
import EntitySelect from '../components/catalog/EntitySelect';
import ExamSelect from '../components/catalog/ExamSelect';
import TestSelect from '../components/catalog/TestSelect';
import QuestionPickerPanel from '../components/pdf/QuestionPickerPanel';
import PaperSettingsPanels, { DEFAULT_PAPER_SETTINGS } from '../components/pdf/PaperSettingsPanels';
import PaperPreview from '../components/pdf/PaperPreview';
import useExamCatalog from '../hooks/useExamCatalog';
import type { ExamQuestion } from '../types/models';

type SourceMode = null | 'units' | 'test';

const HEADER = {
  icon: Download,
  title: 'PDF Download',
  subtitle: 'Build a printable question paper and export it as PDF or Word',
};

interface SourceOptionCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function SourceOptionCard({ icon: Icon, title, description, onClick }: SourceOptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/30 focus-visible:border-brand-500"
    >
      <span className="mb-4 flex size-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Icon className="size-4" />
      </span>
      <div className="font-heading text-base font-bold text-slate-900">{title}</div>
      <div className="mt-1 flex-1 text-sm text-slate-500">{description}</div>
      <div className="mt-4 text-[13px] font-medium text-brand-600 group-hover:text-brand-700">Choose &rarr;</div>
    </button>
  );
}

export default function PdfDownload() {
  const [sourceMode, setSourceMode] = useState<SourceMode>(null);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');

  const { exams, examId, setExamId, curriculum, tests, loading: curriculumLoading, error: curriculumError } = useExamCatalog((_tree, examTests) => {
    setUnitId('all');
    setTopicId('all');
    setSubtopicId('all');
    setSelectedTestId(examTests[0]?._id || '');
  });

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_PAPER_SETTINGS);

  // Only the latest load may fill the page: a slow answer for old filters is dropped.
  const latestLoad = useRef(0);

  // Any change to the source or filters means the loaded questions no longer match.
  useEffect(() => {
    latestLoad.current += 1;
    setHasSearched(false);
    setLoadingQuestions(false);
    setQuestionsError('');
    setQuestions([]);
    setSelectedIds(new Set());
  }, [sourceMode, examId, unitId, topicId, subtopicId, selectedTestId]);

  const loadQuestions = async () => {
    if (!sourceMode) return;
    const load = ++latestLoad.current;
    setHasSearched(true);
    setLoadingQuestions(true);
    setQuestionsError('');
    try {
      let fetched: ExamQuestion[] = [];
      if (sourceMode === 'test') {
        // Already in the test's pattern order.
        if (selectedTestId) fetched = (await api.get<ExamQuestion[]>('/api/questions/exam', { params: { testId: selectedTestId } })).data || [];
      } else {
        const params: Record<string, string> = {};
        if (unitId && unitId !== 'all') params.unitId = unitId;
        if (topicId && topicId !== 'all') params.topicId = topicId;
        if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;
        const all = (await api.get<ExamQuestion[]>('/api/questions', { params })).data || [];
        // Rejected questions don't belong on a paper. The list comes newest first, so put it in the order it was written.
        fetched = all.filter((q) => q.status !== 'rejected').sort((a, b) => Date.parse(a.timestamp ?? '') - Date.parse(b.timestamp ?? '') || 0);
      }
      if (load !== latestLoad.current) return;
      setQuestions(fetched);
      setSelectedIds(new Set(fetched.map((q) => q._id)));
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      if (load !== latestLoad.current) return;
      setQuestionsError(error.response?.data?.message || 'Failed to fetch questions matching the criteria.');
    } finally {
      if (load === latestLoad.current) setLoadingQuestions(false);
    }
  };

  const changeSource = () => {
    setSourceMode(null);
    setSelectedTestId('');
    setUnitId('');
    setTopicId('');
    setSubtopicId('');
  };

  if (curriculumLoading || curriculumError || !sourceMode) {
    return (
      <PageLayout {...HEADER} loading={curriculumLoading} loadingMessage="Loading curriculum..." loadingVariant="form" error={curriculumError}>
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-slate-900">Choose a source</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">Where should the questions for this paper come from?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SourceOptionCard
              icon={BookOpen}
              title="Units (Curriculum)"
              description="Build a paper from Unit / Topic / Subtopic curriculum questions."
              onClick={() => setSourceMode('units')}
            />
            <SourceOptionCard
              icon={ClipboardList}
              title="Test"
              description="Download the question set belonging to a specific exam Test."
              onClick={() => setSourceMode('test')}
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  const selectedUnit = curriculum.find((u) => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find((t) => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];
  const selectedSubtopic = subtopicId !== 'all' ? subtopics.find((st) => st._id === subtopicId) : undefined;

  const sourceHeading =
    sourceMode === 'test' ? (
      <strong>{tests.find((t) => t._id === selectedTestId)?.name || 'Selected Test'}</strong>
    ) : (
      <>
        <strong>{selectedUnit?.name || 'All Units'}</strong>
        {selectedTopic?.name && topicId !== 'all' && ` - ${selectedTopic.name}`}
        {selectedSubtopic?.name && ` (${selectedSubtopic.name})`}
      </>
    );

  return (
    <div className="mx-auto max-w-350">
      <PageHeader {...HEADER} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="no-print flex flex-col gap-5">
          <Panel
            step={1}
            title="Filter questions"
            description={`Source: ${sourceMode === 'test' ? 'a test' : 'units (curriculum)'}`}
            actions={
              <Button size="sm" variant="ghost" onClick={changeSource}>
                Change source
              </Button>
            }
            footer={
              <Button onClick={loadQuestions} loading={loadingQuestions} disabled={sourceMode === 'test' ? !selectedTestId : !unitId}>
                Load questions
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              <ExamSelect exams={exams} value={examId} onChange={setExamId} />
              {sourceMode === 'test' ? (
                <TestSelect tests={tests} value={selectedTestId} onChange={setSelectedTestId} withPlaceholder />
              ) : (
                <>
                  <EntitySelect
                    label="Unit"
                    items={curriculum}
                    value={unitId}
                    onChange={(id) => {
                      setUnitId(id);
                      setTopicId('all');
                      setSubtopicId('all');
                    }}
                    leadingOption={{ value: 'all', label: 'All units' }}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <EntitySelect
                      label="Topic"
                      items={topics}
                      value={topicId}
                      onChange={(id) => {
                        setTopicId(id);
                        setSubtopicId('all');
                      }}
                      leadingOption={{ value: 'all', label: 'All topics' }}
                      disabled={!unitId || unitId === 'all'}
                    />
                    <EntitySelect
                      label="Subtopic"
                      items={subtopics}
                      value={subtopicId}
                      onChange={setSubtopicId}
                      leadingOption={{ value: 'all', label: 'All subtopics' }}
                      disabled={!topicId || topicId === 'all'}
                    />
                  </div>
                </>
              )}
            </div>
          </Panel>

          <QuestionPickerPanel
            questions={questions}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            loading={loadingQuestions}
            error={questionsError}
            hasSearched={hasSearched}
          />

          <PaperSettingsPanels settings={settings} onChange={setSettings} />
        </div>

        <PaperPreview questions={questions.filter((q) => selectedIds.has(q._id))} settings={settings} sourceHeading={sourceHeading} />
      </div>
    </div>
  );
}
