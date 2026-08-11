import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import Banner from '../components/ui/Banner';
import EmptyState from '../components/ui/EmptyState';
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
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState<number | string>(0);

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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Unitswise Name</h1>
          <p className="mt-1 text-sm text-slate-500">Add, edit, and delete units, topics, and subtopics</p>
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

      {successMessage && <Banner variant="success" message={successMessage} />}
      {error && <Banner variant="error" message={error} onDismiss={() => setError('')} />}

      {addingType && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {addingType === 'unit' && 'Add New Unit'}
            {addingType === 'topic' && 'Add New Topic'}
            {addingType === 'subtopic' && 'Add New Subtopic'}
          </h3>
          <form onSubmit={addingType === 'unit' ? handleAddUnit : addingType === 'topic' ? handleAddTopic : handleAddSubtopic}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <Input label="Name" placeholder={`Enter ${addingType} name`} value={newName} onChange={(e) => setNewName(e.target.value)} required />
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

      {loading && <p className="py-10 text-center text-sm text-slate-500">Loading curriculum structure...</p>}

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
              addChildLabel="+ Add Topic"
              onAddChild={() => {
                setAddingType('topic');
                setAddingParentId(unit._id);
                setNewOrder((unit.topics?.length || 0) + 1);
              }}
            >
              <div className="flex flex-col gap-3 bg-[#fafbfc] p-4">
                {(!unit.topics || unit.topics.length === 0) && (
                  <p className="py-4 text-center text-sm italic text-slate-400">No topics in this unit yet.</p>
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
                      addChildLabel="+ Add Subtopic"
                      onAddChild={() => {
                        setAddingType('subtopic');
                        setAddingParentId(topic._id);
                        setNewOrder((topic.subtopics?.length || 0) + 1);
                      }}
                    >
                      <div className="flex flex-col gap-2 border-t border-slate-100 bg-[#fcfdfe] py-3 pl-[42px] pr-4">
                        {(!topic.subtopics || topic.subtopics.length === 0) && (
                          <p className="py-1.5 text-xs italic text-slate-400">No subtopics in this topic yet.</p>
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
      {isEditing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} wrapperClassName="flex-1" />
          <Button size="sm" onClick={onSaveEdit}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">&bull; {subtopic.name}</span>
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">Order: {subtopic.order || 0}</span>
          </div>
          <div className="flex gap-1.5">
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
