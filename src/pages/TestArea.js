import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { WarningOutlined } from '@ant-design/icons';
import api from '../api';

import '../components/exam/exam.css';
import ExamHeader            from '../components/exam/ExamHeader';
import QuestionSidebar       from '../components/exam/QuestionSidebar';
import QuestionCard          from '../components/exam/QuestionCard';
import SubmitModal           from '../components/exam/SubmitModal';
import TestSelectionPage     from '../components/exam/TestSelectionPage';
import ExamResultPage        from '../components/exam/ExamResultPage';

const getEmailFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return 'student';
  try {
    const base64Url = token.split('.')[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload   = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(payload).email || 'student';
  } catch {
    return 'student';
  }
};

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const formatTime = (secs) => {
  if (secs <= 0) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

function TestArea({ onLogout }) {
  const { studentEmail, testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Core state ──
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');
  const [availableTests,     setAvailableTests]     = useState([]);
  const [selectedTestId,     setSelectedTestId]     = useState('');
  const [selectedTestName,   setSelectedTestName]   = useState('');
  const [examStarted,        setExamStarted]        = useState(false);
  const [questions,          setQuestions]          = useState([]);
  const [answers,            setAnswers]            = useState({});
  const [unsyncedAnswers,    setUnsyncedAnswers]    = useState({});
  const [remainingTime,      setRemainingTime]      = useState(0);
  const [submitted,          setSubmitted]          = useState(false);
  const [submittedAt,        setSubmittedAt]        = useState(null);
  const [activeQuestionIndex,setActiveQuestionIndex]= useState(0);
  const [syncing,            setSyncing]            = useState(false);
  const [online,             setOnline]             = useState(navigator.onLine);
  const [tabConflict,        setTabConflict]        = useState(false);
  const [showSubmitModal,    setShowSubmitModal]    = useState(false);

  // ── Refs ──
  const emailRef       = useRef('student');
  const tabIdRef       = useRef('');
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    emailRef.current = getEmailFromToken();

    let tabId = sessionStorage.getItem('c3_exam_tab_id');
    if (!tabId) {
      tabId = Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('c3_exam_tab_id', tabId);
    }
    tabIdRef.current = tabId;
    localStorage.setItem(`c3_exam_active_tab_${emailRef.current}`, tabId);

    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && examStarted) refreshExamStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted]);

  // Handle URL-parameter-based routing logic
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
        if (prev <= 1) { clearInterval(timer); triggerAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, remainingTime, examStarted]);

  // Server heartbeat every 30 s
  useEffect(() => {
    if (loading || submitted || !examStarted) return;
    const heartbeat = setInterval(() => refreshExamStatus(), 30000);
    return () => clearInterval(heartbeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, unsyncedAnswers, examStarted]);

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
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [unsyncedAnswers, examStarted]);

  // ─────────────────────────────────────────────────────────────────────────
  // API handlers
  // ─────────────────────────────────────────────────────────────────────────

  const fetchTestsList = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/exam/list', getApiConfig());
      setAvailableTests(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exams list. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (tId, tName) => {
    const test = availableTests.find(t => t._id === tId);
    if (test && test.submitted) {
      navigate(`/${emailRef.current}/${tId}/result`);
    } else {
      navigate(`/${emailRef.current}/${tId}`);
    }
  };

  const loadOrResumeExam = async (tId, isResultMode) => {
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

      // Routing enforcement guards
      if (data.submitted && !isResultMode) {
        navigate(`/${emailRef.current}/${tId}/result`, { replace: true });
        return;
      } else if (!data.submitted && isResultMode) {
        navigate(`/${emailRef.current}/${tId}`, { replace: true });
        return;
      }

      if (!data.submitted) {
        const dbAnswers        = data.answers || {};
        const localAnsStr      = localStorage.getItem(`c3_exam_answers_${emailRef.current}_${tId}`);
        const localUnsyncedStr = localStorage.getItem(`c3_exam_unsynced_${emailRef.current}_${tId}`);
        let mergedAnswers = { ...dbAnswers };
        let localUnsynced = {};

        if (localAnsStr) {
          try { mergedAnswers = { ...dbAnswers, ...JSON.parse(localAnsStr) }; }
          catch (e) { console.error(e); }
        }
        if (localUnsyncedStr) {
          try { localUnsynced = JSON.parse(localUnsyncedStr); mergedAnswers = { ...mergedAnswers, ...localUnsynced }; }
          catch (e) { console.error(e); }
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

  const syncAnswersWithBackend = async (currentAnswers, pendingSync, tId = selectedTestId) => {
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
    } catch (err) {
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

  // ─────────────────────────────────────────────────────────────────────────
  // UI event handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelectOption = (questionId, optionLetter) => {
    if (submitted) return;
    const newAnswers  = { ...answers,         [questionId]: optionLetter };
    const newUnsynced = { ...unsyncedAnswers, [questionId]: optionLetter };
    setAnswers(newAnswers);
    setUnsyncedAnswers(newUnsynced);
    localStorage.setItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`,  JSON.stringify(newAnswers));
    localStorage.setItem(`c3_exam_unsynced_${emailRef.current}_${selectedTestId}`, JSON.stringify(newUnsynced));
  };

  const handleClearSelection = (questionId) => {
    if (submitted) return;
    const newAnswers  = { ...answers };
    delete newAnswers[questionId];
    const newUnsynced = { ...unsyncedAnswers, [questionId]: null };
    setAnswers(newAnswers);
    setUnsyncedAnswers(newUnsynced);
    localStorage.setItem(`c3_exam_answers_${emailRef.current}_${selectedTestId}`,  JSON.stringify(newAnswers));
    localStorage.setItem(`c3_exam_unsynced_${emailRef.current}_${selectedTestId}`, JSON.stringify(newUnsynced));
  };

  const handleNavigateQuestion = async (index) => {
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render — early-exit screens
  // ─────────────────────────────────────────────────────────────────────────

  if (loading && questions.length === 0 && availableTests.length === 0) {
    return (
      <div className="exam-loading-container">
        <div className="loader"></div>
        <p>Loading Assessment Portal...</p>
      </div>
    );
  }

  if (error && questions.length === 0 && availableTests.length === 0) {
    return (
      <div className="exam-error-container">
        <div className="error-card">
          <h2>Connection or Authentication Error</h2>
          <p>{error}</p>
          <button className="logout-btn" onClick={onLogout}>Return to Login</button>
        </div>
      </div>
    );
  }

  if (tabConflict) {
    return (
      <div className="exam-overlay-container">
        <div className="overlay-card warning">
          <h2>Exam Active in Another Tab</h2>
          <p>
            We detected that you have opened this exam session in another browser
            window or tab. To prevent progress loss, only one active tab is allowed.
          </p>
          <div className="button-group">
            <button className="takeover-btn" onClick={handleTabTakeover}>Use This Tab Instead</button>
            <button className="logout-btn secondary" onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <TestSelectionPage
        availableTests={availableTests}
        studentEmail={emailRef.current}
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
        onBackToExams={handleBackToExams}
      />
    );
  }

  const currentQuestion = questions[activeQuestionIndex];
  const answeredCount   = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="exam-portal">
      <ExamHeader
        selectedTestName={selectedTestName}
        studentEmail={emailRef.current}
        online={online}
        syncing={syncing}
        unsyncedAnswers={unsyncedAnswers}
        remainingTime={remainingTime}
        formatTime={formatTime}
      />

      {!online && (
        <div className="offline-bar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <WarningOutlined /> Connection lost. Your selections are safely saved locally on this phone.
          We will sync to the server once your internet is restored.
        </div>
      )}

      <div className="exam-content">
        <QuestionSidebar
          questions={questions}
          answers={answers}
          unsyncedAnswers={unsyncedAnswers}
          activeQuestionIndex={activeQuestionIndex}
          onNavigate={handleNavigateQuestion}
          onSubmitClick={async () => { await forceImmediateSync(); setShowSubmitModal(true); }}
          onBackToExams={handleBackToExams}
        />

        <main className="exam-main-panel">
          <QuestionCard
            question={currentQuestion}
            questionIndex={activeQuestionIndex}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion?._id]}
            onSelectOption={handleSelectOption}
            onClearSelection={handleClearSelection}
            onPrev={() => handleNavigateQuestion(activeQuestionIndex - 1)}
            onNext={() => handleNavigateQuestion(activeQuestionIndex + 1)}
          />
        </main>
      </div>

      {showSubmitModal && (
        <SubmitModal
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          onConfirm={handleManualSubmit}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}

export default TestArea;