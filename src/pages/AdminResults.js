import React, { useState, useEffect } from 'react';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  TeamOutlined,
  RightOutlined
} from '@ant-design/icons';
import api from '../api';
import { useModal } from '../components/ModalProvider';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const PASS_PERCENTAGE = 35;
const MARKS_PER_QUESTION = 1.5;

const formatMarks = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

function AdminResults() {
  const { showConfirm, showAlert } = useModal();

  // Master view: list of tests conducted
  const [testsSummary, setTestsSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // Detail view: a single test's student results
  const [selectedTest, setSelectedTest] = useState(null); // { testId, testName }
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  // Per-student detail modal state
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailData, setDetailData] = useState(null); // { studentExam, questions }

  useEffect(() => {
    fetchTestsSummary();
  }, []);

  const fetchTestsSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const response = await api.get('/api/exam/admin/tests-summary', getApiConfig());
      setTestsSummary(response.data || []);
    } catch (err) {
      console.error(err);
      setSummaryError('Failed to fetch conducted tests.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchResultsForTest = async (test) => {
    setLoading(true);
    setError('');
    try {
      const params = test.testId ? { testId: test.testId } : { testName: test.testName };
      const response = await api.get('/api/exam/admin/results', { ...getApiConfig(), params });
      setResults(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exam results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTest = (test) => {
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

  const handleDelete = async (id, studentEmail, testName) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the attempt for student "${studentEmail}" on test "${testName}"?\nThis will completely erase their progress and scores, allowing them to take the exam again.`,
      { title: 'Delete Attempt', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/exam/admin/results/${id}`, getApiConfig());
      setResults(prev => prev.filter(r => r._id !== id));
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

  const handleViewDetails = async (id) => {
    setSelectedResult(id);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
    try {
      const response = await api.get(`/api/exam/admin/results/${id}`, getApiConfig());
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

  // Filter & Search (detail view, within the selected test)
  const filteredResults = results.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    return r.studentEmail?.toLowerCase().includes(searchLower)
      || r.studentName?.toLowerCase().includes(searchLower);
  });

  // Sorting
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'date-desc') {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === 'date-asc') {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === 'score-desc') {
      return (b.score || 0) - (a.score || 0);
    }
    if (sortBy === 'score-asc') {
      return (a.score || 0) - (b.score || 0);
    }
    if (sortBy === 'pct-desc') {
      return (b.percentage || 0) - (a.percentage || 0);
    }
    if (sortBy === 'pct-asc') {
      return (a.percentage || 0) - (b.percentage || 0);
    }
    return 0;
  });

  // ─── Master View: list of conducted tests ────────────────────────────────
  if (!selectedTest) {
    return (
      <div className="admin-results-container">
        <div className="admin-results-header">
          <h1>Student Assessment Results</h1>
          <p className="subtitle">Select a test to review student performance for that assessment.</p>
        </div>

        <div className="admin-results-controls">
          <div className="search-group" style={{ maxWidth: '100%' }}>
            <span className="search-icon"><FileTextOutlined /></span>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {testsSummary.length} test{testsSummary.length === 1 ? '' : 's'} conducted
            </span>
          </div>
          <button className="refresh-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={fetchTestsSummary} title="Refresh">
            <ReloadOutlined /> Refresh
          </button>
        </div>

        {summaryLoading ? (
          <div className="results-loading-state">
            <div className="loader"></div>
            <p>Fetching conducted tests...</p>
          </div>
        ) : summaryError ? (
          <div className="results-error-state">
            <p className="error-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CloseCircleOutlined style={{ color: '#ef4444' }} /> {summaryError}
            </p>
            <button onClick={fetchTestsSummary} className="retry-btn">Retry Connection</button>
          </div>
        ) : testsSummary.length === 0 ? (
          <div className="results-empty-state">
            <FileTextOutlined style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px' }} />
            <p>No tests have been conducted yet.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Results will appear here once students start submitting exams.</p>
          </div>
        ) : (
          <div className="tests-summary-grid">
            {testsSummary.map((test) => {
              const pct = test.averagePercentage || 0;
              let pctClass = 'pct-badge info';
              if (pct >= 80) pctClass = 'pct-badge success';
              else if (pct >= 50) pctClass = 'pct-badge warning';
              else pctClass = 'pct-badge danger';

              return (
                <div
                  key={test.testId || test.testName}
                  className="test-summary-card"
                  onClick={() => handleSelectTest(test)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSelectTest(test); }}
                >
                  <div className="test-summary-card-header">
                    <h3>{test.testName}</h3>
                    <RightOutlined style={{ color: '#94a3b8' }} />
                  </div>
                  <p className="test-summary-date">
                    Last submission: {test.lastSubmittedAt ? new Date(test.lastSubmittedAt).toLocaleString() : 'N/A'}
                  </p>
                  <div className="test-summary-card-stats">
                    <div className="test-summary-stat">
                      <TeamOutlined />
                      <span><strong>{test.studentsAttempted}</strong> Attempted</span>
                    </div>
                    <span className={pctClass}>Avg {pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Detail View: students who attempted the selected test ───────────────
  return (
    <div className="admin-results-container">
      <div className="results-breadcrumb">
        <button className="back-btn" onClick={handleBackToList}>
          <ArrowLeftOutlined /> Back to Tests
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{selectedTest.testName}</span>
      </div>

      <div className="admin-results-header">
        <h1>{selectedTest.testName}</h1>
        <p className="subtitle">Track and review student performances for this test.</p>
      </div>

      {/* Control Panel: Search & Sorting */}
      <div className="admin-results-controls">
        <div className="search-group">
          <span className="search-icon"><SearchOutlined /></span>
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sort-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-desc">Submitted: Newest First</option>
            <option value="date-asc">Submitted: Oldest First</option>
            <option value="score-desc">Score: Highest First</option>
            <option value="score-asc">Score: Lowest First</option>
            <option value="pct-desc">Percentage: Highest First</option>
            <option value="pct-asc">Percentage: Lowest First</option>
          </select>
          <button className="refresh-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => fetchResultsForTest(selectedTest)} title="Refresh Results">
            <ReloadOutlined /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="results-loading-state">
          <div className="loader"></div>
          <p>Fetching assessment results...</p>
        </div>
      ) : error ? (
        <div className="results-error-state">
          <p className="error-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CloseCircleOutlined style={{ color: '#ef4444' }} /> {error}
          </p>
          <button onClick={() => fetchResultsForTest(selectedTest)} className="retry-btn">Retry Connection</button>
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="results-empty-state">
          <p>No students have attempted this test yet.</p>
        </div>
      ) : (
        <div className="results-table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Student Name</th>
               
                <th>Raw Score(200)</th>
                <th>Marks(300)</th>
                <th>Percentage(100)</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => {
                const pct = result.percentage !== undefined ? result.percentage : 0;
                let pctClass = 'pct-badge info';
                if (pct >= 80) pctClass = 'pct-badge success';
                else if (pct >= 50) pctClass = 'pct-badge warning';
                else pctClass = 'pct-badge danger';

                return (
                  <tr key={result._id}>
                    <td className="student-name-cell">
                      <strong>{result.studentName || '—'}</strong>
                    </td>
                   
                    <td className="score-cell">
                      {result.score}
                    </td>
                    <td className="score-cell">
                      {formatMarks((result.score || 0) * MARKS_PER_QUESTION)}
                    </td>
                    <td>
                      <span className={pctClass}>{pct}%</span>
                    </td>
                    
                    <td>{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn view-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleViewDetails(result._id)}
                        title="View Details"
                      >
                        <EyeOutlined /> View Attempt
                      </button>
                      <button
                        className="action-btn delete-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDelete(result._id, result.studentEmail, result.testName)}
                        title="Allow Retake"
                      >
                        <DeleteOutlined /> Allow Retake
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal Overlay */}
      {selectedResult && (
        <div className="admin-results-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-results-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Attempt Review</h2>
                {detailData && (
                  <p className="student-info">
                    Student: <strong>{detailData.studentExam?.studentName || detailData.studentExam?.studentEmail}</strong>
                    {detailData.studentExam?.studentName && (
                      <> ({detailData.studentExam?.studentEmail})</>
                    )} | Test: <strong>{detailData.studentExam?.testName}</strong>
                  </p>
                )}
              </div>
              <button className="close-modal-btn" onClick={handleCloseModal} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloseOutlined />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading ? (
                <div className="results-loading-state">
                  <div className="loader"></div>
                  <p>Loading response sheets and answer keys...</p>
                </div>
              ) : detailError ? (
                <p className="error-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CloseCircleOutlined style={{ color: '#ef4444' }} /> {detailError}
                </p>
              ) : !detailData ? (
                <p>No detail data retrieved.</p>
              ) : (
                <div className="modal-detail-scroll">
                  {/* Quick stats row */}
                  <div className="modal-stats-dashboard">
                    <div className="m-stat-box score">
                      <span>Overall Score</span>
                      <strong>
                        {detailData.studentExam?.score} / {detailData.studentExam?.totalQuestions}
                      </strong>
                    </div>
                    <div className="m-stat-box score">
                      <span>Marks</span>
                      <strong>
                        {formatMarks((detailData.studentExam?.score || 0) * MARKS_PER_QUESTION)} / {formatMarks((detailData.studentExam?.totalQuestions || 0) * MARKS_PER_QUESTION)}
                      </strong>
                    </div>
                    <div className="m-stat-box pct">
                      <span>Percentage</span>
                      <strong>{detailData.studentExam?.percentage}%</strong>
                    </div>
                    <div className="m-stat-box green">
                      <span>Correct</span>
                      <strong>{detailData.studentExam?.correctCount}</strong>
                    </div>
                    <div className="m-stat-box red">
                      <span>Incorrect</span>
                      <strong>{detailData.studentExam?.wrongCount}</strong>
                    </div>
                    <div className="m-stat-box gray">
                      <span>Unanswered</span>
                      <strong>{detailData.studentExam?.unansweredCount}</strong>
                    </div>
                  </div>

                  {/* Submission Timestamp */}
                  <p className="submission-time">
                    Submitted at: <strong>{detailData.studentExam?.submittedAt ? new Date(detailData.studentExam.submittedAt).toLocaleString() : 'N/A'}</strong>
                  </p>

                  {/* Detailed question by question */}
                  <div className="modal-questions-review">
                    <h3>Response Breakdown</h3>
                    <div className="m-questions-list">
                      {detailData.questions?.map((q, idx) => {
                        if (!q || !q._id) return null;
                        const qId = q._id.toString();
                        const rawAns = detailData.studentExam?.answers?.[qId] || detailData.studentExam?.answers?.get?.(qId);
                        const studentAns = typeof rawAns === 'string' ? rawAns : '';
                        const correctAnswer = typeof q.correct_answer === 'string' ? q.correct_answer : '';
                        const isCorrect = studentAns && correctAnswer && studentAns.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                        const statusClass = !studentAns ? 'unanswered' : isCorrect ? 'correct' : 'incorrect';
                        const statusLabel = !studentAns ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect';

                        return (
                          <div key={qId} className={`m-question-card ${statusClass}`}>
                            <div className="card-top-header">
                              <span className="q-index">Question {idx + 1} of {detailData.questions.length}</span>
                              <span className={`q-status-badge ${statusClass}`}>{statusLabel}</span>
                            </div>

                            <div className="q-body">
                              <p className="q-text">{q.question}</p>
                              {q.questionImage && (
                                <div className="q-image-container">
                                  <img src={q.questionImage} alt={`Question ${idx + 1}`} className="q-media-img" />
                                </div>
                              )}
                            </div>

                            <div className="q-options-container">
                              {['a', 'b', 'c', 'd'].map((key) => {
                                const optText = q.options?.[key];
                                const optImg = q.optionImages?.[key];
                                if (!optText && !optImg) return null;

                                const isThisCorrect = correctAnswer && key.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                                const isThisStudentChoice = studentAns && key.toLowerCase().trim() === studentAns.toLowerCase().trim();

                                let optRowClass = '';
                                let checkmarkLabel = null;

                                if (isThisCorrect && isThisStudentChoice) {
                                  optRowClass = 'correct-opt';
                                  checkmarkLabel = <span><CheckCircleOutlined style={{ marginRight: 4 }} /> Student Choice & Correct</span>;
                                } else if (isThisCorrect) {
                                  optRowClass = 'correct-opt';
                                  checkmarkLabel = <span><CheckCircleOutlined style={{ marginRight: 4 }} /> Correct Answer</span>;
                                } else if (isThisStudentChoice) {
                                  optRowClass = 'wrong-opt';
                                  checkmarkLabel = <span><CloseCircleOutlined style={{ marginRight: 4 }} /> Student Choice</span>;
                                }

                                return (
                                  <div key={key} className={`m-option-row ${optRowClass}`}>
                                    <div className="opt-letter">{key.toUpperCase()}</div>
                                    <div className="opt-text-container">
                                      {optText && <p className="opt-desc">{optText}</p>}
                                      {optImg && (
                                        <div className="opt-img-container">
                                          <img src={optImg} alt={`Option ${key.toUpperCase()}`} className="opt-media-img-small" />
                                        </div>
                                      )}
                                    </div>
                                    {checkmarkLabel && <span className={`opt-tag ${optRowClass}`}>{checkmarkLabel}</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {(q.explanation || q.explanationImage) && (
                              <div className="q-explanation-box">
                                <h5>Explanation:</h5>
                                {q.explanation && <p className="q-expl-text">{q.explanation}</p>}
                                {q.explanationImage && (
                                  <div className="q-image-container">
                                    <img src={q.explanationImage} alt="Explanation Graphics" className="q-media-img" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModal}>Close Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminResults;
