import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { Input } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { Exam, Test } from '../types/models';

interface ExamTestStats {
  total: number;
  published: number;
}

export default function ManageTests() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examStats, setExamStats] = useState<Record<string, ExamTestStats>>({});
  const [loading, setLoading] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExamStats = async (examList: Exam[]) => {
    const entries = await Promise.all(
      examList.map(async (ex) => {
        try {
          const res = await api.get<Test[]>('/api/questions/tests', { params: { examId: ex._id } });
          const tests = res.data || [];
          return [ex._id, { total: tests.length, published: tests.filter((t) => t.publishToStudent).length }] as const;
        } catch {
          return [ex._id, { total: 0, published: 0 }] as const;
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

  const totalTests = Object.values(examStats).reduce((sum, s) => sum + s.total, 0);
  const totalPublished = Object.values(examStats).reduce((sum, s) => sum + s.published, 0);

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Manage Tests</h1>
            <p className="mt-0.5 text-sm text-slate-500">Pick an exam to add, edit, and publish its tests</p>
          </div>
        </div>
      </div>

      {!loading && exams.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={<GraduationCap className="size-4" />} value={exams.length} label="Total exams" />
          <StatCard icon={<ClipboardList className="size-4" />} value={totalTests} label="Total tests" />
          <StatCard icon={<ClipboardList className="size-4" />} value={totalPublished} label="Published" tone="success" />
        </div>
      )}

      {loading && <LoadingState message="Loading exams..." />}

      {!loading && exams.length === 0 && (
        <EmptyState title="No exams found." description="Add an exam under Manage Exams first." />
      )}

      <div className="flex flex-col gap-3">
        {exams.map((exam) => {
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
              <button
                type="button"
                onClick={() => setExpandedExamId(isExpanded ? null : exam._id)}
                className={['flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left', isExpanded ? 'bg-brand-50/40' : ''].join(' ')}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400">
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </span>
                  <span className={['flex size-10 shrink-0 items-center justify-center rounded-xl', isExpanded ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600'].join(' ')}>
                    <GraduationCap className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base font-bold text-slate-900">{exam.name}</p>
                    <p className="text-xs text-slate-500">
                      {stats
                        ? `${stats.total} ${stats.total === 1 ? 'Test' : 'Tests'} · ${stats.published} Published`
                        : 'Loading stats…'}
                    </p>
                  </div>
                </div>
                <Badge variant={isExpanded ? 'brand' : 'neutral'}>{isExpanded ? 'Hide Tests' : 'Manage Tests'}</Badge>
              </button>

              {isExpanded && <ExamTests examId={exam._id} onChanged={() => refreshExamStats(exam._id)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExamTestsProps {
  examId: string;
  onChanged: () => void;
}

function ExamTests({ examId, onChanged }: ExamTestsProps) {
  const { showConfirm } = useModal();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPublish, setNewPublish] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPublish, setEditPublish] = useState(false);

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await api.get<Test[]>('/api/questions/tests', { params: { examId } });
      setTests(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
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
      await api.post('/api/questions/tests', { name: newName.trim(), publishToStudent: newPublish, examId });
      toast.success('Test added successfully.');
      resetAddForm();
      fetchTests();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding test.');
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
      toast.success('Test updated successfully.');
      setEditingId(null);
      fetchTests();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating test.');
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
      toast.success('Test deleted successfully.');
      fetchTests();
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting test.');
    }
  };

  return (
    <div className="border-t border-slate-100 bg-[#fafbfc] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-3.5 text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tests for this exam</p>
          {!loading && tests.length > 0 && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{tests.length}</span>
          )}
        </div>
        <Button size="sm" aria-label="Add Test" onClick={() => setIsAdding(true)}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Plus className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">Add New Test</h3>
          </div>
          <form onSubmit={handleAddTest} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              label="Test Name"
              placeholder="Enter test name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
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
        </div>
      )}

      {loading && <LoadingState message="Loading tests..." />}

      {!loading && tests.length === 0 && (
        <EmptyState title="No tests found." description="Add the first test for this exam." />
      )}

      <div className="flex flex-col gap-3">
        {tests.map((test) => {
          const isEditing = editingId === test._id;

          return (
            <Card key={test._id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 transition-shadow hover:shadow-soft-md">
              {isEditing ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    wrapperClassName="min-w-[180px] flex-1"
                    autoFocus
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
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">{test.name}</span>
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
