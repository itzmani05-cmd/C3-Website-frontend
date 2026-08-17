import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, studentEmail, location.pathname]);

  // Countdown timer
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, remainingTime, examStarted]);

  // Server heartbeat every 30s
  useEffect(() => {
    if (loading || submitted || !examStarted) return;
    const heartbeat = setInterval(() => refreshExamStatus(), 30000);
    return () => clearInterval(heartbeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, unsyncedAnswers, examStarted]);

  // Mark the active question visited (drives the "Not Visited" vs "Not Answered" sidebar state)
  useEffect(() => {
    if (!examStarted || questions.length === 0) return;
    const activeId = questions[activeQuestionIndex]?._id;
    if (!activeId) return;
    setVisitedQuestions((prev) => (prev.has(activeId) ? prev : new Set(prev).add(activeId)));
  }, [examStarted, questions, activeQuestionIndex]);

  // Detect duplicate-tab conflict
  useEffect(() => {
    if (submitted || !examStarted) return;
    const checkTabLock = setInterval(() => {
      const activeTabId = localStorage.getItem(`c3_exam_active_tab_${emailRef.current}`);
      if (activeTabId && activeTabId !== tabIdRef.current) setTabConflict(true);
    }, 2000);
    return () => clearInterval(checkTabLock);
  }, [submitted, examStarted]);

  // Auto-sync unsynced answers after 3-second debounce
  useEffect(() => {
    if (Object.keys(unsyncedAnswers).length === 0 || !examStarted) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (navigator.onLine) syncAnswersWithBackend(answers, unsyncedAnswers);
    }, 3000);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsyncedAnswers, examStarted]);

  const fetchTestsList = async () => {
    try {
      setLoading(true);
      const response = await api.get<AvailableTest[]>('/api/exam/list', getApiConfig());
      setAvailableTests(response.data || []);
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
      const { data } = await api.post('/api/exam/start', { testId: tId }, getApiConfig());

      setQuestions(data.questions || []);
      setSubmitted(data.submitted);
      setSubmittedAt(data.submittedAt);
      setRemainingTime(data.remainingTime);
      setSelectedTestId(tId);
      setSelectedTestName(data.testName);

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
    } catch (err) {
      console.error(err);
      setError('Failed to load exam session.');
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
      const { data } = await api.post('/api/exam/start', { testId: selectedTestId }, getApiConfig());
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

  const handleNavigateQuestion = async (index: number) => {
    if (index < 0 || index >= questions.length) return;
    if (Object.keys(unsyncedAnswers).length > 0) await forceImmediateSync();
    setActiveQuestionIndex(index);
  };

  const handleTabTakeover = () => {
    localStorage.setItem(`c3_exam_active_tab_${emailRef.current}`, tabIdRef.current);
    setTabConflict(false);
  };

  const handleBackToExams = async () => {
    if (Object.keys(unsyncedAnswers).length > 0) await forceImmediateSync();
    navigate('/');
  };

  // ─── Render — early-exit screens ───────────────────────────────────────

  if (loading && questions.length === 0 && availableTests.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState message="Loading Assessment Portal..." />
      </div>
    );
  }

  if (error && questions.length === 0 && availableTests.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft-sm">
          <h2 className="text-lg font-bold text-slate-900">Connection or Authentication Error</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button onClick={onLogout} className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Return to Login
          </button>
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
    return <TestSelectionPage availableTests={availableTests} studentEmail={emailRef.current} onStartExam={handleStartExam} onLogout={onLogout} />;
  }

  if (submitted) {
    return (
      <ExamResultPage
        selectedTestName={selectedTestName}
        studentEmail={emailRef.current}
        questions={questions}
        answers={answers}
        submittedAt={submittedAt}
        onBackToExams={handleBackToExams}
      />
    );
  }

  const currentQuestion = questions[activeQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
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

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto">
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
        <SubmitModal answeredCount={answeredCount} unansweredCount={unansweredCount} onConfirm={handleManualSubmit} onCancel={() => setShowSubmitModal(false)} />
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
