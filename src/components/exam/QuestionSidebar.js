import React from 'react';
import { CheckCircleOutlined, ExclamationCircleOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';

function QuestionSidebar({
  questions,
  answers,
  unsyncedAnswers,
  activeQuestionIndex,
  onNavigate,
  onSubmitClick,
  onBackToExams,
}) {
  const answeredCount   = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <aside className="exam-sidebar">
      <div className="sidebar-stats">
        <div className="stat-box answered">
          <span className="count">{answeredCount}</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircleOutlined style={{ fontSize: 11 }} /> Answered</label>
        </div>
        <div className="stat-box unanswered">
          <span className="count">{unansweredCount}</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExclamationCircleOutlined style={{ fontSize: 11 }} /> Remaining</label>
        </div>
      </div>
      <div className="grid-header">
        Question Map ({activeQuestionIndex + 1} of {questions.length})
      </div>

      <div className="question-grid-container">
        <div className="question-grid">
          {questions.map((q, idx) => {
            let btnClass = 'grid-btn';
            if (idx === activeQuestionIndex)       btnClass += ' active';
            if (answers[q._id]) {
              btnClass += unsyncedAnswers[q._id] !== undefined
                ? ' answered-unsynced'
                : ' answered-saved';
            }

            return (
              <button
                key={q._id}
                className={btnClass}
                onClick={() => onNavigate(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="submit-exam-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={onSubmitClick}>
          <SendOutlined /> Submit Exam
        </button>
        <button className="back-exams-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={onBackToExams}>
          <ArrowLeftOutlined /> Exit to Exams List
        </button>
      </div>
    </aside>
  );
}

export default QuestionSidebar;
