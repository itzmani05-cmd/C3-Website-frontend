import React from 'react';
import { WifiOutlined, SyncOutlined, CheckCircleOutlined, ClockCircleOutlined, FormOutlined } from '@ant-design/icons';

function ExamHeader({ selectedTestName, studentEmail, online, syncing, unsyncedAnswers, remainingTime, formatTime }) {
  const isTimeCritical = remainingTime < 600;

  const syncClass = !online ? 'offline' : syncing ? 'saving' : 'online';
  const syncLabel = !online
    ? 'Offline'
    : syncing
      ? 'Saving changes...'
      : Object.keys(unsyncedAnswers).length > 0
        ? 'Syncing...'
        : 'Saved to cloud';

  const getSyncIcon = () => {
    if (!online) return <WifiOutlined />;
    if (syncing || Object.keys(unsyncedAnswers).length > 0) return <SyncOutlined spin />;
    return <CheckCircleOutlined />;
  };

  return (
    <header className="exam-header">
      <div className="header-left">
        <FormOutlined style={{ fontSize: 22, color: '#4f46e5' }} />
        <div>
          <h1 className="exam-title">{selectedTestName} Portal</h1>
          <span className="student-badge">{studentEmail}</span>
        </div>
      </div>

      <div className="header-right">
        <div className={`sync-badge ${syncClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {getSyncIcon()}
          <span>{syncLabel}</span>
        </div>

        <div className={`timer-card ${isTimeCritical ? 'critical' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined />
          <span>{formatTime(remainingTime)}</span>
        </div>
      </div>
    </header>
  );
}

export default ExamHeader;
