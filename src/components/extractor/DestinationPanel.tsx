import { Panel, SegmentedControl } from '../ui';
import Button from '../ui/Button';
import { Select } from '../ui/Field';
import EntitySelect from '../catalog/EntitySelect';
import ExamSelect from '../catalog/ExamSelect';
import TestSelect from '../catalog/TestSelect';
import { useExtractorQueue } from '../../stores/extractorQueueStore';
import { sectionCapacity } from './capacity';
import type { ExtractorDestination, ExtractorMode } from '../../hooks/useExtractorDestination';

const MODE_OPTIONS: { value: ExtractorMode; label: string }[] = [
  { value: 'curriculum', label: 'Extract to Curriculum' },
  { value: 'test', label: 'Extract to Test' },
];

/** Step 1: where extracted questions are saved. */
export default function DestinationPanel({ destination: d }: { destination: ExtractorDestination }) {
  const queue = useExtractorQueue((s) => s.queue);
  const { exams, examId, setExamId, curriculum, tests } = d.catalog;
  const isTest = d.mode === 'test';

  return (
    <Panel
      step={1}
      title="Choose destination"
      description="Where the extracted questions will be saved"
      actions={<SegmentedControl options={MODE_OPTIONS} value={d.mode} onChange={d.setMode} />}
      footer={
        <Button onClick={d.refreshCounts} loading={d.countLoading} disabled={isTest ? !d.testId : !d.topicId}>
          Continue
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExamSelect exams={exams} value={examId} onChange={setExamId} />
        {!isTest && (
          <>
            <EntitySelect label="Unit" items={curriculum} value={d.unitId} onChange={d.setUnitId} />
            <EntitySelect label="Topic" items={d.topics} value={d.topicId} onChange={d.setTopicId} />
            {d.subtopics.length > 0 && <EntitySelect label="Subtopic" items={d.subtopics} value={d.subtopicId} onChange={d.setSubtopicId} />}
          </>
        )}
        {isTest && <TestSelect tests={tests} value={d.testId} onChange={d.setTestId} />}
        {isTest && d.pattern && d.pattern.length > 0 && (
          <>
            <Select label="Part" value={d.partName} onChange={(e) => d.setPartName(e.target.value)}>
              {d.pattern.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select label="Section" value={d.sectionName} onChange={(e) => d.setSectionName(e.target.value)}>
              {d.part?.sections.map((s) => {
                const cap = sectionCapacity(d.sectionCounts, queue, d.testId, d.partName, s.name, s.numQuestions);
                return (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.marksPerQuestion} mark{s.marksPerQuestion === 1 ? '' : 's'} each) — {cap.saved + cap.queued}/{s.numQuestions}
                    {cap.remaining <= 0 ? ' (Full)' : ''}
                  </option>
                );
              })}
            </Select>
          </>
        )}
      </div>
    </Panel>
  );
}
