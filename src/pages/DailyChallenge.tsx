import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  ListChecks,
  Plus,
  Trash2,
  Trophy,
  TriangleAlert,
  Users,
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import QuestionRenderer from '../components/QuestionRenderer';
import DailyChallengeQuestionPicker from '../components/DailyChallengeQuestionPicker';
import type {
  DailyChallenge,
  DailyChallengeAnalytics,
  DailyChallengeDashboard,
  DailyChallengeDetail,
  DailyChallengeStatus,
  Exam,
  OptionKey,
} from '../types/models';

type View = 'dashboard' | 'create' | 'edit' | 'preview' | 'all' | 'analytics';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

const STATUS_BADGE: Record<DailyChallengeStatus, BadgeVariant> = {
  draft: 'neutral',
  scheduled: 'warning',
  published: 'success',
  expired: 'danger',
};

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const toDatetimeLocal = (iso: string | null | undefined) => (iso ? iso.slice(0, 16) : '');

const nowDatetimeLocal = () => new Date().toISOString().slice(0, 16);

interface ChallengeFormState {
  examId: string;
  title: string;
  description: string;
  startAt: string;
  maxAttempts: number;
  availabilityDays: number;
  questionIds: string[];
}

const emptyForm: ChallengeFormState = {
  examId: '',
  title: '',
  description: '',
  startAt: nowDatetimeLocal(),
  maxAttempts: 3,
  availabilityDays: 3,
  questionIds: [],
};

const correctAnswerKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return [value];
  return [];
};

