import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookOpen, ListTree, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import EmptyState from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/Spinner';
import CurriculumTreeNode from '../components/CurriculumTreeNode';
import type { CurriculumTree, Subtopic } from '../types/models';

type NodeType = 'unit' | 'topic' | 'subtopic';

export default function UnitswiseName() {
  const { showConfirm } = useModal();
  const [curriculum, setCurriculum] = useState<CurriculumTree>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<NodeType | null>(null);
  const [editName, setEditName] = useState('');

  const [addingType, setAddingType] = useState<NodeType | null>(null);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [addingParentName, setAddingParentName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState<number | string>(0);

  const stats = useMemo(() => {
    const unitCount = curriculum.length;
    const topicCount = curriculum.reduce((sum, unit) => sum + (unit.topics?.length || 0), 0);
    const subtopicCount = curriculum.reduce(
      (sum, unit) => sum + (unit.topics?.reduce((tSum, topic) => tSum + (topic.subtopics?.length || 0), 0) || 0),
      0
    );
    return { unitCount, topicCount, subtopicCount };
  }, [curriculum]);

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const fetchCurriculum = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<CurriculumTree>('/api/questions/curriculum');
      setCurriculum(response.data);
      const initialExpandedUnits: Record<string, boolean> = {};
      response.data.forEach((unit) => {
        initialExpandedUnits[unit._id] = true;
      });
      setExpandedUnits((prev) => ({ ...initialExpandedUnits, ...prev }));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch curriculum data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId: string) => setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  const toggleTopic = (topicId: string) => setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const resetForm = () => {
    setAddingType(null);
    setAddingParentId(null);
    setAddingParentName(null);
    setNewName('');
    setNewOrder(0);
  };

  const startEdit = (item: { _id: string; name: string }, type: NodeType) => {
    setEditingId(item._id);
    setEditingType(type);
    setEditName(item.name);
  };

  const withScrollPreserved = async (action: () => Promise<void>) => {
    const currentScroll = window.scrollY;
    await action();
    requestAnimationFrame(() => {
      window.scrollTo({ top: currentScroll, behavior: 'auto' });
    });
  };

  const handleAddUnit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await withScrollPreserved(async () => {
        await api.post('/api/questions/units', { name: newName.trim(), order: Number(newOrder) });
        showSuccess('Unit added successfully.');
        resetForm();
        await fetchCurriculum();
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding unit.');
    }
  };

  const handleEditUnit = async (unitId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/units/${unitId}`, { name: editName.trim() });
      showSuccess('Unit updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating unit.');
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
      showSuccess('Unit deleted successfully.');
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting unit.');
    }
  };

  const handleAddTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;
    try {
      await withScrollPreserved(async () => {
        await api.post('/api/questions/topics', { name: newName.trim(), unitId: addingParentId, order: Number(newOrder) });
        showSuccess('Topic added successfully.');
        resetForm();
        await fetchCurriculum();
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding topic.');
    }
  };

  const handleEditTopic = async (topicId: string, unitId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/topics/${topicId}`, { name: editName.trim(), unitId });
      showSuccess('Topic updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating topic.');
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
      showSuccess('Topic deleted successfully.');
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting topic.');
    }
  };

  const handleAddSubtopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;
    try {
      await withScrollPreserved(async () => {
        await api.post('/api/questions/subtopics', { name: newName.trim(), topicId: addingParentId, order: Number(newOrder) });
        showSuccess('Subtopic added successfully.');
        resetForm();
        await fetchCurriculum();
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding subtopic.');
    }
  };

  const handleEditSubtopic = async (subtopicId: string, topicId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/subtopics/${subtopicId}`, { name: editName.trim(), topicId });
      showSuccess('Subtopic updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating subtopic.');
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
      showSuccess('Subtopic deleted successfully.');
      fetchCurriculum();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting subtopic.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl 2xl:max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <BookOpen className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Unitswise Name</h1>
            <p className="mt-0.5 text-sm text-slate-500">Add, edit, and delete units, topics, and subtopics</p>
          </div>
        </div>
        <Button
          icon={<Plus className="size-4" />}
          onClick={() => {
            setAddingType('unit');
            setNewOrder(curriculum.length + 1);
          }}
        >
          Add Unit
        </Button>
      </div>

      {!loading && curriculum.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatChip icon={<BookOpen className="size-4" />} label="Units" value={stats.unitCount} />
          <StatChip icon={<ListTree className="size-4" />} label="Topics" value={stats.topicCount} />
          <StatChip icon={<Tag className="size-4" />} label="Subtopics" value={stats.subtopicCount} />
        </div>
      )}

      {successMessage && <Banner variant="success" message={successMessage} />}
      {error && <Banner variant="error" message={error} onDismiss={() => setError('')} />}

      {addingType && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
          <div className="mb-3.5 flex items-center gap-2.5">
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

      {!loading && curriculum.length === 0 && <EmptyState title="No units found." description="Add your first unit to get started!" />}

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
              addChildLabel="+ Add Topic"
              onAddChild={() => {
                setAddingType('topic');
                setAddingParentId(unit._id);
                setAddingParentName(unit.name);
                setNewOrder((unit.topics?.length || 0) + 1);
              }}
            >
              <div className="flex flex-col gap-3 bg-[#fafbfc] p-4">
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

interface StatChipProps {
  icon: ReactNode;
  label: string;
  value: number;
}

function StatChip({ icon, label, value }: StatChipProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-soft-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="font-heading text-lg font-bold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
