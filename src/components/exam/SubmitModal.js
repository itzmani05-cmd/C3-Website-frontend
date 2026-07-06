import React from 'react';
import { QuestionCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

function SubmitModal({ answeredCount, unansweredCount, onConfirm, onCancel }) {
  return (
    <div className="exam-overlay-container">
      <div className="overlay-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <QuestionCircleOutlined style={{ fontSize: 44, color: '#faad14', marginBottom: 16 }} />
        <h2 style={{ margin: '0 0 10px 0' }}>Submit Your Exam?</h2>
        <p style={{ margin: '0 0 20px 0' }}>
          You are about to submit your exam. Once submitted, you will not be
          able to change or review any answers.
        </p>

        <div className="modal-stats" style={{ width: '100%' }}>
          <div className="modal-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircleOutlined style={{ color: '#10b981' }} /> Answered</span>
            <strong>{answeredCount}</strong>
          </div>
          <div className="modal-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CloseCircleOutlined style={{ color: '#64748b' }} /> Unanswered</span>
            <strong>{unansweredCount}</strong>
          </div>
        </div>

        <div className="button-group" style={{ width: '100%' }}>
          <button className="confirm-submit-btn" onClick={onConfirm}>
            Yes, Submit Exam
          </button>
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitModal;
