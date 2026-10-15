import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Eye, EyeOff, KeyRound, Pencil, Plus, Search, Trash2, UserCheck, UserPlus, Users, UserX, Wand2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { toast } from 'react-toastify';
import api from '../api';
import { Pagination, useModal, usePagination } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { Input, Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { Exam, StudentUser, UserStatus } from '../types/models';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

type StatusFilter = 'all' | UserStatus;

const STATUS_BADGE: Record<UserStatus, BadgeVariant> = {
  active: 'success',
  inactive: 'warning',
  blocked: 'danger',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
};

const MIN_PASSWORD_LENGTH = 6;
const MAX_EXAM_BADGES = 2;

interface StudentForm {
  name: string;
  email: string;
  password: string;
  status: UserStatus;
  examIds: string[];
}

type FormErrors = Partial<Record<'name' | 'email' | 'password', string>>;

const EMPTY_FORM: StudentForm = { name: '', email: '', password: '', status: 'active', examIds: [] };

const statusOf = (student: StudentUser): UserStatus => student.status || 'active';

const initialsOf = (student: StudentUser) => {
  const source = (student.name || student.email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)).toUpperCase();
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Readable random password without look-alike characters (0/O, 1/l/I).
const generatePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
};

export default function ManageStudents() {
  const { showConfirm } = useModal();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [examFilter, setExamFilter] = useState('');

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: students.length, active: 0, inactive: 0, blocked: 0 };
    students.forEach((s) => counts[statusOf(s)]++);
    return counts;
  }, [students]);

  const searchLower = searchTerm.trim().toLowerCase();
  const filteredStudents = useMemo(
    () =>
      students.filter((s) => {
        if (statusFilter !== 'all' && statusOf(s) !== statusFilter) return false;
        if (examFilter === 'none' && (s.examIds || []).length > 0) return false;
        if (examFilter && examFilter !== 'none' && !(s.examIds || []).some((e) => e._id === examFilter)) return false;
        return !searchLower || s.name?.toLowerCase().includes(searchLower) || s.email?.toLowerCase().includes(searchLower);
      }),
    [students, statusFilter, examFilter, searchLower]
  );
  const studentsPage = usePagination(filteredStudents, undefined, [searchTerm, statusFilter, examFilter]);
  const hasFilters = !!searchLower || statusFilter !== 'all' || !!examFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setExamFilter('');
  };

  const openAdd = () => {
    setModalMode('add');
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
  };

  const openEdit = (student: StudentUser) => {
    setModalMode('edit');
    setEditingStudent(student);
    setForm({
      name: student.name || '',
      email: student.email,
      password: '',
      status: statusOf(student),
      examIds: (student.examIds || []).map((exam) => exam._id),
    });
    setErrors({});
    setShowPassword(false);
  };

  const closeModal = () => {
    if (!saving) setModalMode(null);
  };

  const updateForm = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleExam = (examId: string) =>
    updateForm('examIds', form.examIds.includes(examId) ? form.examIds.filter((id) => id !== examId) : [...form.examIds, examId]);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Enter the student’s name.';
    if (!form.email.trim()) next.email = 'Enter an email address.';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) next.email = 'That doesn’t look like a valid email.';
    if (modalMode === 'add' && !form.password) next.password = 'Set an initial password.';
    else if (form.password && form.password.length < MIN_PASSWORD_LENGTH)
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await api.post(
          '/api/auth/admin/students',
          { name: form.name.trim(), email: form.email.trim(), password: form.password, examIds: form.examIds },
          getApiConfig()
        );
        toast.success(`${form.name.trim()} added.`);
      } else if (editingStudent) {
        await api.put(
          `/api/auth/admin/students/${editingStudent._id}`,
          {
            name: form.name.trim(),
            email: form.email.trim(),
            status: form.status,
            examIds: form.examIds,
            ...(form.password ? { password: form.password } : {}),
          },
          getApiConfig()
        );
        toast.success(form.password ? 'Student updated and password reset.' : 'Student updated.');
      }
      setModalMode(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (modalMode === 'add' ? 'Error adding student.' : 'Error updating student.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (student: StudentUser) => {
    const nextStatus: UserStatus = statusOf(student) === 'active' ? 'inactive' : 'active';
    setBusyId(student._id);
    try {
      await api.put(`/api/auth/admin/students/${student._id}`, { status: nextStatus }, getApiConfig());
      setStudents((prev) => prev.map((s) => (s._id === student._id ? { ...s, status: nextStatus } : s)));
      toast.success(`${student.name || student.email} is now ${STATUS_LABEL[nextStatus].toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteStudent = async (student: StudentUser) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the student "${student.name || student.email}"?\n\nThis will remove their login access. Their exam results will not be deleted.`,
      { title: 'Delete Student', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    setBusyId(student._id);
    try {
      await api.delete(`/api/auth/admin/students/${student._id}`, getApiConfig());
      toast.success('Student deleted.');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting student.');
    } finally {
      setBusyId(null);
    }
  };

  const STATUS_TABS: StatusFilter[] = ['all', 'active', 'inactive', 'blocked'];

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <PageHeader title="Manage Students" description="Create accounts, assign exams and control access" actions={<>
<Button onClick={openAdd} icon={<UserPlus className="size-4" />}>
          Add student
        </Button>
</>} />

      {!loading && students.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={<Users className="size-4" />} value={statusCounts.all} label="Total students" />
          <StatCard icon={<UserCheck className="size-4" />} value={statusCounts.active} label="Active" tone="success" />
          <StatCard
            icon={<UserX className="size-4" />}
            value={statusCounts.inactive + statusCounts.blocked}
            label="Inactive / Blocked"
            tone="danger"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )}

      {loading && <LoadingState message="Loading students..." />}

      {!loading && students.length === 0 && (
        <EmptyState
          icon={<Users className="size-10" />}
          title="No students yet"
          description="Add your first student to give them access to the exam portal."
          action={
            <Button onClick={openAdd} icon={<Plus className="size-4" />}>
              Add student
            </Button>
          }
        />
      )}

      {!loading && students.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Filter by status" className="flex w-fit flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(tab)}
                    className={[
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                    ].join(' ')}
                  >
                    {tab === 'all' ? 'All' : STATUS_LABEL[tab]}
                    <span
                      className={[
                        'rounded-full px-1.5 text-[10px] tabular-nums',
                        active ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500',
                      ].join(' ')}
                    >
                      {statusCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} wrapperClassName="sm:w-48" aria-label="Filter by exam">
                <option value="">All exams</option>
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.name}
                  </option>
                ))}
                <option value="none">No exam assigned</option>
              </Select>
              <Input
                leadingIcon={<Search className="size-4" />}
                placeholder="Search name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                wrapperClassName="sm:w-64"
                aria-label="Search students"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <p className="text-sm text-slate-500">No students match these filters.</p>
              {hasFilters && (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Exams</th>
                    <th className="hidden px-4 py-2.5 sm:table-cell">Status</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Added</th>
                    <th className="px-4 py-2.5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsPage.pageItems.map((student) => {
                    const status = statusOf(student);
                    const studentExams = student.examIds || [];
                    const busy = busyId === student._id;
                    return (
                      <tr key={student._id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={[
                                'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
                              ].join(' ')}
                            >
                              {initialsOf(student)}
                            </span>
                            <div className="min-w-0 max-w-[40vw] sm:max-w-none">
                              <p className="truncate font-medium text-slate-900">{student.name || 'Unnamed student'}</p>
                              <p className="truncate text-xs text-slate-500">{student.email}</p>
                              <div className="mt-1 sm:hidden">
                                <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {studentExams.length === 0 ? (
                            <span className="text-xs text-slate-400">No exam assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {studentExams.slice(0, MAX_EXAM_BADGES).map((exam) => (
                                <Badge key={exam._id} variant="brand">
                                  {exam.name}
                                </Badge>
                              ))}
                              {studentExams.length > MAX_EXAM_BADGES && (
                                <span title={studentExams.slice(MAX_EXAM_BADGES).map((e) => e.name).join(', ')}>
                                  <Badge variant="neutral">+{studentExams.length - MAX_EXAM_BADGES}</Badge>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <Badge variant={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-500 lg:table-cell">
                          {formatDate(student.createdAt)}
                        </td>
                        <td className="py-3 pl-2 pr-3 sm:px-4">
                          <div className="flex justify-end sm:gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy || status === 'blocked'}
                              onClick={() => handleToggleStatus(student)}
                              title={
                                status === 'blocked'
                                  ? 'Blocked — change the status from Edit'
                                  : status === 'active'
                                    ? 'Deactivate'
                                    : 'Activate'
                              }
                              aria-label={`${status === 'active' ? 'Deactivate' : 'Activate'} ${student.name || student.email}`}
                            >
                              {status === 'active' ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => openEdit(student)}
                              title="Edit"
                              aria-label={`Edit ${student.name || student.email}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => handleDeleteStudent(student)}
                              title="Delete"
                              aria-label={`Delete ${student.name || student.email}`}
                              className="text-danger-600 hover:bg-danger-50"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-2">
              <Pagination
                page={studentsPage.page}
                totalPages={studentsPage.totalPages}
                totalItems={studentsPage.totalItems}
                pageSize={studentsPage.pageSize}
                onPageChange={studentsPage.setPage}
              />
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        size="lg"
        title={
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">{modalMode === 'add' ? 'Add student' : 'Edit student'}</p>
            <p className="text-xs font-normal text-slate-400">
              {modalMode === 'add' ? 'They can sign in to the exam portal straight away.' : editingStudent?.email}
            </p>
          </div>
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="student-form" loading={saving} icon={<Check className="size-4" />}>
              {modalMode === 'add' ? 'Add student' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              placeholder="e.g. Priya Raman"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              error={errors.name}
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              placeholder="student@example.com"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              error={errors.email}
              autoComplete="off"
            />
          </div>

          <div className={['grid grid-cols-1 gap-4', modalMode === 'edit' ? 'sm:grid-cols-2' : ''].join(' ')}>
            <div>
              <div className="relative">
                <Input
                  label={modalMode === 'add' ? 'Password' : 'Reset password (optional)'}
                  type={showPassword ? 'text' : 'password'}
                  leadingIcon={<KeyRound className="size-4" />}
                  placeholder={modalMode === 'add' ? `At least ${MIN_PASSWORD_LENGTH} characters` : 'Leave blank to keep current'}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
                  className="pr-20"
                />
                <div className="absolute right-1.5 top-[30px] flex">
                  <button
                    type="button"
                    onClick={() => {
                      updateForm('password', generatePassword());
                      setShowPassword(true);
                    }}
                    title="Generate a password"
                    aria-label="Generate a password"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                  >
                    <Wand2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {form.password && showPassword && !errors.password && (
                <p className="mt-1.5 text-xs text-slate-500">Share this password with the student — it won’t be shown again.</p>
              )}
            </div>

            {modalMode === 'edit' && (
              <Select label="Status" value={form.status} onChange={(e) => updateForm('status', e.target.value as UserStatus)}>
                <option value="active">Active — can sign in</option>
                <option value="inactive">Inactive — sign-in paused</option>
                <option value="blocked">Blocked — access denied</option>
              </Select>
            )}
          </div>

          <ExamPicker exams={exams} selectedIds={form.examIds} onToggle={toggleExam} onSetAll={(ids) => updateForm('examIds', ids)} />
        </form>
      </Modal>
    </div>
  );
}

interface ExamPickerProps {
  exams: Exam[];
  selectedIds: string[];
  onToggle: (examId: string) => void;
  onSetAll: (examIds: string[]) => void;
}

function ExamPicker({ exams, selectedIds, onToggle, onSetAll }: ExamPickerProps) {
  const allSelected = exams.length > 0 && exams.every((exam) => selectedIds.includes(exam._id));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Assigned exams <span className="font-normal text-slate-400">({selectedIds.length} selected)</span>
        </p>
        {exams.length > 1 && (
          <button
            type="button"
            onClick={() => onSetAll(allSelected ? [] : exams.map((exam) => exam._id))}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>
      {exams.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-400">
          No exams configured yet — add one under Manage Exams.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {exams.map((exam) => {
            const active = selectedIds.includes(exam._id);
            return (
              <button
                key={exam._id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(exam._id)}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                {active && <Check className="size-3.5" />}
                {exam.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-400">Students only see tests and daily challenges for their assigned exams.</p>
    </div>
  );
}
