import React from 'react';
import { LogoutOutlined, CheckCircleOutlined, FormOutlined, RightOutlined } from '@ant-design/icons';
import './exam.css';

function TestSelectionPage({ availableTests, studentEmail, onStartExam, onLogout }) {
  return (
    <div className="exam-selection-portal">

      <header className="selection-header">
        <div className="selection-logo-container">
          <img src="/C3AppLogo.png" alt="C³" style={{ height:30, objectFit:'contain' }} />
          <h2 className="selection-title">C³ Assessment</h2>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogoutOutlined /> Sign Out
        </button>
      </header>

      <main className="selection-main">
        <div className="selection-welcome">
          <h1>Active Assessments</h1>
          <p>Welcome, {studentEmail}. Please select a test to begin your examination.</p>
        </div>

        {availableTests.length > 0 ? (
          <div className="tests-grid">
            {availableTests.map((test) => (
              <div key={test._id} className="test-card">
                <div>
                  {test.submitted ? (
                    <span className="test-badge completed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircleOutlined /> Completed</span>
                  ) : (
                    <span className="test-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FormOutlined /> Exam</span>
                  )}
                  <h3 className="test-name">{test.name}</h3>
                  <p className="test-desc">
                    {test.submitted ? (
                      <span className="attempt-score-lbl">
                        You scored <strong>{test.percentage}%</strong> ({test.score}/{test.totalQuestions} correct). 
                        You can review your detailed scorecard and explanation keys.
                      </span>
                    ) : (<></>)}
                  </p>
                </div>
                <button
                  className={`start-btn ${test.submitted ? 'view-result-btn' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => onStartExam(test._id, test.name)}
                >
                  {test.submitted ? 'View Result' : 'Start Assessment'} <RightOutlined style={{ fontSize: 11 }} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tests">
            <h3>No Exams Configured</h3>
            <p>There are currently no active tests as of now. Please check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default TestSelectionPage;
