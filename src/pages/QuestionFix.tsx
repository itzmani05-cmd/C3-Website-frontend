import { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { detectQuestionType } from '../lib/helpers';
import { PageLayout, Pagination, Panel, useModal, usePagination } from '../components/ui';
import Button from '../components/ui/Button';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import FindQuestionsPanel from '../components/questionFix/FindQuestionsPanel';
import NewQuestionPanel from '../components/questionFix/NewQuestionPanel';
import FixQuestionRow from '../components/questionFix/FixQuestionRow';
import type { FixableQuestion, FixMode, FixTarget } from '../components/questionFix/types';
import { validateQuestion } from '../components/questionFix/validate';
import useExamCatalog from '../hooks/useExamCatalog';
import useFixQuestions, { FIX_PAGE_SIZE } from '../hooks/useFixQuestions';

export default function QuestionFix() {
  const { showConfirm, showPrompt } = useModal();
  const [target, setTarget] = useState<FixTarget>({ mode: 'curriculum', unitId: '', topicId: '', subtopicId: '', testId: '' });
  const [filter, setFilter] = useState({ part: '', section: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const { exams, examId, setExamId, curriculum, tests, loading: catalogLoading, error: catalogError } = useExamCatalog((tree, examTests) => {
    setTarget((prev) => ({ ...prev, unitId: tree[0]?._id || '', topicId: tree[0]?.topics?.[0]?._id || '', subtopicId: '', testId: examTests[0]?._id || '' }));
    setFilter({ part: '', section: '' });
  });

  const { questions, serverPage, loading, setLoading, hasSearched, fetchQuestions } = useFixQuestions(target);
  const isTest = target.mode === 'test';
  const endpointFor = (id: string) => (isTest ? `/api/questions/exam/${id}` : `/api/questions/${id}`);

  // Changing where to look closes any open editor.
  const retarget = (changes: Partial<FixTarget>) => {
    setTarget((prev) => ({ ...prev, ...changes }));
    setExpandedId(null);
    setIsAdding(false);
  };

  const changeMode = (mode: FixMode) => retarget({ mode });
  const changeUnit = (unitId: string) => retarget({ unitId, topicId: curriculum.find((u) => u._id === unitId)?.topics?.[0]?._id || '', subtopicId: '' });
  const changeTest = (testId: string) => {
    retarget({ testId });
    setFilter({ part: '', section: '' });
  };

  // A test's questions can be narrowed to one part / section of its pattern.
  const visibleQuestions = questions.filter((q) => (!filter.part || q.part === filter.part) && (!filter.section || q.section === filter.section));
  const clientPage = usePagination(visibleQuestions, FIX_PAGE_SIZE, [filter.part, filter.section]);
  const listItems = serverPage ? questions : clientPage.pageItems;
  const listStart = serverPage ? (serverPage.page - 1) * serverPage.pageSize : clientPage.startIndex;
  const totalQuestions = serverPage ? serverPage.total : questions.length;

  const updateQuestion = async (edited: FixableQuestion) => {
    const warning = validateQuestion(edited);
    if (warning) {
      toast.warning(warning);
      return;
    }
    const confirmed = await showConfirm('Are you sure you want to update this question?', { title: 'Update Question' });
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.put(endpointFor(edited._id), { ...edited, type: detectQuestionType(edited.question || '') });
      toast.success('Question updated successfully!');
      setExpandedId(null);
      fetchQuestions();
    } catch (error: any) {
      toast.error('Error updating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this question?', { title: 'Delete Question', confirmText: 'Delete', variant: 'error' });
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.delete(endpointFor(id));
      toast.success('Question deleted successfully!');
      fetchQuestions();
    } catch (error: any) {
      toast.error('Error deleting question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Deletes every question in the selected test, topic or subtopic, after a typed confirmation.
  const deleteAllQuestions = async () => {
    let targetName: string;
    if (isTest) {
      const test = tests.find((t) => t._id === target.testId);
      if (!test) {
        toast.warning('Please select a test first to perform a bulk delete.');
        return;
      }
      targetName = `Test: "${test.name}"`;
    } else {
      const topics = curriculum.find((u) => u._id === target.unitId)?.topics ?? [];
      const topic = topics.find((t) => t._id === target.topicId);
      if (target.subtopicId && target.subtopicId !== 'all') {
        targetName = `Subtopic: "${topic?.subtopics.find((s) => s._id === target.subtopicId)?.name}"`;
      } else if (target.topicId && target.topicId !== 'all') {
        targetName = `Topic: "${topic?.name}"`;
      } else {
        toast.warning('Please select a topic or subtopic first to perform a bulk delete.');
        return;
      }
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete ALL questions in ${targetName}? This will permanently delete all these questions and cannot be undone!`,
      { title: 'Bulk Delete Warning', confirmText: 'Continue', variant: 'error' }
    );
    if (!confirmed) return;

    const typed = await showPrompt("Type 'DELETE' to confirm deletion of all questions in this category.", {
      title: 'Final Confirmation',
      confirmText: 'Confirm Delete',
      placeholder: 'DELETE',
    });
    if (typed !== 'DELETE') {
      toast.error('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (isTest) params.testId = target.testId;
      else {
        if (target.topicId && target.topicId !== 'all') params.topicId = target.topicId;
        if (target.subtopicId && target.subtopicId !== 'all') params.subtopicId = target.subtopicId;
      }
      const response = await api.delete(isTest ? '/api/questions/exam/delete/bulk' : '/api/questions/delete/bulk', { params });
      toast.success(response.data?.message || 'Bulk deletion completed successfully.');
      fetchQuestions(1);
    } catch (error: any) {
      toast.error('Error in bulk delete: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const canBulkDelete = !!(isTest ? target.testId : target.topicId) && questions.length > 0;

  return (
    <PageLayout
      icon={Wrench}
      title="Question Fix"
      subtitle="Find existing questions, correct them, or add new ones"
      loading={catalogLoading}
      loadingMessage="Loading curriculum..."
      loadingVariant="form"
      error={catalogError}
      actions={
        <Button variant={isAdding ? 'secondary' : 'primary'} icon={isAdding ? undefined : <Plus className="size-4" />} onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'New question'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <FindQuestionsPanel
          target={target}
          exams={exams}
          examId={examId}
          onExamChange={setExamId}
          curriculum={curriculum}
          tests={tests}
          onModeChange={changeMode}
          onUnitChange={changeUnit}
          onTopicChange={(topicId) => retarget({ topicId, subtopicId: '' })}
          onSubtopicChange={(subtopicId) => retarget({ subtopicId })}
          onTestChange={changeTest}
          filterPart={filter.part}
          filterSection={filter.section}
          onFilterChange={(part, section) => setFilter({ part, section })}
          onLoad={() => fetchQuestions(1)}
          loading={loading}
        />

        {isAdding && (
          <NewQuestionPanel
            target={target}
            curriculum={curriculum}
            tests={tests}
            initialPart={filter.part}
            initialSection={filter.section}
            onCancel={() => setIsAdding(false)}
            onCreated={() => {
              setIsAdding(false);
              fetchQuestions();
            }}
          />
        )}

        {hasSearched && (
          <Panel
            title="Questions"
            description={
              visibleQuestions.length !== questions.length
                ? `${visibleQuestions.length} of ${questions.length} match the filters`
                : `${totalQuestions} ${totalQuestions === 1 ? 'question' : 'questions'} in this selection`
            }
            actions={
              canBulkDelete && (
                <Button variant="dangerOutline" size="sm" onClick={deleteAllQuestions}>
                  Delete all
                </Button>
              )
            }
            flush
          >
            {loading && questions.length === 0 ? (
              <LoadingState message="Loading questions..." />
            ) : !loading && visibleQuestions.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No questions found." description="Try a different unit, topic, test, part or section, or add a new question." />
              </div>
            ) : (
              <>
                <ul className={['divide-y divide-slate-100 transition-opacity', loading ? 'opacity-60' : ''].join(' ')}>
                  {listItems.map((q, idx) => (
                    <FixQuestionRow
                      key={q._id}
                      question={q}
                      number={listStart + idx + 1}
                      expanded={expandedId === q._id}
                      onToggle={() => setExpandedId(expandedId === q._id ? null : q._id)}
                      onSave={updateQuestion}
                      onDelete={() => deleteQuestion(q._id)}
                    />
                  ))}
                </ul>
                <div className="border-t border-slate-200 px-4">
                  {serverPage ? (
                    <Pagination
                      page={serverPage.page}
                      totalPages={serverPage.totalPages}
                      totalItems={serverPage.total}
                      pageSize={serverPage.pageSize}
                      onPageChange={(page) => {
                        setExpandedId(null);
                        fetchQuestions(page);
                      }}
                    />
                  ) : (
                    <Pagination
                      page={clientPage.page}
                      totalPages={clientPage.totalPages}
                      totalItems={clientPage.totalItems}
                      pageSize={clientPage.pageSize}
                      onPageChange={clientPage.setPage}
                    />
                  )}
                </div>
              </>
            )}
          </Panel>
        )}
      </div>
    </PageLayout>
  );
}
