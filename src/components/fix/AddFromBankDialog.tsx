import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api';
import { detectQuestionType } from '../../lib/helpers';
import { QUESTION_SOURCES } from '../../lib/bank';
import type { BankQuestionSummary, QuestionSource } from '../../lib/bank';
import BankQuestionBrowser from '../BankQuestionBrowser';
import { Select } from '../ui/Field';
import Modal from '../ui/Modal';
import type { CurriculumTree, Test } from '../../types/models';

interface AddFromBankDialogProps {
  open: boolean;
  onClose: () => void;
  test: Test;
  examId: string;
  curriculum: CurriculumTree;
  /** Question Bank ids already in this test. */
  existingBankIds: Set<string>;
  /** Practice Question ids already in this test. */
  existingPracticeIds: Set<string>;
  /** How many questions the test already has in a part and section. */
  countIn: (part: string, section: string) => number;
  /** Called after a question was added, so the test's list can reload. */
  onAdded: () => void;
  initialPart?: string;
  initialSection?: string;
}

const SOURCES = Object.keys(QUESTION_SOURCES) as QuestionSource[];

/** Pick questions from the Question Bank or the Practice Questions and copy them into a test's part and section. */
export default function AddFromBankDialog({
  open,
  onClose,
  test,
  examId,
  curriculum,
  existingBankIds,
  existingPracticeIds,
  countIn,
  onAdded,
  initialPart = '',
  initialSection = '',
}: AddFromBankDialogProps) {
  const pattern = test.pattern ?? [];
  const [source, setSource] = useState<QuestionSource>('bank');
  const [part, setPart] = useState(initialPart || pattern[0]?.name || '');
  const partDef = pattern.find((p) => p.name === part);
  const [section, setSection] = useState(initialSection || partDef?.sections[0]?.name || '');
  const sectionDef = partDef?.sections.find((s) => s.name === section);
  const [addingId, setAddingId] = useState<string | null>(null);
  // Added in this dialog but not yet in the reloaded list, kept separately for each source.
  const justAdded = useRef<Record<QuestionSource, Set<string>>>({ bank: new Set(), practice: new Set() });
  const [, force] = useState(0);

  useEffect(() => {
    if (!open) return;
    const startPart = initialPart || pattern[0]?.name || '';
    setPart(startPart);
    setSection(initialSection || pattern.find((p) => p.name === startPart)?.sections[0]?.name || '');
    justAdded.current = { bank: new Set(), practice: new Set() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, test._id]);

  const used = part || section ? countIn(part, section) : 0;
  const capacity = sectionDef?.numQuestions;
  const isFull = capacity !== undefined && used >= capacity;
  const existingIds = source === 'bank' ? existingBankIds : existingPracticeIds;
  const added = useMemo(
    () => new Set([...existingIds, ...justAdded.current[source]]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingIds, source, justAdded.current[source].size]
  );

  const handleAdd = async (item: BankQuestionSummary) => {
    if (isFull) return;
    setAddingId(item._id);
    try {
      // The list leaves images out, so fetch the whole question first.
      const { data: full } = await api.get<BankQuestionSummary & Record<string, any>>(`${QUESTION_SOURCES[source].endpoint}/${item._id}`);
      await api.post('/api/questions/exam', {
        testId: test._id,
        testName: test.name,
        part,
        section,
        marks: sectionDef?.marksPerQuestion ?? full.marks ?? 1,
        type: full.type ?? detectQuestionType(full.question),
        answerType: full.answerType || 'single',
        question: full.question,
        questionImage: full.questionImage,
        options: full.options,
        optionImages: full.optionImages,
        correct_answer: full.correct_answer,
        explanation: full.explanation,
        explanationImage: full.explanationImage,
        // Remember where the copy came from, so the picker can show what a test already uses.
        ...(source === 'bank' ? { bankQuestionId: item._id } : { practiceQuestionId: item._id }),
      });
      justAdded.current[source].add(item._id);
      force((n) => n + 1);
      toast.success(`Added to ${section || test.name}.`);
      onAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add this question.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Add questions to "${test.name}"`} size="xl">
      <div role="tablist" aria-label="Where to pick questions from" className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        {SOURCES.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={source === key}
            onClick={() => setSource(key)}
            className={[
              'rounded-md py-2 text-sm font-medium transition-colors',
              source === key ? 'bg-white text-slate-900 shadow-soft-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {QUESTION_SOURCES[key].label}
          </button>
        ))}
      </div>

      {pattern.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Select
            label="Part"
            value={part}
            onChange={(e) => {
              setPart(e.target.value);
              setSection(pattern.find((p) => p.name === e.target.value)?.sections[0]?.name ?? '');
            }}
          >
            {pattern.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)}>
            {partDef?.sections.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
          {capacity !== undefined && (
            <p className={['pb-2 text-sm font-semibold tabular-nums', isFull ? 'text-danger-600' : 'text-slate-600'].join(' ')}>
              {used} / {capacity} filled
            </p>
          )}
        </div>
      )}
      {/* `key` gives each source a fresh search, topic and page. */}
      <BankQuestionBrowser
        key={source}
        source={source}
        examId={examId}
        curriculum={curriculum}
        addedBankIds={added}
        isFull={isFull}
        addingId={addingId}
        onAdd={handleAdd}
        fullMessage={`"${section}" already has its full ${capacity} questions. Pick another section or remove a question first.`}
      />
    </Modal>
  );
}
