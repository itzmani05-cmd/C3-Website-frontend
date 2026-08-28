import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { Test } from '../types/models';

export default function ManageTests() {
  const { showConfirm } = useModal();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPublish, setNewPublish] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPublish, setEditPublish] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Test[]>('/api/questions/tests');
      setTests(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
    setNewPublish(false);
  };

  const handleAddTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.post('/api/questions/tests', { name: newName.trim(), publishToStudent: newPublish });
      showSuccess('Test added successfully.');
      resetAddForm();
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding test.');
    }
  };

  const startEdit = (test: Test) => {
    setEditingId(test._id);
    setEditName(test.name);
    setEditPublish(!!test.publishToStudent);
  };

  const handleEditTest = async (testId: string) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/tests/${testId}`, { name: editName.trim(), publishToStudent: editPublish });
      showSuccess('Test updated successfully.');
      setEditingId(null);
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating test.');
    }
  };

  const handleDeleteTest = async (testId: string, testName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the Test: "${testName}"?\n\nThis will permanently delete ALL exam questions and student attempts belonging to this test.`,
      { title: 'Delete Test', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/tests/${testId}`);
      showSuccess('Test deleted successfully.');
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting test.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Tests</h1>
          <p className="mt-1 text-sm text-slate-500">Add, edit, and delete exam tests shown to students</p>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={<Plus className="size-4" />}>
          Add Test
        </Button>
      </div>

      {successMessage && <Banner variant="success" message={successMessage} />}
      {error && <Banner variant="error" message={error} onDismiss={() => setError('')} />}

      {isAdding && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Add New Test</h3>
          <form onSubmit={handleAddTest} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              label="Test Name"
              placeholder="Enter test name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              wrapperClassName="flex-1"
            />
            <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newPublish}
                onChange={(e) => setNewPublish(e.target.checked)}
                className="size-4 rounded border-slate-300 accent-brand-600"
              />
              Publish to students
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={resetAddForm}>
                Cancel
              </Button>
              <Button type="submit">Add Test</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && <LoadingState message="Loading tests..." />}

      {!loading && tests.length === 0 && (
        <EmptyState title="No tests found." description="Add your first test to get started!" />
      )}

      <div className="flex flex-col gap-3">
        {tests.map((test) => {
          const isEditing = editingId === test._id;

          return (
            <Card key={test._id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              {isEditing ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    wrapperClassName="min-w-[180px] flex-1"
                  />
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editPublish}
                      onChange={(e) => setEditPublish(e.target.checked)}
                      className="size-4 rounded border-slate-300 accent-brand-600"
                    />
                    Publish
                  </label>
                  <Button size="sm" onClick={() => handleEditTest(test._id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-slate-900">{test.name}</span>
                    <Badge variant={test.publishToStudent ? 'success' : 'neutral'}>
                      {test.publishToStudent ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(test)} aria-label={`Edit ${test.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteTest(test._id, test.name)}
                      aria-label={`Delete ${test.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
