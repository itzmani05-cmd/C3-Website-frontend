import { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api';
import { Panel } from '../ui';
import Button from '../ui/Button';
import { Select } from '../ui/Field';
import QuestionForm from '../QuestionForm';
import type { QuestionFormValue } from '../QuestionForm';
import { detectQuestionType } from '../../lib/helpers';
import type { CurriculumTree, Test } from '../../types/models';
import type { FixTarget } from './types';
import { validateQuestion } from './validate';

const EMPTY_QUESTION: QuestionFormValue = {
  question: '',
  questionImage: null,
  options: { a: '', b: '', c: '', d: '' },
  optionImages: { a: null, b: null, c: null, d: null },
  correct_answer: 'a',
  answerType: 'single',
  explanation: '',
  explanationImage: null,
};

interface NewQuestionPanelProps {
  target: FixTarget;
  curriculum: CurriculumTree;
  tests: Test[];
  /** Part / section currently picked in the list filter; the new test question starts there. */
  initialPart: string;
  initialSection: string;
  onCreated: () => void;
  onCancel: () => void;
}

/** Adds a question to the selected test, or to the selected unit / topic / subtopic. */
export default function NewQuestionPanel({ target, curriculum, tests, initialPart, initialSection, onCreated, onCancel }: NewQuestionPanelProps) {
  const [form, setForm] = useState<QuestionFormValue>(EMPTY_QUESTION);
  const [saving, setSaving] = useState(false);
  const isTest = target.mode === 'test';

  // A test with a pattern needs the question placed in one of its sections.
  const pattern = isTest ? tests.find((t) => t._id === target.testId)?.pattern : undefined;
  const hasPattern = !!pattern && pattern.length > 0;
  const [partName, setPartName] = useState(initialPart || pattern?.[0]?.name || '');
  const part = pattern?.find((p) => p.name === partName) ?? pattern?.[0];
  const [sectionName, setSectionName] = useState(initialSection);
  const section = part?.sections.find((s) => s.name === sectionName) ?? part?.sections[0];

  const create = async () => {
    const warning = validateQuestion(form);
    if (warning) {
      toast.warning(warning);
      return;
    }
    if (isTest && !target.testId) {
      toast.warning('Please select a test first.');
      return;
    }
    if (!isTest && !target.topicId) {
      toast.warning('Please choose a topic first.');
      return;
    }

    const fields = {
      type: detectQuestionType(form.question || ''),
      question: form.question,
      questionImage: form.questionImage,
      options: form.options,
      optionImages: form.optionImages,
      correct_answer: form.correct_answer,
      answerType: form.answerType || 'single',
      explanation: form.explanation,
      explanationImage: form.explanationImage,
    };

    setSaving(true);
    try {
      if (isTest) {
        const placement = hasPattern && part && section ? { part: part.name, section: section.name, marks: section.marksPerQuestion } : {};
        await api.post('/api/questions/exam', { ...fields, testId: target.testId, ...placement });
      } else {
        await api.post('/api/questions', {
          ...fields,
          unitId: target.unitId,
          topicId: target.topicId,
          subtopicId: target.subtopicId && target.subtopicId !== 'all' ? target.subtopicId : null,
          status: 'accepted',
          is_published: true,
        });
      }
      toast.success('Question created successfully!');
      setForm(EMPTY_QUESTION);
      onCreated();
    } catch (error: any) {
      toast.error('Error creating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="New question"
      description={isTest ? 'Added to the selected test' : 'Added to the selected topic (and subtopic, if one is chosen)'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={create} loading={saving}>
            Create question
          </Button>
        </>
      }
    >
      {hasPattern && part && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Part"
            value={part.name}
            onChange={(e) => {
              setPartName(e.target.value);
              setSectionName('');
            }}
          >
            {pattern!.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select label="Section" value={section?.name ?? ''} onChange={(e) => setSectionName(e.target.value)}>
            {part.sections.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.marksPerQuestion} mark{s.marksPerQuestion === 1 ? '' : 's'} each)
              </option>
            ))}
          </Select>
        </div>
      )}
      <QuestionForm question={form} onChange={setForm} variant="fixer" />
    </Panel>
  );
}