export default function DailyChallengeAdmin() {
  const { showConfirm } = useModal();

  const [view, setView] = useState<View>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');

  const [dashboard, setDashboard] = useState<DailyChallengeDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [allChallenges, setAllChallenges] = useState<DailyChallenge[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  const [detail, setDetail] = useState<DailyChallengeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [analytics, setAnalytics] = useState<DailyChallengeAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [form, setForm] = useState<ChallengeFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [duplicateStartAt, setDuplicateStartAt] = useState(nowDatetimeLocal());

  const loadDashboard = useCallback(async () => {
    if (!examId) return;
    setDashboardLoading(true);
    try {
      const res = await api.get<DailyChallengeDashboard>('/api/daily-challenges/dashboard', {
        ...getApiConfig(),
        params: { examId },
      });
      setDashboard(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load Daily Challenge dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, [examId]);

  const loadAll = useCallback(async () => {
    if (!examId) return;
    setAllLoading(true);
    try {
      const res = await api.get<DailyChallenge[]>('/api/daily-challenges', {
        ...getApiConfig(),
        params: { examId },
      });
      setAllChallenges(res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load challenges.');
    } finally {
      setAllLoading(false);
    }
  }, [examId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<DailyChallengeDetail>(`/api/daily-challenges/${id}`, getApiConfig());
      setDetail(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load challenge.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (id: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get<DailyChallengeAnalytics>(`/api/daily-challenges/${id}/analytics`, getApiConfig());
      setAnalytics(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<Exam[]>('/api/questions/exams', getApiConfig()).then((res) => {
      const data = res.data || [];
      setExams(data);
      if (data.length > 0) setExamId(data[0]._id);
      else setDashboardLoading(false);
    });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const goToCreate = () => {
    setForm({ ...emptyForm, examId });
    setEditingId(null);
    setView('create');
  };

  const goToEdit = async (challenge: DailyChallenge) => {
    if (challenge.status === 'published' || challenge.status === 'expired') {
      const confirmed = await showConfirm(
        'This challenge has already been published and students may have attempted it. Changing questions can affect existing results.',
        { title: 'Edit Published Challenge', confirmText: 'Edit Anyway', variant: 'warning' }
      );
      if (!confirmed) return;
    }
    setDetailLoading(true);
    try {
      const res = await api.get<DailyChallengeDetail>(`/api/daily-challenges/${challenge._id}`, getApiConfig());
      setForm({
        examId: res.data.examId,
        title: res.data.title,
        description: res.data.description,
        startAt: toDatetimeLocal(res.data.startAt),
        maxAttempts: res.data.maxAttempts,
        availabilityDays: res.data.availabilityDays,
        questionIds: res.data.questionIds,
      });
      setEditingId(challenge._id);
      setView('edit');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load challenge for editing.');
    } finally {
      setDetailLoading(false);
    }
  };

  const goToPreview = (id: string) => {
    setSelectedId(id);
    setView('preview');
    loadDetail(id);
  };

  const goToAnalytics = (id: string) => {
    setSelectedId(id);
    setView('analytics');
    loadAnalytics(id);
  };

  const goToAll = () => {
    setView('all');
    loadAll();
  };

  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      toast.warning('Title is required.');
      return;
    }
    if (!form.examId) {
      toast.warning('An exam must be selected.');
      return;
    }
    if (!form.startAt) {
      toast.warning('Start date/time is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        examId: form.examId,
        title: form.title.trim(),
        description: form.description,
        startAt: new Date(form.startAt).toISOString(),
        maxAttempts: form.maxAttempts,
        availabilityDays: form.availabilityDays,
        questionIds: form.questionIds,
      };
      let id = editingId;
      if (editingId) {
        await api.put(`/api/daily-challenges/${editingId}`, payload, getApiConfig());
      } else {
        const res = await api.post('/api/daily-challenges', payload, getApiConfig());
        id = res.data._id;
        setEditingId(id);
      }
      toast.success('Daily Challenge saved as draft.');
      if (id) goToPreview(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving Daily Challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!detail) return;
    const confirmed = await showConfirm(
      `Publish this Daily Challenge?\n\nDate: ${new Date(detail.startAt).toLocaleString()}\nQuestions: ${detail.questionIds.length}\nMaximum Attempts: ${detail.maxAttempts}\n\nStudents will be able to attempt it once it goes live.`,
      { title: 'Publish Daily Challenge?', confirmText: 'Confirm Publish', variant: 'warning' }
    );
    if (!confirmed) return;

    try {
      await api.post(`/api/daily-challenges/${detail._id}/publish`, {}, getApiConfig());
      toast.success('Daily Challenge published!');
      loadDetail(detail._id);
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error publishing challenge.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this draft Daily Challenge?', {
      title: 'Delete Draft',
      confirmText: 'Delete',
      variant: 'error',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/daily-challenges/${id}`, getApiConfig());
      toast.success('Draft deleted.');
      loadAll();
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting draft.');
    }
  };

  const handleDuplicateConfirm = async (id: string) => {
    if (!duplicateStartAt) {
      toast.warning('Pick a date for the new challenge.');
      return;
    }
    try {
      const res = await api.post(
        `/api/daily-challenges/${id}/duplicate`,
        { startAt: new Date(duplicateStartAt).toISOString() },
        getApiConfig()
      );
      toast.success('Duplicated as a new draft.');
      setDuplicatingId(null);
      goToEditById(res.data._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error duplicating challenge.');
    }
  };

  const goToEditById = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<DailyChallengeDetail>(`/api/daily-challenges/${id}`, getApiConfig());
      setForm({
        examId: res.data.examId,
        title: res.data.title,
        description: res.data.description,
        startAt: toDatetimeLocal(res.data.startAt),
        maxAttempts: res.data.maxAttempts,
        availabilityDays: res.data.availabilityDays,
        questionIds: res.data.questionIds,
      });
      setEditingId(id);
      setView('edit');
    } finally {
      setDetailLoading(false);
    }
  };

  const pageHeader = (
    <div className="mb-6 flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Trophy className="size-5" />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">C3 Daily Challenge</h1>
        <p className="mt-0.5 text-sm text-slate-500">Curate the 5-question daily challenge for the mobile app</p>
      </div>
    </div>
  );

  const backToDashboard = () => {
    setView('dashboard');
    loadDashboard();
  };

  // ─── DASHBOARD ──────────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {pageHeader}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {exams.length > 0 && (
              <Select value={examId} onChange={(e) => setExamId(e.target.value)} wrapperClassName="w-56">
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={goToAll} disabled={!examId}>
              All Challenges
            </Button>
            <Button size="sm" icon={<Plus className="size-4" />} onClick={goToCreate} disabled={!examId}>
              Create Daily Challenge
            </Button>
          </div>
        </div>

        {exams.length === 0 && !dashboardLoading && (
          <p className="mb-6 font-medium text-danger-600">No exams available. Please add one under Manage Exams first.</p>
        )}

        {dashboardLoading ? (
          <LoadingState message="Loading Daily Challenge dashboard..." />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<FileText className="size-4" />} value={dashboard?.draftCount ?? 0} label="Drafts" tone="neutral" />
              <StatCard icon={<CheckCircle2 className="size-4" />} value={dashboard?.stats.totalPublished ?? 0} label="Published (all-time)" tone="success" />
              <StatCard icon={<Users className="size-4" />} value={dashboard?.stats.totalParticipantsAllTime ?? 0} label="Participants (all-time)" />
              <StatCard icon={<CalendarClock className="size-4" />} value={dashboard?.upcoming.length ?? 0} label="Upcoming" tone="warning" />
            </div>

            <Card className="mb-6 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Today's Challenge</h3>
              {dashboard?.today ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-lg font-bold text-slate-900">{new Date(dashboard.today.startAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-sm text-slate-500">{dashboard.today.title}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[dashboard.today.status]} className="capitalize">
                      {dashboard.today.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Questions" value={dashboard.today.questionIds.length} compact />
                    <StatTile label="Students Started" value={dashboard.todayStats?.studentsStarted ?? 0} compact />
                    <StatTile label="Completed" value={dashboard.todayStats?.studentsCompleted ?? 0} compact />
                    <StatTile label="Average Score" value={`${dashboard.todayStats?.averageScore ?? 0} / ${dashboard.today.questionIds.length}`} compact />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Eye className="size-3.5" />} onClick={() => goToPreview(dashboard.today!._id)}>
                      View Challenge
                    </Button>
                    <Button size="sm" variant="secondary" icon={<BarChart3 className="size-3.5" />} onClick={() => goToAnalytics(dashboard.today!._id)}>
                      View Analytics
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState title="No challenge created for today." description="Create one to publish it now, or schedule it for a future date." />
              )}
            </Card>

            <Card className="mb-6 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h3>
              {dashboard?.upcoming.length ? (
                <div className="flex flex-col gap-2">
                  {dashboard.upcoming.map((c) => (
                    <ChallengeRow key={c._id} challenge={c} onView={() => goToPreview(c._id)} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">Nothing scheduled or drafted yet.</p>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Challenges</h3>
              {dashboard?.recent.length ? (
                <div className="flex flex-col gap-2">
                  {dashboard.recent.map((c) => (
                    <ChallengeRow key={c._id} challenge={c} onView={() => goToAnalytics(c._id)} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">No published or expired challenges yet.</p>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  // ─── CREATE / EDIT ──────────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <BackBar label="Back to Dashboard" onClick={backToDashboard} />
        <h2 className="font-heading mb-6 text-xl font-bold text-slate-900">{editingId ? 'Edit Daily Challenge' : 'Create Daily Challenge'}</h2>

        <Card className="mb-6 p-6">
          <Select
            label="Exam"
            value={form.examId}
            onChange={(e) => setForm({ ...form, examId: e.target.value })}
            wrapperClassName="mb-4 sm:max-w-sm"
          >
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
              </option>
            ))}
          </Select>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Date & Time"
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            />
            <Input
              label="Title"
              placeholder="C3 Daily Challenge - September 1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Complete today's 5 questions"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            wrapperClassName="mb-4"
          />
          <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
            <Input
              label="Maximum Attempts"
              type="number"
              min={1}
              value={form.maxAttempts}
              onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) || 1 })}
            />
            <Input
              label="Availability (days)"
              type="number"
              min={1}
              value={form.availabilityDays}
              onChange={(e) => setForm({ ...form, availabilityDays: Number(e.target.value) || 1 })}
            />
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <DailyChallengeQuestionPicker
            examId={form.examId}
            selected={form.questionIds}
            onChange={(ids) => setForm({ ...form, questionIds: ids })}
            max={5}
          />
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSaveDraft} loading={saving}>
            Save Draft
          </Button>
          <Button variant="secondary" onClick={backToDashboard}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ─── PREVIEW ────────────────────────────────────────────────────────────
  if (view === 'preview') {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <BackBar label="Back to Dashboard" onClick={backToDashboard} />
        {detailLoading || !detail ? (
          <LoadingState message="Loading challenge..." />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-slate-900">{detail.title}</h2>
                <p className="text-sm text-slate-500">{detail.description}</p>
              </div>
              <Badge variant={STATUS_BADGE[detail.status]} className="capitalize">
                {detail.status}
              </Badge>
            </div>

            <Card className="mb-6 p-5">
              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                <span>
                  <strong className="text-slate-900">{detail.questionIds.length}</strong> Questions
                </span>
                <span>
                  <strong className="text-slate-900">{detail.maxAttempts}</strong> Attempts
                </span>
                <span>
                  Available for <strong className="text-slate-900">{detail.availabilityDays}</strong> Days
                </span>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              {detail.questions.map((q, idx) => {
                const missingExplanation = !q.explanation || !q.explanation.trim();
                const correctKeys = correctAnswerKeys(q.correct_answer);
                return (
                  <Card key={q._id} className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Question {idx + 1}</span>
                      {missingExplanation && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-warning-text">
                          <TriangleAlert className="size-3.5" /> Explanation missing
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <QuestionRenderer question={q} />
                    </div>
                    {q.answerType === 'numerical' ? (
                      <p className="text-sm text-slate-600">
                        Correct answer: <strong className="text-success-600">{String(q.correct_answer)}</strong>
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {OPTION_KEYS.map((key) => {
                          const text = q.options?.[key];
                          if (!text) return null;
                          const isCorrect = correctKeys.includes(key);
                          return (
                            <div
                              key={key}
                              className={[
                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                                isCorrect ? 'border-success-500/40 bg-success-soft/40 text-success-700' : 'border-slate-200 text-slate-700',
                              ].join(' ')}
                            >
                              <span className="font-bold">{key.toUpperCase()}.</span> {text}
                              {isCorrect && <CheckCircle2 className="ml-auto size-3.5 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.explanation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{q.explanation}</p>}
                  </Card>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              {detail.status === 'draft' && (
                <>
                  <Button variant="secondary" onClick={() => goToEdit(detail)}>
                    Back to Edit
                  </Button>
                  <Button onClick={handlePublish}>Publish</Button>
                </>
              )}
              {detail.status !== 'draft' && (
                <Button variant="secondary" icon={<BarChart3 className="size-4" />} onClick={() => goToAnalytics(detail._id)}>
                  View Analytics
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── ALL CHALLENGES ─────────────────────────────────────────────────────
  if (view === 'all') {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <BackBar label="Back to Dashboard" onClick={backToDashboard} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold text-slate-900">All Daily Challenges</h2>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={goToCreate}>
            Create Daily Challenge
          </Button>
        </div>

        {allLoading ? (
          <LoadingState message="Loading challenges..." />
        ) : allChallenges.length === 0 ? (
          <EmptyState title="No Daily Challenges yet." description="Create your first one to get started." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allChallenges.map((c) => (
                  <tr key={c._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{new Date(c.startAt).toLocaleDateString()}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{c.title}</td>
                    <td className="px-4 py-3 text-slate-600">{c.questionIds.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[c.status]} className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {duplicatingId === c._id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="datetime-local"
                            value={duplicateStartAt}
                            onChange={(e) => setDuplicateStartAt(e.target.value)}
                            wrapperClassName="w-48"
                          />
                          <Button size="sm" onClick={() => handleDuplicateConfirm(c._id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setDuplicatingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => goToPreview(c._id)} aria-label="View">
                            <Eye className="size-3.5" />
                          </Button>
                          {c.status === 'draft' && (
                            <Button size="sm" variant="secondary" onClick={() => goToEdit(c)} aria-label="Edit">
                              <ListChecks className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setDuplicatingId(c._id);
                              setDuplicateStartAt(nowDatetimeLocal());
                            }}
                            aria-label="Duplicate"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          {(c.status === 'published' || c.status === 'expired') && (
                            <Button size="sm" variant="secondary" onClick={() => goToAnalytics(c._id)} aria-label="Analytics">
                              <BarChart3 className="size-3.5" />
                            </Button>
                          )}
                          {c.status === 'draft' && (
                            <Button size="sm" variant="danger" onClick={() => handleDelete(c._id)} aria-label="Delete">
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  }

  // ─── ANALYTICS ──────────────────────────────────────────────────────────
  if (view === 'analytics') {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <BackBar label="Back to Dashboard" onClick={backToDashboard} />
        {analyticsLoading || !analytics ? (
          <LoadingState message="Loading analytics..." />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="font-heading text-xl font-bold text-slate-900">Daily Challenge Analytics</h2>
              <p className="text-sm text-slate-500">
                {analytics.challenge.title} · {new Date(analytics.challenge.startAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Eligible Students" value={analytics.participation.eligibleStudents} />
              <StatTile label="Started" value={analytics.participation.attemptedStudents} />
              <StatTile label="Completed" value={analytics.participation.completedStudents} />
              <StatTile label="Not Attempted" value={analytics.participation.notAttempted} />
              <StatTile label="Completion Rate" value={`${analytics.participation.completionRate}%`} />
              <StatTile label="Average Score %" value={`${analytics.participation.averagePercentage}%`} />
              <StatTile label="Average Attempts" value={analytics.participation.averageAttempts} />
              <StatTile label="Highest Score" value={`${analytics.participation.highestScore} / ${analytics.perQuestion.length}`} />
            </div>

            <Card className="mb-6 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Question Analytics</h3>
              <div className="flex flex-col gap-2">
                {analytics.perQuestion.map((q, idx) => (
                  <div key={q.questionId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      Q{idx + 1}. {q.questionText}
                    </span>
                    <span className={['shrink-0 text-sm font-bold', q.accuracyPercent < 50 ? 'text-danger-600' : 'text-success-600'].join(' ')}>
                      {q.accuracyPercent}% {q.accuracyPercent < 50 && <TriangleAlert className="ml-1 inline size-3.5" />}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Student Attempts</h3>
              {analytics.perStudent.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No attempts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attempts</th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Best Score</th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.perStudent.map((s) => (
                        <tr key={s.studentEmail} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-800">{s.studentName || s.studentEmail}</td>
                          <td className="px-3 py-2 text-slate-600">{s.attemptsUsed}</td>
                          <td className="px-3 py-2 text-slate-600">{s.submitted ? `${s.bestPercentage}%` : '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant={s.submitted ? 'success' : 'neutral'}>{s.submitted ? 'Completed' : 'In Progress'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  return null;
}

function BackBar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
    >
      <ArrowLeft className="size-3.5" /> {label}
    </button>
  );
}

function StatTile({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <Card className={compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}>
      <p className="font-heading text-lg font-bold leading-tight text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function ChallengeRow({ challenge, onView }: { challenge: DailyChallenge; onView: () => void }) {
  return (
    <button
      type="button"
      onClick={onView}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50/60"
    >
      <div className="flex items-center gap-3">
        <CalendarClock className="size-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-800">{new Date(challenge.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span className="text-xs text-slate-400">{challenge.questionIds.length} Questions</span>
      </div>
      <Badge variant={STATUS_BADGE[challenge.status]} className="capitalize">
        {challenge.status}
      </Badge>
    </button>
  );
}
