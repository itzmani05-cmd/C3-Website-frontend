import { Panel, SegmentedControl } from '../ui';
import Button from '../ui/Button';
import { Select } from '../ui/Field';
import EntitySelect from '../catalog/EntitySelect';
import ExamSelect from '../catalog/ExamSelect';
import TestSelect from '../catalog/TestSelect';
import type { CurriculumTree, Exam, Test } from '../../types/models';
import type { FixMode, FixTarget } from './types';

const MODE_OPTIONS: { value: FixMode; label: string }[] = [
  { value: 'curriculum', label: 'Unit-wise Questions' },
  { value: 'test', label: 'Test Questions' },
];

interface FindQuestionsPanelProps {
  target: FixTarget;
  exams: Exam[];
  examId: string;
  onExamChange: (examId: string) => void;
  curriculum: CurriculumTree;
  tests: Test[];
  onModeChange: (mode: FixMode) => void;
  onUnitChange: (unitId: string) => void;
  onTopicChange: (topicId: string) => void;
  onSubtopicChange: (subtopicId: string) => void;
  onTestChange: (testId: string) => void;
  /** Test questions only: narrow the list to one part / section of the test's pattern. */
  filterPart: string;
  filterSection: string;
  onFilterChange: (part: string, section: string) => void;
  onLoad: () => void;
  loading: boolean;
}

/** "Find questions": pick unit-wise or test questions, the filters, then load them. */
export default function FindQuestionsPanel(props: FindQuestionsPanelProps) {
  const { target, exams, examId, onExamChange, curriculum, tests, filterPart, filterSection, onFilterChange, onLoad, loading } = props;
  const topics = curriculum.find((u) => u._id === target.unitId)?.topics ?? [];
  const subtopics = topics.find((t) => t._id === target.topicId)?.subtopics ?? [];
  const pattern = tests.find((t) => t._id === target.testId)?.pattern;

  return (
    <Panel
      title="Find questions"
      description="Choose where to look, then load the questions"
      actions={<SegmentedControl options={MODE_OPTIONS} value={target.mode} onChange={props.onModeChange} />}
      footer={
        <Button onClick={onLoad} loading={loading} disabled={target.mode === 'test' ? !target.testId : !target.unitId}>
          Load questions
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExamSelect exams={exams} value={examId} onChange={onExamChange} />
        {target.mode === 'curriculum' ? (
          <>
            <EntitySelect label="Unit" items={curriculum} value={target.unitId} onChange={props.onUnitChange} />
            <EntitySelect
              label="Topic"
              items={topics}
              value={target.topicId}
              onChange={props.onTopicChange}
              leadingOption={{ value: '', label: 'All topics' }}
            />
            {subtopics.length > 0 && (
              <EntitySelect
                label="Subtopic"
                items={subtopics}
                value={target.subtopicId}
                onChange={props.onSubtopicChange}
                leadingOption={{ value: '', label: 'All subtopics' }}
                disabled={!target.topicId}
              />
            )}
          </>
        ) : (
          <>
            <TestSelect tests={tests} value={target.testId} onChange={props.onTestChange} />
            {pattern && pattern.length > 0 && (
              <>
                <Select label="Part" value={filterPart} onChange={(e) => onFilterChange(e.target.value, '')}>
                  <option value="">All parts</option>
                  {pattern.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Select label="Section" value={filterSection} onChange={(e) => onFilterChange(filterPart, e.target.value)} disabled={!filterPart}>
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
          </>
        )}
      </div>
    </Panel>
  );
}
