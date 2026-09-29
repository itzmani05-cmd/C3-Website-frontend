import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { formatTime, getApiConfig, getEmailFromToken } from '../lib/examSession';
import { LoadingState } from '../components/ui/Spinner';
import ExamHeader from '../components/exam/ExamHeader';
import QuestionSidebar from '../components/exam/QuestionSidebar';
import QuestionCard from '../components/exam/QuestionCard';
import SubmitModal from '../components/exam/SubmitModal';
import ExitConfirmModal from '../components/exam/ExitConfirmModal';
import TestSelectionPage from '../components/exam/TestSelectionPage';
import ExamResultPage from '../components/exam/ExamResultPage';
import ScientificCalculator from '../components/exam/ScientificCalculator';
import type { AvailableTest, ExamQuestion } from '../types/models';

interface TestAreaProps {
  onLogout: () => void;
}

export default function TestArea({ onLogout }: TestAreaProps) {
  const { studentEmail, testId } = useParams<{ studentEmail: string; testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableTests, setAvailableTests] = useState<AvailableTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [unsyncedAnswers, setUnsyncedAnswers] = useState<Record<string, string | null>>({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultMaxScore, setResultMaxScore] = useState<number | null>(null);
  const [studentName, setStudentName] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [tabConflict, setTabConflict] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  const emailRef = useRef('student');
  const tabIdRef = useRef('');
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeWarningsShownRef = useRef<Set<number>>(new Set());

  const progressKey = (tId: string) => `c3_exam_progress_${emailRef.current}_${tId}`;

  useEffect(() => {
    emailRef.current = getEmailFromToken();

    let tabId = sessionStorage.getItem('c3_exam_tab_id');
    if (!tabId) {
      tabId = Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('c3_exam_tab_id', tabId);
    }
    tabIdRef.current = tabId;
    localStorage.setItem(`c3_exam_active_tab_${emailRef.current}`, tabId);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && examStarted) refreshExamStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [examStarted]);

  useEffect(() => {
    emailRef.current = getEmailFromToken();

    if (studentEmail && studentEmail.toLowerCase() !== emailRef.current.toLowerCase()) {
      navigate('/', { replace: true });
      return;
    }

    if (testId) {
      const isResultMode = location.pathname.endsWith('/result');
      loadOrResumeExam(testId, isResultMode);
    } else {
      setExamStarted(false);
      setSelectedTestId('');
      setSelectedTestName('');
      setQuestions([]);
      setAnswers({});
      setUnsyncedAnswers({});
      setSubmitted(false);
      setSubmittedAt(null);
      fetchTestsList();
    }
  }, [testId, studentEmail, location.pathname]);

  useEffect(() => {
    if (loading || submitted || remainingTime <= 0 || !examStarted) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitted, remainingTime, examStarted]);

  useEffect(() => {
    if (!examStarted || submitted || loading) return;
    for (const threshold of [300, 60]) {
      if (remainingTime > 0 && remainingTime <= threshold && !timeWarningsShownRef.current.has(threshold)) {
        timeWarningsShownRef.current.add(threshold);
        toast.warning(
          threshold === 60
            ? '1 minute left — your test will be submitted automatically.'
            : '5 minutes left. Review any questions marked for review.',
          { autoClose: 8000 }
        );
        break;
      }
    }
  }, [remainingTime, examStarted, submitted, loading]);

  useEffect(() => {
    if (loading || submitted || !examStarted) return;
    const heartbeat = setInterval(() => refreshExamStatus(), 30000);
    return () => clearInterval(heartbeat);
  }, [loading, submitted, unsyncedAnswers, examStarted]);

  useEffect(() => {
    if (!examStarted || questions.length === 0) return;
    const activeId = questions[activeQuestionIndex]?._id;
    if (!activeId) return;
    setVisitedQuestions((prev) => (prev.has(activeId) ? prev : new Set(prev).add(activeId)));
  }, [examStarted, questions, activeQuestionIndex]);

  useEffect(() => {
    if (!examStarted || submitted || !selectedTestId || questions.length === 0) return;
    localStorage.setItem(
      progressKey(selectedTestId),
      JSON.stringify({
        activeQuestionIndex,
        visited: Array.from(visitedQuestions),
        marked: Array.from(markedForReview),
      })
    );
  }, [examStarted, submitted, selectedTestId, questions.length, activeQuestionIndex, visitedQuestions, markedForReview]);

  useEffect(() => {
    if (submitted || !examStarted) return;
    const checkTabLock = setInterval(() => {
      const activeTabId = localStorage.getItem(`c3_exam_active_tab_${emailRef.current}`);
      if (activeTabId && activeTabId !== tabIdRef.current) setTabConflict(true);
    }, 2000);
    return () => clearInterval(checkTabLock);
  }, [submitted, examStarted]);

  useEffect(() => {
    if (Object.keys(unsyncedAnswers).length === 0 || !examStarted) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (navigator.onLine) syncAnswersWithBackend(answers, unsyncedAnswers);
    }, 3000);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [unsyncedAnswers, examStarted]);

  const fetchTestsList = async () => {
    try {
      setLoading(true);
      setError('');
      const [response, profile] = await Promise.all([
        api.get<AvailableTest[]>('/api/exam/list', getApiConfig()),
        api.get<{ name?: string }>('/api/auth/me', getApiConfig()).catch(() => null),
      ]);
      setAvailableTests(response.data || []);
      setStudentName(profile?.data?.name || '');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exams list. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (tId: string) => {
    const test = availableTests.find((t) => t._id === tId);
    if (test && test.submitted) {
      navigate(`/${emailRef.current}/${tId}/result`);
    } else {
      navigate(`/${emailRef.current}/${tId}`);
    }
  };

  const loadOrResumeExam = async (tId: string, isResultMode: boolean) => {
    try {
      setLoading(true);
      setError('');
      timeWarningsShownRef.current = new Set();
      const { data } = await api.post('/api/exam/start', { testId: tId }, getApiConfig());

      setQuestions(data.questions || []);
      setSubmitted(data.submitted);
      setSubmittedAt(data.submittedAt);
      setRemainingTime(data.remainingTime);
      setSelectedTestId(tId);
      setSelectedTestName(data.testName);
      setResultScore(typeof data.score === 'number' ? data.score : null);
      setResultMaxScore(typeof data.maxScore === 'number' && data.maxScore > 0 ? data.maxScore : null);

      if (data.submitted && !isResultMode) {
        navigate(`/${emailRef.current}/${tId}/result`, { replace: true });
        return;
      } else if (!data.submitted && isResultMode) {
        navigate(`/${emailRef.current}/${tId}`, { replace: true });
        return;
      }

      if (!data.submitted) {
        const dbAnswers = data.answers || {};
        const localAnsStr = localStorage.getItem(`c3_exam_answers_${emailRef.current}_${tId}`);
        const localUnsyncedStr = localStorage.getItem(`c3_exam_unsynced_${emailRef.current}_${tId}`);
        let mergedAnswers = { ...dbAnswers };
        let localUnsynced: Record<string, string | null> = {};

        if (localAnsStr) {
          try {
            mergedAnswers = { ...dbAnswers, ...JSON.parse(localAnsStr) };
          } catch (e) {
            console.error(e);
          }
        }
        if (localUnsyncedStr) {
          try {
            localUnsynced = JSON.parse(localUnsyncedStr);
            mergedAnswers = { ...mergedAnswers, ...localUnsynced };
          } catch (e) {
            console.error(e);
          }
        }

        Object.keys(mergedAnswers).forEach((key) => {
          if (mergedAnswers[key] == null) delete mergedAnswers[key];
        });

        let savedIndex = 0;
        let savedVisited: string[] = [];
        let savedMarked: string[] = [];
        const progressStr = localStorage.getItem(progressKey(tId));
        if (progressStr) {
          try {
            const progress = JSON.parse(progressStr);
            if (Number.isInteger(progress.activeQuestionIndex)) savedIndex = progress.activeQuestionIndex;
            if (Array.isArray(progress.visited)) savedVisited = progress.visited;
            if (Array.isArray(progress.marked)) savedMarked = progress.marked;
          } catch (e) {
            console.error(e);
          }
        }
        const questionCount = (data.questions || []).length;
        setActiveQuestionIndex(Math.min(Math.max(savedIndex, 0), Math.max(questionCount - 1, 0)));
        setVisitedQuestions(new Set(savedVisited));
        setMarkedForReview(new Set(savedMarked));

        setAnswers(mergedAnswers);
        setUnsyncedAnswers(localUnsynced);
        setExamStarted(true);

        if (Object.keys(localUnsynced).length > 0 && navigator.onLine) {
          syncAnswersWithBackend(mergedAnswers, localUnsynced, tId);
        }
      } else {
        setAnswers(data.answers || {});
        setExamStarted(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load exam session. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncAnswersWithBackend = async (
    currentAnswers: Record<string, string>,
    pendingSync: Record<string, string | null>,
    tId: string = selectedTestId
  ) => {
    if (!navigator.onLine || Object.keys(pendingSync).length === 0 || syncing) return;
    setSyncing(true);
    try {
      const response = await api.post('/api/exam/sync', { testId: tId, answers: pendingSync }, getApiConfig());

      setUnsyncedAnswers((prev) => {
        const updated = { ...prev };
        Object.keys(pendingSync).forEach((key) => delete updated[key]);
        localStorage.setItem(`c3_exam_unsynced_${emailRef.current}_${tId}`, JSON.stringify(updated));
        return updated;
      });

      if (response.data.remainingTime !== undefined) setRemainingTime(response.data.remainingTime);
      if (response.data.submitted) {
        setSubmitted(true);
        navigate(`/${emailRef.current}/${tId}/result`, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400 && err.response?.data?.submitted) {
        setSubmitted(true);
        navigate(`/${emailRef.current}/${tId}/result`, { replace: true });
      }
    } finally {
      setSyncing(false);
    }
  };

  const forceImmediateSync = async () => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    if (Object.keys(unsyncedAnswers).length > 0) {
      await syncAnswersWithBackend(answers, unsyncedAnswers);
    }
  };

  const refreshExamStatus = async () => {
    if (!navigator.onLine || submitted) return;
    try {
      if (Object.keys(unsyncedAnswers).length > 0) await syncAnswersWithBackend(answers, unsyncedAnswers);
      const { data } = await api.get('/api/exam/status', { ...getApiConfig(), params: { testId: selectedTestId } });
      setSubmitted(data.submitted);
      setRemainingTime(data.remainingTime);
      setAnswers((prev) => {
        const merged = { ...data.answers, ...prev };
        localStorage.setItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`, JSON.stringify(merged));
        return merged;
      });
      if (data.submitted) {
        navigate(`/${emailRef.current}/${selectedTestId}/result`, { replace: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAutoSubmit = async () => {
    try {
      await forceImmediateSync();
      await api.post('/api/exam/submit', { testId: selectedTestId }, getApiConfig());
      clearLocalCache();
      navigate(`/${emailRef.current}/${selectedTestId}/result`, { replace: true });
    } catch (err) {
      console.error(err);
      navigate(`/${emailRef.current}/${selectedTestId}/result`, { replace: true });
    }
  };

  const handleManualSubmit = async () => {
    try {
      setLoading(true);
      setShowSubmitModal(false);
      await forceImmediateSync();
      await api.post('/api/exam/submit', { testId: selectedTestId }, getApiConfig());
      clearLocalCache();
      navigate(`/${emailRef.current}/${selectedTestId}/result`, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to submit exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearLocalCache = () => {
    localStorage.removeItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`);
    localStorage.removeItem(`c3_exam_unsynced_${emailRef.current}_${selectedTestId}`);
    localStorage.removeItem(progressKey(selectedTestId));
    localStorage.removeItem(`c3_exam_active_tab_${emailRef.current}`);
  };

  const handleSelectOption = (questionId: string, optionLetter: string) => {
    if (submitted) return;
    const newAnswers = { ...answers, [questionId]: optionLetter };
    const newUnsynced = { ...unsyncedAnswers, [questionId]: optionLetter };
    setAnswers(newAnswers);
    setUnsyncedAnswers(newUnsynced);
    localStorage.setItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`, JSON.stringify(newAnswers));
    localStorage.setItem(`c3_exam_unsynced_${emailRef.current}_${selectedTestId}`, JSON.stringify(newUnsynced));
  };

  const handleClearSelection = (questionId: string) => {
    if (submitted) return;
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    const newUnsynced = { ...unsyncedAnswers, [questionId]: null };
    setAnswers(newAnswers);
    setUnsyncedAnswers(newUnsynced);
    localStorage.setItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`, JSON.stringify(newAnswers));
    localStorage.setItem(`c3_exam_unsynced_${emailRef.current}_${selectedTestId}`, JSON.stringify(newUnsynced));
  };

  const handleSubmitClick = async () => {
    await forceImmediateSync();
    setShowSubmitModal(true);
  };

  const handleToggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleNavigateQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setActiveQuestionIndex(index);
    if (Object.keys(unsyncedAnswers).length > 0) void forceImmediateSync();
  };

  const handleTabTakeover = () => {
    localStorage.setItem(`c3_exam_active_tab_${emailRef.current}`, tabIdRef.current);
    setTabConflict(false);
  };

  const handleBackToExams = async () => {
    if (Object.keys(unsyncedAnswers).length > 0) await forceImmediateSync();
    navigate('/');
  };

  if (loading && !examStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading Assessment Portal..." />
      </div>
    );
  }

  if (error && !examStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft-sm">
          <h2 className="text-lg font-bold text-slate-900">{testId ? 'Could Not Open This Test' : 'Could Not Load Your Tests'}</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => (testId ? loadOrResumeExam(testId, location.pathname.endsWith('/result')) : fetchTestsList())}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Try Again
            </button>
            {testId && (
              <button onClick={() => navigate('/')} className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Back to Tests List
              </button>
            )}
            <button onClick={onLogout} className="w-full rounded-lg py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tabConflict) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-warning-500/30 bg-white p-8 text-center shadow-soft-sm">
          <TriangleAlert className="mx-auto mb-3 size-8 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">Exam Active in Another Tab</h2>
          <p className="mt-2 text-sm text-slate-500">
            We detected that you have opened this exam session in another browser window or tab. To prevent progress loss, only one active tab is allowed.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={handleTabTakeover} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Use This Tab Instead
            </button>
            <button onClick={onLogout} className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <TestSelectionPage
        availableTests={availableTests}
        studentName={studentName || emailRef.current}
        onStartExam={handleStartExam}
        onLogout={onLogout}
      />
    );
  }

  if (submitted) {
    return (
      <ExamResultPage
        selectedTestName={selectedTestName}
        studentEmail={emailRef.current}
        questions={questions}
        answers={answers}
        submittedAt={submittedAt}
        score={resultScore}
        maxScore={resultMaxScore}
        onBackToExams={handleBackToExams}
      />
    );
  }

  const currentQuestion = questions[activeQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = questions.filter((q) => markedForReview.has(q._id)).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen lg:overflow-hidden">
      <ExamHeader
        selectedTestName={selectedTestName}
        studentEmail={emailRef.current}
        online={online}
        syncing={syncing}
        unsyncedAnswers={unsyncedAnswers}
        remainingTime={remainingTime}
        formatTime={formatTime}
        calculatorOpen={showCalculator}
        onToggleCalculator={() => setShowCalculator((v) => !v)}
      />

      {!online && (
        <div className="flex items-center justify-center gap-1.5 bg-warning-soft px-4 py-2 text-center text-xs font-semibold text-warning-text">
          <TriangleAlert className="size-3.5" /> Connection lost. Your selections are safely saved locally on this device. We will sync to the server once your
          internet is restored.
        </div>
      )}

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <main className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <QuestionCard
            question={currentQuestion}
            questionIndex={activeQuestionIndex}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion?._id]}
            isMarkedForReview={!!currentQuestion && markedForReview.has(currentQuestion._id)}
            onSelectOption={handleSelectOption}
            onClearSelection={handleClearSelection}
            onToggleMarkForReview={() => currentQuestion && handleToggleMarkForReview(currentQuestion._id)}
            onPrev={() => handleNavigateQuestion(activeQuestionIndex - 1)}
            onNext={() => handleNavigateQuestion(activeQuestionIndex + 1)}
          />
        </main>

        <QuestionSidebar
          questions={questions}
          answers={answers}
          unsyncedAnswers={unsyncedAnswers}
          visitedQuestions={visitedQuestions}
          markedForReview={markedForReview}
          activeQuestionIndex={activeQuestionIndex}
          selectedTestName={selectedTestName}
          onNavigate={handleNavigateQuestion}
          onSubmitClick={handleSubmitClick}
          onExitClick={() => setShowExitModal(true)}
        />
      </div>

      {showSubmitModal && (
        <SubmitModal
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          markedCount={markedCount}
          onConfirm={handleManualSubmit}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}

      {showExitModal && (
        <ExitConfirmModal
          onConfirm={() => {
            setShowExitModal(false);
            handleBackToExams();
          }}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      <ScientificCalculator open={showCalculator} onToggle={() => setShowCalculator((v) => !v)} />
    </div>
  );
}
