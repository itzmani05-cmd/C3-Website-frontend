import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Banner from '../components/ui/Banner';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { StudentUser, UserStatus } from '../types/models';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export default function ManageStudents() {
  const { showConfirm } = useModal();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<StudentUser[]>('/api/auth/admin/students', getApiConfig());
      setStudents(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch students.');
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
    setNewEmail('');
    setNewPassword('');
  };

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    try {
      await api.post(
        '/api/auth/admin/students',
        { name: newName.trim(), email: newEmail.trim(), password: newPassword },
        getApiConfig()
      );
      showSuccess('Student added successfully.');
      resetAddForm();
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding student.');
    }
  };

  const startEdit = (student: StudentUser) => {
    setEditingId(student._id);
    setEditName(student.name || '');
    setEditEmail(student.email);
    setEditStatus(student.status || 'active');
  };

  const handleEditStudent = async (studentId: string) => {
    if (!editName.trim() || !editEmail.trim()) return;
    try {
      await api.put(
        `/api/auth/admin/students/${studentId}`,
        { name: editName.trim(), email: editEmail.trim(), status: editStatus },
        getApiConfig()
      );
      showSuccess('Student updated successfully.');
      setEditingId(null);
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating student.');
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
      showSuccess('Student deleted successfully.');
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error deleting student.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
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
          <Card className="px-4 py-3">
            <p className="font-heading text-lg font-bold leading-tight text-slate-900">{students.length}</p>
            <p className="text-xs text-slate-500">Total students</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="font-heading text-lg font-bold leading-tight text-success-600">
              {students.filter((s) => s.status === 'active' || !s.status).length}
            </p>
            <p className="text-xs text-slate-500">Active</p>
          </Card>
          <Card className="col-span-2 px-4 py-3 sm:col-span-1">
            <p className="font-heading text-lg font-bold leading-tight text-danger-600">
              {students.filter((s) => s.status && s.status !== 'active').length}
            </p>
            <p className="text-xs text-slate-500">Inactive / Blocked</p>
          </Card>
        </div>
      )}

      {successMessage && <Banner variant="success" message={successMessage} />}
      {error && <Banner variant="error" message={error} onDismiss={() => setError('')} />}

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

          return (
            <Card key={student._id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-shadow hover:shadow-soft-md">
              {isEditing ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
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
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-semibold text-slate-900">{student.name || 'Unnamed Student'}</span>
                    <span className="text-sm text-slate-500">{student.email}</span>
                    <Badge variant={student.status === 'active' ? 'success' : 'danger'} className="capitalize">
                      {student.status || 'active'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(student)} aria-label={`Edit ${student.name}`}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteStudent(student._id, student.name || student.email)}
                      aria-label={`Delete ${student.name}`}
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
