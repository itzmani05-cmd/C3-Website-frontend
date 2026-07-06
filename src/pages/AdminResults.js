import React, { useState, useEffect } from 'react';
import { SearchOutlined, ReloadOutlined, EyeOutlined, DeleteOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../api';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Modal detail state
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailData, setDetailData] = useState(null); // { studentExam, questions }

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/exam/admin/results', getApiConfig());
      setResults(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exam results.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, studentEmail, testName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the attempt for student "${studentEmail}" on test "${testName}"?\nThis will completely erase their progress and scores, allowing them to take the exam again.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/exam/admin/results/${id}`, getApiConfig());
      setResults(prev => prev.filter(r => r._id !== id));
      if (selectedResult === id) {
        setSelectedResult(null);
        setDetailData(null);
      }
      alert('Student attempt cleared successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear attempt. Please try again.');
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

  // Filter & Search
  const filteredResults = results.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.studentEmail?.toLowerCase().includes(searchLower) ||
      r.testName?.toLowerCase().includes(searchLower)
    );
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

  return (
    <div className="admin-results-container">
      <div className="admin-results-header">
        <h1>Student Assessment Results</h1>
        <p className="subtitle">Track and review student performances across all exams.</p>
      </div>

      {/* Control Panel: Search & Sorting */}
      <div className="admin-results-controls">
        <div className="search-group">
          <span className="search-icon"><SearchOutlined /></span>
          <input
            type="text"
            placeholder="Search by student email or test name..."
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
          <button className="refresh-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={fetchResults} title="Refresh Results">
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
          <button onClick={fetchResults} className="retry-btn">Retry Connection</button>
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="results-empty-state">
          <p>No test submissions found.</p>
        </div>
      ) : (
        <div className="results-table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Student Email</th>
                <th>Test Name</th>
                <th>Raw Score</th>
                <th>Percentage</th>
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
                    <td className="student-email-cell">
                      <strong>{result.studentEmail}</strong>
                    </td>
                    <td>{result.testName}</td>
                    <td className="score-cell">
                      {result.score} / {result.totalQuestions}
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
                    Student: <strong>{detailData.studentExam?.studentEmail}</strong> | Test: <strong>{detailData.studentExam?.testName}</strong>
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
