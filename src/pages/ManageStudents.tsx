import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { Input, Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { Exam, StudentUser, UserStatus } from '../types/models';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export default function ManageStudents() {
  const { showConfirm } = useModal();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newExamIds, setNewExamIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editExamIds, setEditExamIds] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchExams();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get<StudentUser[]>('/api/auth/admin/students', getApiConfig());
      setStudents(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await api.get<Exam[]>('/api/questions/exams');
      setExams(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch exams.');
    }
  };

  const toggleExamId = (ids: string[], examId: string) =>
    ids.includes(examId) ? ids.filter((id) => id !== examId) : [...ids, examId];

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewExamIds([]);
  };

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    try {
      await api.post(
        '/api/auth/admin/students',
        { name: newName.trim(), email: newEmail.trim(), password: newPassword, examIds: newExamIds },
        getApiConfig()
      );
      toast.success('Student added successfully.');
      resetAddForm();
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error adding student.');
    }
  };

  const startEdit = (student: StudentUser) => {
    setEditingId(student._id);
    setEditName(student.name || '');
    setEditEmail(student.email);
    setEditStatus(student.status || 'active');
    setEditExamIds((student.examIds || []).map((exam) => exam._id));
  };

  const handleEditStudent = async (studentId: string) => {
    if (!editName.trim() || !editEmail.trim()) return;
    try {
      await api.put(
        `/api/auth/admin/students/${studentId}`,
        { name: editName.trim(), email: editEmail.trim(), status: editStatus, examIds: editExamIds },
        getApiConfig()
      );
      toast.success('Student updated successfully.');
      setEditingId(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating student.');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the student "${studentName}"?\n\nThis will remove their login access. Their exam results will not be deleted.`,
      { title: 'Delete Student', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/auth/admin/students/${studentId}`, getApiConfig());
      toast.success('Student deleted successfully.');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting student.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <Users className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Manage Students</h1>
            <p className="mt-0.5 text-sm text-slate-500">Add, edit, and delete student accounts</p>
          </div>
        </div>
        <Button onClick={() => setIsAdding(true)} icon={<Plus className="size-4" />}>
          Add Student
        </Button>
      </div>

      {!loading && students.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<Users className="size-4" />} value={students.length} label="Total students" />
          <StatCard
            icon={<UserCheck className="size-4" />}
            value={students.filter((s) => s.status === 'active' || !s.status).length}
            label="Active"
            tone="success"
          />
          <StatCard
            icon={<UserX className="size-4" />}
            value={students.filter((s) => s.status && s.status !== 'active').length}
            label="Inactive / Blocked"
            tone="danger"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )}

      {isAdding && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Add New Student</h3>
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Full Name"
              placeholder="Enter student name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter student email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Set initial password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <div className="col-span-full">
              <ExamCheckboxes exams={exams} selectedIds={newExamIds} onToggle={(id) => setNewExamIds(toggleExamId(newExamIds, id))} />
            </div>
            <div className="col-span-full flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetAddForm}>
                Cancel
              </Button>
              <Button type="submit">Add Student</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && <LoadingState message="Loading students..." />}

      {!loading && students.length === 0 && (
        <EmptyState title="No students found." description="Add your first student to get started!" />
      )}

      <div className="flex flex-col gap-3">
        {students.map((student) => {
          const isEditing = editingId === student._id;
          const isActive = student.status === 'active' || !student.status;
          const initial = (student.name || student.email || '?').trim().charAt(0).toUpperCase();

          return (
            <Card
              key={student._id}
              className={[
                'flex flex-col gap-3 border-l-4 px-5 py-4 transition-shadow hover:shadow-soft-md',
                isActive ? 'border-l-success-500' : 'border-l-danger-500',
              ].join(' ')}
            >
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" wrapperClassName="min-w-[160px] flex-1" />
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      wrapperClassName="min-w-[200px] flex-1"
                    />
                    <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as UserStatus)} wrapperClassName="w-36">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </Select>
                    <Button size="sm" onClick={() => handleEditStudent(student._id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                  <ExamCheckboxes exams={exams} selectedIds={editExamIds} onToggle={(id) => setEditExamIds(toggleExamId(editExamIds, id))} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">{student.name || 'Unnamed Student'}</span>
                      <Badge variant={isActive ? 'success' : 'danger'} className="capitalize">
                        {student.status || 'active'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{student.email}</p>
                    {(student.examIds || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(student.examIds || []).map((exam) => (
                          <Badge key={exam._id} variant="brand">
                            {exam.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(student)} aria-label={`Edit ${student.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteStudent(student._id, student.name || student.email)}
                      aria-label={`Delete ${student.name}`}
                      className="text-danger-600 hover:bg-danger-50"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface ExamCheckboxesProps {
  exams: Exam[];
  selectedIds: string[];
  onToggle: (examId: string) => void;
}

function ExamCheckboxes({ exams, selectedIds, onToggle }: ExamCheckboxesProps) {
  if (exams.length === 0) {
    return <p className="text-xs text-slate-400">No exams configured yet — add one under Manage Exams.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exams</p>
      <div className="flex flex-wrap gap-3">
        {exams.map((exam) => (
          <label key={exam._id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={selectedIds.includes(exam._id)}
              onChange={() => onToggle(exam._id)}
              className="size-4 rounded border-slate-300 accent-brand-600"
            />
            {exam.name}
          </label>
        ))}
      </div>
    </div>
  );
}
