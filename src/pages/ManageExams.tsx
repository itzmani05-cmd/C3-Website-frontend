import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, ListTree, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import { Input } from '../components/ui/Field';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import CurriculumTreeNode from '../components/CurriculumTreeNode';
import type { CurriculumTree, Exam, Subtopic } from '../types/models';

type NodeType = 'unit' | 'topic' | 'subtopic';

interface ExamStats {
  units: number;
  topics: number;
}

export default function ManageExams() {
  const { showConfirm } = useModal();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examStats, setExamStats] = useState<Record<string, ExamStats>>({});
  const [loading, setLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExamStats = async (examList: Exam[]) => {
    const entries = await Promise.all(
      examList.map(async (ex) => {
        try {
          const res = await api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId: ex._id } });
          const units = res.data.length;
          const topics = res.data.reduce((sum, u) => sum + (u.topics?.length || 0), 0);
          return [ex._id, { units, topics }] as const;
        } catch {
          return [ex._id, { units: 0, topics: 0 }] as const;
        }
      })
    );
    setExamStats(Object.fromEntries(entries));
  };

  const refreshExamStats = async (examId: string) => {
    const exam = exams.find((ex) => ex._id === examId);
    if (exam) await fetchExamStats([exam]);
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await api.get<Exam[]>('/api/questions/exams');
      const data = response.data || [];
      setExams(data);
      fetchExamStats(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch exams.');
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
  };

  const handleAddExam = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.post('/api/questions/exams', { name: newName.trim() });
      toast.success('Exam added successfully.');
      resetAddForm();
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding exam.');
    }
  };

  const startEdit = (exam: Exam) => {
    setEditingId(exam._id);
    setEditName(exam.name);
  };

  const handleEditExam = async (examId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/exams/${examId}`, { name: editName.trim() });
      toast.success('Exam updated successfully.');
      setEditingId(null);
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating exam.');
    }
  };

  const handleDeleteExam = async (examId: string, examName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the exam: "${examName}"?\n\nThis will permanently delete ALL of its units, topics, subtopics, and questions, ALL of its tests and student attempts, and ALL of its daily challenges and results. Students enrolled in this exam will be unenrolled.`,
      { title: 'Delete Exam', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/exams/${examId}`);
      toast.success('Exam deleted successfully.');
      if (expandedExamId === examId) setExpandedExamId(null);
      fetchExams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting exam.');
    }
  };

  const totalUnits = Object.values(examStats).reduce((sum, s) => sum + s.units, 0);
  const totalTopics = Object.values(examStats).reduce((sum, s) => sum + s.topics, 0);

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Manage Exams</h1>
            <p className="mt-0.5 text-sm text-slate-500">Add exams, then manage each exam's units, topics, and subtopics</p>
          </div>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={<Plus className="size-4" />}>
          Add Exam
        </Button>
      </div>

      {!loading && exams.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={<GraduationCap className="size-4" />} value={exams.length} label="Total exams" />
          <StatCard icon={<BookOpen className="size-4" />} value={totalUnits} label="Total units" />
          <StatCard icon={<ListTree className="size-4" />} value={totalTopics} label="Total topics" />
        </div>
      )}

      {isAdding && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Plus className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">Add New Exam</h3>
          </div>
          <form onSubmit={handleAddExam} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              label="Exam Name"
              placeholder="e.g. TNPSC AE - Civil Engineering"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
              wrapperClassName="flex-1"
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={resetAddForm}>
                Cancel
              </Button>
              <Button type="submit">Add Exam</Button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingState message="Loading exams..." />}

      {!loading && exams.length === 0 && (
        <EmptyState title="No exams found." description="Add your first exam to get started!" />
      )}

      <div className="flex flex-col gap-3">
        {exams.map((exam) => {
          const isEditing = editingId === exam._id;
          const isExpanded = expandedExamId === exam._id;
          const stats = examStats[exam._id];

          return (
            <div
              key={exam._id}
              className={[
                'overflow-hidden rounded-2xl border bg-white transition-shadow',
                isExpanded ? 'border-brand-200 shadow-soft-md' : 'border-slate-200 shadow-soft-sm hover:shadow-soft-md',
              ].join(' ')}
            >
              <div className={['flex flex-wrap items-center justify-between gap-4 px-5 py-4', isExpanded ? 'bg-brand-50/40' : ''].join(' ')}>
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      wrapperClassName="min-w-[180px] flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleEditExam(exam._id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedExamId(isExpanded ? null : exam._id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </span>
                      <span className={['flex size-10 shrink-0 items-center justify-center rounded-xl', isExpanded ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600'].join(' ')}>
                        <GraduationCap className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-heading text-base font-bold text-slate-900">{exam.name}</p>
                        <p className="text-xs text-slate-500">
                          {stats ? `${stats.units} ${stats.units === 1 ? 'Unit' : 'Units'} · ${stats.topics} ${stats.topics === 1 ? 'Topic' : 'Topics'}` : 'Loading stats…'}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant={isExpanded ? 'primary' : 'secondary'}
                        onClick={() => setExpandedExamId(isExpanded ? null : exam._id)}
                        icon={<BookOpen className="size-3.5" />}
                      >
                        {isExpanded ? 'Hide Units' : 'Manage Units'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => startEdit(exam)} aria-label={`Edit ${exam.name}`}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteExam(exam._id, exam.name)}
                        aria-label={`Delete ${exam.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {isExpanded && <ExamCurriculum examId={exam._id} exams={exams} onChanged={() => refreshExamStats(exam._id)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExamCurriculumProps {
  examId: string;
  exams: Exam[];
  onChanged: () => void;
}

function ExamCurriculum({ examId, exams, onChanged }: ExamCurriculumProps) {
  const { showConfirm } = useModal();
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [loading, setLoading] = useState(false);

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<NodeType | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnitExamId, setEditUnitExamId] = useState('');

  const [addingType, setAddingType] = useState<NodeType | null>(null);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [addingParentName, setAddingParentName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState<number | string>(0);

  useEffect(() => {
    fetchCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const response = await api.get<CurriculumTree>('/api/questions/curriculum', { params: { examId } });
      setCurriculum(response.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch curriculum data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId: string) => setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  const toggleTopic = (topicId: string) => setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));

  const resetForm = () => {
    setAddingType(null);
    setAddingParentId(null);
    setAddingParentName(null);
    setNewName('');
    setNewOrder(0);
  };

  const startEdit = (item: { _id: string; name: string; examId?: string }, type: NodeType) => {
    setEditingId(item._id);
    setEditingType(type);
    setEditName(item.name);
    if (type === 'unit' && item.examId) setEditUnitExamId(item.examId);
  };

  const handleAddUnit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post('/api/questions/units', { name: newName.trim(), order: Number(newOrder), examId });
      toast.success('Unit added successfully.');
      resetForm();
      fetchCurriculum();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding unit.');
    }
  };

  const handleEditUnit = async (unitId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/units/${unitId}`, { name: editName.trim(), examId: editUnitExamId });
      toast.success(editUnitExamId === examId ? 'Unit updated successfully.' : 'Unit updated and moved to the selected exam.');
      setEditingId(null);
      fetchCurriculum();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating unit.');
    }
  };

  const handleDeleteUnit = async (unitId: string, unitName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the Unit: "${unitName}"?\n\nThis will permanently delete ALL topics, subtopics, and questions belonging to this Unit.`,
      { title: 'Delete Unit', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/questions/units/${unitId}`);
      toast.success('Unit deleted successfully.');
      fetchCurriculum();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting unit.');
    }
  };

  const handleAddTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;
    try {
      await api.post('/api/questions/topics', { name: newName.trim(), unitId: addingParentId, order: Number(newOrder) });
      toast.success('Topic added successfully.');
      resetForm();
      fetchCurriculum();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding topic.');
    }
  };

  const handleEditTopic = async (topicId: string, unitId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/topics/${topicId}`, { name: editName.trim(), unitId });
      toast.success('Topic updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating topic.');
    }
  };

  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the Topic: "${topicName}"?\n\nThis will permanently delete ALL subtopics and questions belonging to this Topic.`,
      { title: 'Delete Topic', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/questions/topics/${topicId}`);
      toast.success('Topic deleted successfully.');
      fetchCurriculum();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting topic.');
    }
  };

  const handleAddSubtopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;
    try {
      await api.post('/api/questions/subtopics', { name: newName.trim(), topicId: addingParentId, order: Number(newOrder) });
      toast.success('Subtopic added successfully.');
      resetForm();
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding subtopic.');
    }
  };

  const handleEditSubtopic = async (subtopicId: string, topicId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/subtopics/${subtopicId}`, { name: editName.trim(), topicId });
      toast.success('Subtopic updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating subtopic.');
    }
  };

  const handleDeleteSubtopic = async (subtopicId: string, subtopicName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the Subtopic: "${subtopicName}"?\n\nThis will permanently delete ALL questions belonging to this Subtopic.`,
      { title: 'Delete Subtopic', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/questions/subtopics/${subtopicId}`);
      toast.success('Subtopic deleted successfully.');
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting subtopic.');
    }
  };

  return (
    <div className="border-t border-slate-100 bg-[#fafbfc] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Units for this exam</p>
          {!loading && curriculum.length > 0 && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{curriculum.length}</span>
          )}
        </div>
        <Button
          size="sm"
          aria-label="Add Unit"
          onClick={() => {
            setAddingType('unit');
            setNewOrder(curriculum.length + 1);
          }}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {addingType && (
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Plus className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {addingType === 'unit' && 'Add New Unit'}
                {addingType === 'topic' && 'Add New Topic'}
                {addingType === 'subtopic' && 'Add New Subtopic'}
              </h3>
              {addingParentName && <p className="text-xs text-slate-500">Inside {addingParentName}</p>}
            </div>
          </div>
          <form onSubmit={addingType === 'unit' ? handleAddUnit : addingType === 'topic' ? handleAddTopic : handleAddSubtopic}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <Input label="Name" placeholder={`Enter ${addingType} name`} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
              <Input label="Sort Order" type="number" value={newOrder} onChange={(e) => setNewOrder(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">Add {addingType.charAt(0).toUpperCase() + addingType.slice(1)}</Button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingState message="Loading curriculum structure..." />}

      {!loading && curriculum.length === 0 && <EmptyState title="No units found." description="Add the first unit for this exam." />}

      <div className="flex flex-col gap-4">
        {curriculum.map((unit) => {
          const isUnitExpanded = !!expandedUnits[unit._id];
          const isEditingUnit = editingId === unit._id && editingType === 'unit';

          return (
            <CurriculumTreeNode
              key={unit._id}
              variant="unit"
              name={unit.name}
              countLabel={`${unit.topics?.length || 0} Topics`}
              expanded={isUnitExpanded}
              onToggleExpand={() => toggleUnit(unit._id)}
              isEditing={isEditingUnit}
              editName={editName}
              onEditNameChange={setEditName}
              onStartEdit={() => startEdit(unit, 'unit')}
              onSaveEdit={() => handleEditUnit(unit._id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => handleDeleteUnit(unit._id, unit.name)}
              order={unit.order}
              examOptions={exams}
              selectedExamId={editUnitExamId}
              onExamChange={setEditUnitExamId}
              addChildLabel="+ Add Topic"
              onAddChild={() => {
                setAddingType('topic');
                setAddingParentId(unit._id);
                setAddingParentName(unit.name);
                setNewOrder((unit.topics?.length || 0) + 1);
              }}
            >
              <div className="flex flex-col gap-3 bg-white p-4">
                {(!unit.topics || unit.topics.length === 0) && (
                  <p className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-sm italic text-slate-400">
                    No topics in this unit yet.
                  </p>
                )}

                {unit.topics?.map((topic) => {
                  const isTopicExpanded = !!expandedTopics[topic._id];
                  const isEditingTopic = editingId === topic._id && editingType === 'topic';

                  return (
                    <CurriculumTreeNode
                      key={topic._id}
                      variant="topic"
                      name={topic.name}
                      countLabel={`${topic.subtopics?.length || 0} Subtopics`}
                      expanded={isTopicExpanded}
                      onToggleExpand={() => toggleTopic(topic._id)}
                      isEditing={isEditingTopic}
                      editName={editName}
                      onEditNameChange={setEditName}
                      onStartEdit={() => startEdit(topic, 'topic')}
                      onSaveEdit={() => handleEditTopic(topic._id, unit._id)}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => handleDeleteTopic(topic._id, topic.name)}
                      order={topic.order}
                      addChildLabel="+ Add Subtopic"
                      onAddChild={() => {
                        setAddingType('subtopic');
                        setAddingParentId(topic._id);
                        setAddingParentName(topic.name);
                        setNewOrder((topic.subtopics?.length || 0) + 1);
                      }}
                    >
                      <div className="flex flex-col gap-2 border-t border-slate-100 bg-[#fcfdfe] py-3 pl-[42px] pr-4">
                        {(!topic.subtopics || topic.subtopics.length === 0) && (
                          <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs italic text-slate-400">
                            No subtopics in this topic yet.
                          </p>
                        )}
                        {topic.subtopics?.map((subtopic) => (
                          <SubtopicRow
                            key={subtopic._id}
                            subtopic={subtopic}
                            isEditing={editingId === subtopic._id && editingType === 'subtopic'}
                            editName={editName}
                            onEditNameChange={setEditName}
                            onStartEdit={() => startEdit(subtopic, 'subtopic')}
                            onSaveEdit={() => handleEditSubtopic(subtopic._id, topic._id)}
                            onCancelEdit={() => setEditingId(null)}
                            onDelete={() => handleDeleteSubtopic(subtopic._id, subtopic.name)}
                          />
                        ))}
                      </div>
                    </CurriculumTreeNode>
                  );
                })}
              </div>
            </CurriculumTreeNode>
          );
        })}
      </div>
    </div>
  );
}

interface SubtopicRowProps {
  subtopic: Subtopic;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function SubtopicRow({ subtopic, isEditing, editName, onEditNameChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: SubtopicRowProps) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50/60">
      {isEditing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} wrapperClassName="flex-1" autoFocus />
          <Button size="sm" onClick={onSaveEdit}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <Tag className="size-3 shrink-0 text-slate-300" />
            <span className="truncate text-sm font-medium text-slate-800">{subtopic.name}</span>
            <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">Order: {subtopic.order || 0}</span>
          </div>
          <div className="flex shrink-0 gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="secondary" onClick={onStartEdit} aria-label={`Edit ${subtopic.name}`}>
              <Pencil className="size-3" />
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Delete ${subtopic.name}`}>
              <Trash2 className="size-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
