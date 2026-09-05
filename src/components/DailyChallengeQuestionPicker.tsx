import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import { parseLineByLine, parseOneQuestionPerLine, parseQuestionBlock, splitQuestionBlocks } from '../lib/questionParser';
import type { DraftQuestion } from '../lib/questionParser';
import QuestionForm from './QuestionForm';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { Select, Textarea } from './ui/Field';
import type { CurriculumTree, Question } from '../types/models';

interface DailyChallengeQuestionPickerProps {
  examId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

interface DraftSelection {
  unitId: string;
  topicId: string;
  subtopicId: string;
}

export default function DailyChallengeQuestionPicker({ examId, selected, onChange, max = 5 }: DailyChallengeQuestionPickerProps) {
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const [questionsById, setQuestionsById] = useState<Record<string, Question>>({});

  const [pastedContent, setPastedContent] = useState('');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [draftSelections, setDraftSelections] = useState<Record<number, DraftSelection>>({});
  const [savingDraftId, setSavingDraftId] = useState<number | null>(null);

  useEffect(() => {
    if (!examId) return;
    api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId } }).then((res) => {
      const data = res.data || [];
      setCurriculum(data);
      setUnitId(data[0]?._id || '');
      setTopicId('');
      setSubtopicId('');
    });
  }, [examId]);

  // Resolve full question data for any pre-selected ids not already in the local cache
  // (e.g. when editing an existing challenge).
  useEffect(() => {
    const missing = selected.filter((id) => !questionsById[id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) =>
        api
          .get<Question>(`/api/questions/${id}`)
          .then((res) => res.data)
          .catch(() => null)
      )
    ).then((results) => {
      setQuestionsById((prev) => {
        const next = { ...prev };
        results.forEach((q) => {
          if (q) next[q._id] = q;
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const selectedUnit = curriculum.find((u) => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find((t) => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const isFull = selected.length >= max;

  const removeQuestion = (id: string) => {
    onChange(selected.filter((qId) => qId !== id));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleExtract = () => {
    if (!pastedContent.trim()) {
      toast.warning('Please paste some content first!');
      return;
    }
    const subcategory = subtopicId || topicId;
    const blockQuestions = splitQuestionBlocks(pastedContent)
      .map((block, idx) => parseQuestionBlock(block, idx, subcategory))
      .filter((v): v is DraftQuestion => v !== null);

    const lineByLineQuestions = blockQuestions.length > 0 ? [] : parseLineByLine(pastedContent, subcategory);
    const extracted =
      blockQuestions.length > 0
        ? blockQuestions
        : lineByLineQuestions.length > 0
          ? lineByLineQuestions
          : parseOneQuestionPerLine(pastedContent, subcategory);

    if (extracted.length === 0) {
      toast.error('Could not find any questions in the pasted content. Please ensure questions are numbered and options are labeled (a, b, c, d).');
      return;
    }

    setDrafts([...drafts, ...extracted]);
    setDraftSelections((prev) => {
      const next = { ...prev };
      extracted.forEach((d) => {
        next[d.id] = { unitId, topicId, subtopicId };
      });
      return next;
    });
    setPastedContent('');
    toast.success(`Extracted ${extracted.length} question(s). Review and add them below.`);
  };

  const discardDraft = (id: number) => {
    setDrafts(drafts.filter((d) => d.id !== id));
    setDraftSelections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateDraftSelection = (draftId: number, patch: Partial<DraftSelection>) => {
    setDraftSelections((prev) => ({
      ...prev,
      [draftId]: { ...(prev[draftId] || { unitId, topicId, subtopicId }), ...patch },
    }));
  };

  const addDraftToChallenge = async (draft: DraftQuestion) => {
    if (isFull) {
      toast.warning('This challenge already has the maximum number of questions.');
      return;
    }
    const sel = draftSelections[draft.id] || { unitId, topicId, subtopicId };
    const selUnitTopics = curriculum.find((u) => u._id === sel.unitId)?.topics || [];
    if (!sel.unitId) {
      toast.warning('Select a Unit for this question so it has somewhere to be saved.');
      return;
    }
    if (selUnitTopics.length > 0 && !sel.topicId) {
      toast.warning('Select a Topic for this question so it has somewhere to be saved.');
      return;
    }
    setSavingDraftId(draft.id);
    try {
      const payload = {
        unitId: sel.unitId,
        topicId: sel.topicId || null,
        subtopicId: sel.subtopicId || null,
        type: detectQuestionType(draft.question),
        answerType: draft.answerType || 'single',
        question: draft.question,
        questionImage: draft.questionImage,
        options: draft.options,
        optionImages: draft.optionImages,
        correct_answer: draft.correct_answer,
        explanation: draft.explanation,
        explanationImage: draft.explanationImage,
        status: 'accepted',
        is_published: false,
      };
      const res = await api.post<Question>('/api/questions', payload);
      setQuestionsById((prev) => ({ ...prev, [res.data._id]: res.data }));
      onChange([...selected, res.data._id]);
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      toast.success('Question saved to the bank and added to the challenge.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save this question.');
    } finally {
      setSavingDraftId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Extract Questions</h4>
        <Badge variant={selected.length === max ? 'success' : 'brand'}>
          {selected.length} / {max} Questions Selected
        </Badge>
      </div>

      {selected.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Selected (in order)</p>
          <div className="flex flex-col gap-2">
            {selected.map((id, idx) => {
              const q = questionsById[id];
              const unitName = q ? curriculum.find((u) => u._id === q.unitId)?.name : undefined;
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{q ? q.question : 'Loading…'}</span>
                  {unitName && (
                    <Badge variant="neutral" className="shrink-0">
                      {unitName}
                    </Badge>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={idx === selected.length - 1}
                      onClick={() => moveQuestion(idx, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeQuestion(id)}
                      className="text-danger-600 hover:bg-danger-50"
                      aria-label="Remove"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Unit" value={unitId} onChange={(e) => { setUnitId(e.target.value); setTopicId(''); setSubtopicId(''); }}>
            {curriculum.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select
            label="Topic"
            value={topicId}
            onChange={(e) => { setTopicId(e.target.value); setSubtopicId(''); }}
            disabled={topics.length === 0}
          >
            <option value="">{topics.length === 0 ? 'No Topics' : 'Select Topic'}</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select label="Subtopic" value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)} disabled={subtopics.length === 0}>
            <option value="">All Subtopics</option>
            {subtopics.map((st) => (
              <option key={st._id} value={st._id}>
                {st.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-4">
          {topics.length > 0 && !topicId && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning-text">
              Select a specific Topic above — extracted questions are saved into the question bank under that Topic.
            </p>
          )}
          {unitId && topics.length === 0 && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
              This unit has no topics — extracted questions will be saved directly under the unit.
            </p>
          )}
          <div>
            <Textarea
              placeholder="Paste raw question content here…"
              rows={5}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                icon={<Sparkles className="size-3.5" />}
                onClick={handleExtract}
                disabled={!unitId || (topics.length > 0 && !topicId)}
              >
                Extract Questions
              </Button>
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Each question below can be filed under its own Unit / Topic / Subtopic — handy when a single day's
                challenge mixes questions from different units.
              </p>
              {drafts.map((draft, idx) => {
                const sel = draftSelections[draft.id] || { unitId, topicId, subtopicId };
                const draftUnit = curriculum.find((u) => u._id === sel.unitId);
                const draftTopics = draftUnit ? draftUnit.topics : [];
                const draftTopic = draftTopics.find((t) => t._id === sel.topicId);
                const draftSubtopics = draftTopic ? draftTopic.subtopics : [];

                return (
                  <Card key={draft.id} className="border-brand-200 bg-brand-50/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Extracted Question {idx + 1}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => discardDraft(draft.id)} className="text-danger-600 hover:bg-danger-50">
                        Discard
                      </Button>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Select
                        label="Unit"
                        value={sel.unitId}
                        onChange={(e) => updateDraftSelection(draft.id, { unitId: e.target.value, topicId: '', subtopicId: '' })}
                      >
                        <option value="">Select Unit</option>
                        {curriculum.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Topic"
                        value={sel.topicId}
                        onChange={(e) => updateDraftSelection(draft.id, { topicId: e.target.value, subtopicId: '' })}
                        disabled={!sel.unitId || draftTopics.length === 0}
                      >
                        <option value="">{draftTopics.length === 0 ? 'No Topics' : 'Select Topic'}</option>
                        {draftTopics.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Subtopic"
                        value={sel.subtopicId}
                        onChange={(e) => updateDraftSelection(draft.id, { subtopicId: e.target.value })}
                        disabled={draftSubtopics.length === 0}
                      >
                        <option value="">All Subtopics</option>
                        {draftSubtopics.map((st) => (
                          <option key={st._id} value={st._id}>
                            {st.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <QuestionForm
                      question={draft}
                      onChange={(updated) => setDrafts(drafts.map((d) => (d.id === draft.id ? { ...d, ...updated } : d)))}
                      variant="fixer"
                    />
                    <div className="mt-4">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addDraftToChallenge(draft)}
                        loading={savingDraftId === draft.id}
                        disabled={isFull || !sel.unitId || (draftTopics.length > 0 && !sel.topicId)}
                        icon={<Plus className="size-3.5" />}
                      >
                        Add to Challenge
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
