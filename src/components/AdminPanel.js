import React, { useState } from 'react';
import AIGenerator from './AIGenerator';
import PdfDownload from './PdfDownload';
import QuestionFix from './QuestionFix';

function AdminPanel({ onLogout }) {
  const [activeTab, setActiveTab] = useState('ai');

  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AIGenerator />;
      case 'pdf':
        return <PdfDownload />;
      case 'fix':
        return <QuestionFix />;
      default:
        return <AIGenerator />;
    }
  };

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src="/C3AppLogo.png" alt="C³ Institute logo" className="logo-image" />
          </div>
          <h2>Admin Portal</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <span className="nav-icon">Ex</span>
            Extractor
          </button>

          <button
            className={`nav-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            <span className="nav-icon">PDF</span>
            PDF Download
          </button>

          <button
            className={`nav-btn ${activeTab === 'fix' ? 'active' : ''}`}
            onClick={() => setActiveTab('fix')}
          >
            <span className="nav-icon">Fix</span>
            Question Fix
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">A</div>
            <div className="user-details">
              <span className="user-name">Administrator</span>
              <span className="user-role">System Admin</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <span className="nav-icon">→</span>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default AdminPanel;
