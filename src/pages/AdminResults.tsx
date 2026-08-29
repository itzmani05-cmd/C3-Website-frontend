import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import api from '../api';
import { useModal } from '../components/ui';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { LoadingState } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import type { ExamQuestion, OptionKey, StudentExam, TestSummary } from '../types/models';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const MARKS_PER_QUESTION = 1.5;

const formatMarks = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const pctBadgeVariant = (pct: number): BadgeVariant => {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'danger';
};

type SortKey = 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'pct-desc' | 'pct-asc';

interface SelectedTest {
  testId: string | null;
  testName: string;
}

interface AttemptDetail {
  studentExam: StudentExam;
  questions: ExamQuestion[];
}

export default function AdminResults() {
  const { showConfirm, showAlert } = useModal();
  const [testsSummary, setTestsSummary] = useState<TestSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [selectedTest, setSelectedTest] = useState<SelectedTest | null>(null);
  const [results, setResults] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date-desc');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailData, setDetailData] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    fetchTestsSummary();
  }, []);

  const fetchTestsSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const response = await api.get<TestSummary[]>('/api/exam/admin/tests-summary', getApiConfig());
      setTestsSummary(response.data || []);
    } catch (err) {
      console.error(err);
      setSummaryError('Failed to fetch conducted tests.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchResultsForTest = async (test: SelectedTest) => {
    setLoading(true);
    setError('');
    try {
      const params = test.testId ? { testId: test.testId } : { testName: test.testName };
      const response = await api.get<StudentExam[]>('/api/exam/admin/results', { ...getApiConfig(), params });
      setResults(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exam results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTest = (test: SelectedTest) => {
    setSelectedTest(test);
    setSearchTerm('');
    setSortBy('date-desc');
    fetchResultsForTest(test);
  };

  const handleBackToList = () => {
    setSelectedTest(null);
    setResults([]);
    setError('');
    fetchTestsSummary();
  };

  const handleDelete = async (id: string, studentEmail: string, testName: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the attempt for student "${studentEmail}" on test "${testName}"?\nThis will completely erase their progress and scores, allowing them to take the exam again.`,
      { title: 'Delete Attempt', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/exam/admin/results/${id}`, getApiConfig());
      setResults((prev) => prev.filter((r) => r._id !== id));
      if (selectedResult === id) {
        setSelectedResult(null);
        setDetailData(null);
      }
      await showAlert('Student attempt cleared successfully.', { variant: 'success' });
    } catch (err) {
      console.error(err);
      await showAlert('Failed to clear attempt. Please try again.', { variant: 'error' });
    }
  };

  const handleViewDetails = async (id: string) => {
    setSelectedResult(id);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
    try {
      const response = await api.get<AttemptDetail>(`/api/exam/admin/results/${id}`, getApiConfig());
      setDetailData(response.data);
    } catch (err) {
      console.error(err);
      setDetailError('Failed to load result details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedResult(null);
    setDetailData(null);
  };

  const filteredResults = results.filter((r) => {
    const searchLower = searchTerm.toLowerCase();
    return r.studentEmail?.toLowerCase().includes(searchLower) || r.studentName?.toLowerCase().includes(searchLower);
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'date-desc') return (new Date(b.submittedAt ?? 0).getTime()) - (new Date(a.submittedAt ?? 0).getTime());
    if (sortBy === 'date-asc') return (new Date(a.submittedAt ?? 0).getTime()) - (new Date(b.submittedAt ?? 0).getTime());
    if (sortBy === 'score-desc') return (b.score || 0) - (a.score || 0);
    if (sortBy === 'score-asc') return (a.score || 0) - (b.score || 0);
    if (sortBy === 'pct-desc') return (b.percentage || 0) - (a.percentage || 0);
    if (sortBy === 'pct-asc') return (a.percentage || 0) - (b.percentage || 0);
    return 0;
  });

  // ─── Master View: list of conducted tests ────────────────────────────────
  if (!selectedTest) {
    return (
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold text-slate-900">Student Assessment Results</h1>
              <p className="mt-0.5 text-sm text-slate-500">Select a test to review student performance for that assessment.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchTestsSummary} icon={<RotateCcw className="size-3.5" />}>
            Refresh
          </Button>
        </div>

        {!summaryLoading && testsSummary.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="px-4 py-3">
              <p className="font-heading text-lg font-bold leading-tight text-slate-900">{testsSummary.length}</p>
              <p className="text-xs text-slate-500">Tests conducted</p>
            </Card>
            <Card className="px-4 py-3">
              <p className="font-heading text-lg font-bold leading-tight text-slate-900">
                {testsSummary.reduce((sum, t) => sum + (t.studentsAttempted || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total attempts</p>
            </Card>
            <Card className="col-span-2 px-4 py-3 sm:col-span-1">
              <p className="font-heading text-lg font-bold leading-tight text-brand-600">
                {Math.round(testsSummary.reduce((sum, t) => sum + (t.averagePercentage || 0), 0) / testsSummary.length)}%
              </p>
              <p className="text-xs text-slate-500">Average score</p>
            </Card>
          </div>
        )}

        {summaryLoading ? (
          <LoadingState message="Fetching conducted tests..." />
        ) : summaryError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="flex items-center gap-2 text-sm font-medium text-danger-600">
              <XCircle className="size-4" /> {summaryError}
            </p>
            <Button variant="secondary" size="sm" onClick={fetchTestsSummary}>
              Retry Connection
            </Button>
          </div>
        ) : testsSummary.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-8" />}
            title="No tests have been conducted yet."
            description="Results will appear here once students start submitting exams."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {testsSummary.map((test) => {
              const pct = test.averagePercentage || 0;
              return (
                <Card
                  key={test.testId || test.testName}
                  onClick={() => handleSelectTest(test)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSelectTest(test);
                  }}
                  className="cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{test.testName}</h3>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" />
                  </div>
                  <p className="mb-4 text-xs text-slate-400">
                    Last submission: {test.lastSubmittedAt ? new Date(test.lastSubmittedAt).toLocaleString() : 'N/A'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users className="size-4" />
                      <span>
                        <strong>{test.studentsAttempted}</strong> Attempted
                      </span>
                    </div>
                    <Badge variant={pctBadgeVariant(pct)}>Avg {pct}%</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Detail View: students who attempted the selected test ───────────────
  return (
    <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <button onClick={handleBackToList} className="flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="size-3.5" /> Back to Tests
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-500">{selectedTest.testName}</span>
      </div>

      <div className="mb-6 flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <FileCheck2 className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">{selectedTest.testName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">Track and review student performances for this test.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Input
          leadingIcon={<Search className="size-4" />}
          placeholder="Search by student name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          wrapperClassName="w-full max-w-xs"
        />
        <div className="flex items-center gap-3">
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} wrapperClassName="w-56">
            <option value="date-desc">Submitted: Newest First</option>
            <option value="date-asc">Submitted: Oldest First</option>
            <option value="score-desc">Score: Highest First</option>
            <option value="score-asc">Score: Lowest First</option>
            <option value="pct-desc">Percentage: Highest First</option>
            <option value="pct-asc">Percentage: Lowest First</option>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => fetchResultsForTest(selectedTest)} icon={<RotateCcw className="size-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Fetching assessment results..." />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="flex items-center gap-2 text-sm font-medium text-danger-600">
            <XCircle className="size-4" /> {error}
          </p>
          <Button variant="secondary" size="sm" onClick={() => fetchResultsForTest(selectedTest)}>
            Retry Connection
          </Button>
        </div>
      ) : sortedResults.length === 0 ? (
        <EmptyState title="No students have attempted this test yet." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Student Name</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Raw Score(200)</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Marks(300)</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Percentage(100)</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => {
                const pct = result.percentage ?? 0;
                return (
                  <tr key={result._id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">{result.studentName || '—'}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{result.score}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{formatMarks((result.score || 0) * MARKS_PER_QUESTION)}</td>
                    <td className="px-5 py-4">
                      <Badge variant={pctBadgeVariant(pct)}>{pct}%</Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleViewDetails(result._id)} icon={<Eye className="size-3.5" />}>
                          View Attempt
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(result._id, result.studentEmail, result.testName)}
                          icon={<Trash2 className="size-3.5" />}
                        >
                          Allow Retake
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!selectedResult}
        onClose={handleCloseModal}
        size="xl"
        title={
          <div>
            <div className="font-heading text-base font-semibold text-slate-900">Attempt Review</div>
            {detailData && (
              <p className="mt-0.5 text-xs font-normal text-slate-500">
                Student: <strong className="font-semibold text-slate-700">{detailData.studentExam.studentName || detailData.studentExam.studentEmail}</strong>
                {detailData.studentExam.studentName && <> ({detailData.studentExam.studentEmail})</>} | Test:{' '}
                <strong className="font-semibold text-slate-700">{detailData.studentExam.testName}</strong>
              </p>
            )}
          </div>
        }
        footer={
          <Button variant="secondary" onClick={handleCloseModal}>
            Close Review
          </Button>
        }
      >
        {detailLoading ? (
          <LoadingState message="Loading response sheets and answer keys..." />
        ) : detailError ? (
          <p className="flex items-center gap-2 text-sm font-medium text-danger-600">
            <XCircle className="size-4" /> {detailError}
          </p>
        ) : !detailData ? (
          <p className="text-sm text-slate-500">No detail data retrieved.</p>
        ) : (
          <div>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatBox label="Overall Score" value={`${detailData.studentExam.score} / ${detailData.studentExam.totalQuestions}`} />
              <StatBox
                label="Marks"
                value={`${formatMarks((detailData.studentExam.score || 0) * MARKS_PER_QUESTION)} / ${formatMarks((detailData.studentExam.totalQuestions || 0) * MARKS_PER_QUESTION)}`}
              />
              <StatBox label="Percentage" value={`${detailData.studentExam.percentage}%`} tone="brand" />
              <StatBox label="Correct" value={detailData.studentExam.correctCount} tone="success" />
              <StatBox label="Incorrect" value={detailData.studentExam.wrongCount} tone="danger" />
              <StatBox label="Unanswered" value={detailData.studentExam.unansweredCount} tone="neutral" />
            </div>

            <p className="mb-5 text-xs text-slate-500">
              Submitted at:{' '}
              <strong className="font-semibold text-slate-700">
                {detailData.studentExam.submittedAt ? new Date(detailData.studentExam.submittedAt).toLocaleString() : 'N/A'}
              </strong>
            </p>

            <h3 className="font-heading mb-3 text-sm font-semibold text-slate-900">Response Breakdown</h3>
            <div className="flex flex-col gap-4">
              {detailData.questions?.map((q, idx) => {
                if (!q || !q._id) return null;
                const qId = q._id.toString();
                const rawAns = (detailData.studentExam.answers as Record<string, string>)?.[qId];
                const studentAns = typeof rawAns === 'string' ? rawAns : '';
                const correctAnswer = typeof q.correct_answer === 'string' ? q.correct_answer : '';
                const isCorrect = !!studentAns && !!correctAnswer && studentAns.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                const status: 'unanswered' | 'correct' | 'incorrect' = !studentAns ? 'unanswered' : isCorrect ? 'correct' : 'incorrect';

                const statusBorder =
                  status === 'correct' ? 'border-success-500/30' : status === 'incorrect' ? 'border-danger-500/30' : 'border-slate-200';
                const statusBadgeVariant: BadgeVariant = status === 'correct' ? 'success' : status === 'incorrect' ? 'danger' : 'neutral';

                return (
                  <div key={qId} className={['rounded-2xl border bg-white p-5 shadow-soft-sm', statusBorder].join(' ')}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Question {idx + 1} of {detailData.questions.length}
                      </span>
                      <Badge variant={statusBadgeVariant} className="capitalize">
                        {status}
                      </Badge>
                    </div>

                    <p className="mb-3 text-sm font-medium text-slate-800">{q.question}</p>
                    {q.questionImage && (
                      <img src={q.questionImage} alt={`Question ${idx + 1}`} className="mb-3 max-h-64 rounded-lg border border-slate-100 object-contain" />
                    )}

                    <div className="flex flex-col gap-2">
                      {(['a', 'b', 'c', 'd'] as OptionKey[]).map((key) => {
                        const optText = q.options?.[key];
                        const optImg = q.optionImages?.[key];
                        if (!optText && !optImg) return null;

                        const isThisCorrect = !!correctAnswer && key === correctAnswer.toLowerCase().trim();
                        const isThisStudentChoice = !!studentAns && key === studentAns.toLowerCase().trim();

                        let rowClass = 'border-slate-200';
                        let tag: string | null = null;
                        if (isThisCorrect && isThisStudentChoice) {
                          rowClass = 'border-success-500/40 bg-success-soft/40';
                          tag = 'Student Choice & Correct';
                        } else if (isThisCorrect) {
                          rowClass = 'border-success-500/40 bg-success-soft/40';
                          tag = 'Correct Answer';
                        } else if (isThisStudentChoice) {
                          rowClass = 'border-danger-500/40 bg-danger-soft/40';
                          tag = 'Student Choice';
                        }

                        return (
                          <div key={key} className={['flex items-start gap-3 rounded-lg border px-3 py-2.5', rowClass].join(' ')}>
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                              {key.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              {optText && <p className="text-sm text-slate-700">{optText}</p>}
                              {optImg && <img src={optImg} alt={`Option ${key.toUpperCase()}`} className="mt-1.5 max-h-32 rounded-md border border-slate-100" />}
                            </div>
                            {tag && (
                              <span
                                className={[
                                  'flex shrink-0 items-center gap-1 text-xs font-semibold',
                                  isThisCorrect ? 'text-success-600' : 'text-danger-600',
                                ].join(' ')}
                              >
                                {isThisCorrect ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                                {tag}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {(q.explanation || q.explanationImage) && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3.5">
                        <h5 className="mb-1 text-xs font-semibold text-slate-600">Explanation:</h5>
                        {q.explanation && <p className="text-sm text-slate-600">{q.explanation}</p>}
                        {q.explanationImage && <img src={q.explanationImage} alt="Explanation Graphics" className="mt-2 max-h-64 rounded-lg" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatBox({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'brand' | 'success' | 'danger' | 'neutral' }) {
  const toneClasses: Record<string, string> = {
    default: 'text-slate-900',
    brand: 'text-brand-600',
    success: 'text-success-600',
    danger: 'text-danger-600',
    neutral: 'text-slate-500',
  };
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-center">
      <span className="block text-[0.68rem] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <strong className={['mt-1 block text-lg font-bold', toneClasses[tone]].join(' ')}>{value}</strong>
    </div>
  );
}
