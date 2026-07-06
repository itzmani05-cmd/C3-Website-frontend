import React, { useState } from 'react';
import { BulbOutlined, DownloadOutlined, ToolOutlined, TagsOutlined, FileDoneOutlined, LogoutOutlined, CrownOutlined } from '@ant-design/icons';
import AIGenerator from './AIGenerator';
import PdfDownload from './PdfDownload';
import QuestionFix from './QuestionFix';
import UnitswiseName from './UnitswiseName';
import AdminResults from './AdminResults';

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
      case 'unitswise':
        return <UnitswiseName />;
      case 'results':
        return <AdminResults />;
      default:
        return <AIGenerator />;
    }
  };

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CrownOutlined style={{ fontSize: 24, color: '#fbbf24' }} />
          </div>
          <h2>Admin Portal</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <BulbOutlined className="nav-icon" />
            Extractor
          </button>

          <button
            className={`nav-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            <DownloadOutlined className="nav-icon" />
            PDF Download
          </button>

          <button
            className={`nav-btn ${activeTab === 'fix' ? 'active' : ''}`}
            onClick={() => setActiveTab('fix')}
          >
            <ToolOutlined className="nav-icon" />
            Question Fix
          </button>

          <button
            className={`nav-btn ${activeTab === 'unitswise' ? 'active' : ''}`}
            onClick={() => setActiveTab('unitswise')}
          >
            <TagsOutlined className="nav-icon" />
            Unitswise Name
          </button>

          <button
            className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <FileDoneOutlined className="nav-icon" />
            Results
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar"><CrownOutlined style={{ fontSize: 13 }} /></div>
            <div className="user-details">
              <span className="user-name">Administrator</span>
              <span className="user-role">System Admin</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogoutOutlined className="nav-icon" />
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
