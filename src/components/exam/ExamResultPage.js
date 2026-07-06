import React from 'react';
import { TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, CalendarOutlined, ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import QuestionRenderer from '../QuestionRenderer';

function ExamResultPage({ selectedTestName, studentEmail, questions, answers, submittedAt, onBackToExams }) {
  const totalQuestions = questions.length;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const qId = q._id.toString();
    const studentAns = answers[qId];
    if (!studentAns) {
      unansweredCount++;
    } else if (studentAns.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase()) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : '0.00';

  return (
    <div className="exam-success-container review-mode">
      <div className="success-card wide-card">
        <div className="result-banner">
          <div className="banner-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrophyOutlined /> Assessment Completed</div>
          <h2 style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <TrophyOutlined style={{ color: '#facc15' }} /> {selectedTestName}
          </h2>
          <p className="student-email-lbl">{studentEmail}</p>
          
          <div className="score-radial-container">
            <div className="score-percentage-large">{percentage}%</div>
            <div className="score-fraction-large">{correctCount} / {totalQuestions} Correct</div>
          </div>
        </div>

        <div className="result-body-content">
          <div className="stats-dashboard-row">
            <div className="stat-pill correct">
              <CheckCircleOutlined />
              <span className="pill-lbl">Correct: <strong>{correctCount}</strong></span>
            </div>
            <div className="stat-pill wrong">
              <CloseCircleOutlined />
              <span className="pill-lbl">Incorrect: <strong>{wrongCount}</strong></span>
            </div>
            <div className="stat-pill unanswered">
              <ExclamationCircleOutlined />
              <span className="pill-lbl">Unanswered: <strong>{unansweredCount}</strong></span>
            </div>
            <div className="stat-pill time">
              <CalendarOutlined />
              <span className="pill-lbl">Submitted: <strong>{submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString()}</strong></span>
            </div>
          </div>

          <div className="action-button-container">
            <button className="return-btn" onClick={onBackToExams}>
              <ArrowLeftOutlined /> Return to Exams List
            </button>
          </div>

          {/* Detailed Question Review */}
          {questions && questions.length > 0 && (
            <div className="review-section">
              <h3 className="review-title">Detailed Question Review</h3>
              <div className="questions-review-list">
                {questions.map((q, idx) => {
                  const qId = q._id.toString();
                  const studentAns = answers[qId];
                  const isCorrect = studentAns && studentAns.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();
                  const statusClass = !studentAns ? 'unanswered' : isCorrect ? 'correct' : 'incorrect';
                  const statusLabel = !studentAns ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect';

                  return (
                    <div key={qId} className={`question-review-card ${statusClass}`}>
                      <div className="review-card-header">
                        <span className="question-number">Question {idx + 1} of {totalQuestions}</span>
                        <span className={`status-badge ${statusClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isCorrect ? <CheckCircleOutlined /> : studentAns ? <CloseCircleOutlined /> : <ExclamationCircleOutlined />}
                          {statusLabel}
                        </span>
                      </div>

                      <div className="review-question-text">
                        <QuestionRenderer question={q} />
                        {q.questionImage && (
                          <div className="review-image-container">
                            <img src={q.questionImage} alt={`Question ${idx + 1}`} className="review-media" />
                          </div>
                        )}
                      </div>

                      <div className="review-options-list">
                        {Object.entries(q.options || {}).map(([key, optText]) => {
                          const optImg = q.optionImages?.[key];
                          if (!optText && !optImg) return null;

                          const normKey = key.toLowerCase().trim();
                          const isThisCorrect = q.correct_answer && normKey === q.correct_answer.toLowerCase().trim();
                          const isThisStudentChoice = studentAns && normKey === studentAns.toLowerCase().trim();

                          let optionClass = '';
                          let checkmark = '';

                          if (isThisCorrect && isThisStudentChoice) {
                            optionClass = 'correct-option';
                            checkmark = <span><CheckCircleOutlined style={{ marginRight: 4 }} /> Your Choice & Correct</span>;
                          } else if (isThisCorrect) {
                            optionClass = 'correct-option';
                            checkmark = <span><CheckCircleOutlined style={{ marginRight: 4 }} /> Correct Answer</span>;
                          } else if (isThisStudentChoice) {
                            optionClass = 'wrong-option';
                            checkmark = <span><CloseCircleOutlined style={{ marginRight: 4 }} /> Your Choice</span>;
                          }

                          return (
                            <div key={key} className={`option-review-row ${optionClass}`}>
                              <div className="option-marker">{key.toUpperCase()}</div>
                              <div className="option-content">
                                {optText && <p className="option-text">{optText}</p>}
                                {optImg && (
                                  <div className="review-option-image-container">
                                    <img src={optImg} alt={`Option ${key.toUpperCase()}`} className="review-media-small" />
                                  </div>
                                )}
                              </div>
                              {checkmark && <span className={`choice-indicator ${optionClass}`}>{checkmark}</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dedicated Answer Summary Bar */}
                      <div className="review-answer-summary-bar">
                        <div className="summary-pill">
                          Your Answer: <strong className={isCorrect ? 'text-correct' : studentAns ? 'text-wrong' : 'text-unanswered'}>
                            {studentAns ? studentAns.toUpperCase() : 'Unanswered'}
                          </strong>
                        </div>
                        <div className="summary-pill">
                          Correct Answer: <strong className="text-correct">{q.correct_answer ? q.correct_answer.toUpperCase() : 'N/A'}</strong>
                        </div>
                        <div className={`summary-status-pill ${statusClass}`}>
                          {isCorrect ? '✓ +1 Mark' : '✗ 0 Marks'}
                        </div>
                      </div>

                      {(q.explanation || q.explanationImage) && (
                        <div className="explanation-box">
                          <h4 className="explanation-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <InfoCircleOutlined /> Explanation:
                          </h4>
                          {q.explanation && <p className="explanation-text">{q.explanation}</p>}
                          {q.explanationImage && (
                            <div className="review-image-container">
                              <img src={q.explanationImage} alt="Explanation Media" className="review-media" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamResultPage;
