import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import { EXTRACTOR_FORMAT_EXAMPLE, newDraftId, parseQuestionsJson } from '../lib/questionParser';
import type { DraftDestination, DraftQuestion } from '../lib/questionParser';
import { PageLayout } from '../components/ui';
import DestinationPanel from '../components/extractor/DestinationPanel';
import ProgressPanel from '../components/extractor/ProgressPanel';
import PastePanel from '../components/extractor/PastePanel';
import ReviewQueue from '../components/extractor/ReviewQueue';
import { sectionCapacity } from '../components/extractor/capacity';
import useExtractorDestination from '../hooks/useExtractorDestination';
import { useExtractorQueue } from '../stores/extractorQueueStore';

export default function AIGenerator() {
  const d = useExtractorDestination();
  const queue = useExtractorQueue((s) => s.queue);
  const { append, prepend, remove } = useExtractorQueue.getState();
  const [saving, setSaving] = useState(false);

  const isTest = d.mode === 'test';
  const hasPattern = isTest && !!d.pattern && d.pattern.length > 0;
  const capacity = d.section ? sectionCapacity(d.sectionCounts, queue, d.testId, d.partName, d.sectionName, d.section.numQuestions) : null;
  // Until the saved counts have loaded, the room left in a section is unknown.
  const countsPending = hasPattern && !d.countsReady;
  const sectionFull = isTest && !!d.section && !countsPending && (capacity?.remaining ?? 0) <= 0;
  const marks = d.section?.marksPerQuestion ?? 1;

  // The destination is fixed on each question when it is extracted, so changing the selection later can't redirect it.
  const destination: DraftDestination | null = isTest
    ? d.test
      ? { mode: 'test', testId: d.test._id, label: d.test.name }
      : null
    : d.unitId
      ? { mode: 'curriculum', unitId: d.unitId, topicId: d.topicId, subtopicId: d.subtopicId, label: d.subtopics.find((st) => st._id === d.subtopicId)?.name || d.topic?.name || '' }
      : null;
  // New questions for a patterned test go into the chosen part and section.
  const draftTags = { destination: destination ?? undefined, ...(hasPattern ? { part: d.partName, section: d.sectionName, marksValue: marks } : {}) };

  const destinationReady = () => {
    if (!destination) {
      toast.error('Choose a destination first.');
      return false;
    }
    if (countsPending) {
      toast.info('Still loading how many questions this test already has. Try again in a moment.');
      return false;
    }
    return true;
  };

  const warnSectionFull = () => {
    if (!sectionFull || !d.section) return false;
    toast.error(`"${d.sectionName}" in "${d.partName}" is already full (${d.section.numQuestions}/${d.section.numQuestions}). Pick a different section.`);
    return true;
  };

  const extract = (text: string) => {
    if (!text.trim()) {
      toast.warning('Please paste some content first!');
      return false;
    }
    if (!destinationReady() || warnSectionFull()) return false;

    const parsed = parseQuestionsJson(text, d.subtopicId || d.topicId);
    if (parsed.length === 0) {
      toast.error(`Could not find any questions. Paste a JSON array like ${EXTRACTOR_FORMAT_EXAMPLE}`);
      return false;
    }

    // A section only takes as many as it has room for.
    const tagged = parsed.map((q) => ({ ...q, ...draftTags }));
    const room = d.section ? (capacity?.remaining ?? d.section.numQuestions) : tagged.length;
    const accepted = hasPattern ? tagged.slice(0, room) : tagged;
    append(accepted);

    if (accepted.length < parsed.length) {
      toast.warning(
        `Extracted ${accepted.length} of ${parsed.length} questions — "${d.sectionName}" only had room for ${accepted.length} more. The rest were left out; paste them into a different section.`
      );
    } else {
      toast.success(`Extracted ${accepted.length} question${accepted.length === 1 ? '' : 's'}!`);
    }
    return true;
  };

  const addBlankQuestion = () => {
    if (!destinationReady() || warnSectionFull()) return;
    prepend({
      id: newDraftId(),
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: 'a',
      answerType: 'single',
      explanation: '',
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory: d.subtopicId || d.topicId,
      ...draftTags,
    });
  };

  const payloadFor = (q: DraftQuestion) => {
    const answerType = q.answerType || 'single';
    const common = {
      type: q.questionType ?? detectQuestionType(q.question),
      answerType,
      question: q.question,
      questionImage: q.questionImage,
      options: q.options,
      optionImages: q.optionImages,
      correct_answer: answerType === 'single' && !q.correct_answer ? 'a' : q.correct_answer,
      explanation: q.explanation,
      explanationImage: q.explanationImage,
    };
    const target = q.destination;
    if (!target) throw new Error('This question has no destination. Delete it and extract it again.');
    if (target.mode === 'test') return { ...common, testId: target.testId, part: q.part || '', section: q.section || '', marks: q.marksValue ?? 1 };
    return { ...common, unitId: target.unitId, topicId: target.topicId, subtopicId: target.subtopicId, status: 'accepted', is_published: false };
  };

  // Saves questions one after another; stops at the first failure. Resolves to whether all were saved.
  const save = async (questions: DraftQuestion[], successMessage: string, errorPrefix: string): Promise<boolean> => {
    setSaving(true);
    let saved = false;
    try {
      for (const q of questions) {
        await api.post(q.destination?.mode === 'test' ? '/api/questions/exam' : '/api/questions', payloadFor(q));
        remove([q.id]);
      }
      toast.success(successMessage);
      saved = true;
    } catch (error: any) {
      toast.error(errorPrefix + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
      d.refreshCounts();
    }
    return saved;
  };

  const saveAll = () => {
    const toSave = queue.filter((q) => q.status !== 'REJECTED');
    if (toSave.length === 0) {
      toast.warning('No questions to save!');
      return;
    }
    save(toSave, `Successfully saved ${toSave.length} questions!`, 'Error saving: ').then((saved) => {
      // Rejected questions are dropped once the rest are saved.
      if (saved) useExtractorQueue.getState().clear();
    });
  };

  return (
    <PageLayout
      icon={Lightbulb}
      title="Question Extractor"
      subtitle="Paste raw content and turn it into review-ready questions"
      loading={d.catalog.loading}
      loadingMessage="Loading curriculum..."
      loadingVariant="form"
      error={d.catalog.error}
    >
      <div className="flex flex-col gap-5">
        <DestinationPanel destination={d} />
        {d.showProgress && <ProgressPanel destination={d} />}
        <PastePanel
          onExtract={extract}
          disabled={sectionFull}
          loading={saving}
          notice={
            sectionFull && d.section
              ? `"${d.sectionName}" is already full (${d.section.numQuestions}/${d.section.numQuestions}). Pick a different section before extracting.`
              : undefined
          }
        />
        <ReviewQueue onAddQuestion={addBlankQuestion} onSave={(q) => save([q], 'Question saved successfully!', 'Error saving question: ')} onSaveAll={saveAll} saving={saving} />
      </div>
    </PageLayout>
  );
}
