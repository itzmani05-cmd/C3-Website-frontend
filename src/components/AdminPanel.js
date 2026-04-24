import React, { useState } from 'react';
import AddQuestion from './AddQuestion';
import AIGenerator from './AIGenerator';

function AdminPanel({ onLogout }) {
  const [activeTab, setActiveTab] = useState('add');

  const renderContent = () => {
    switch (activeTab) {
      case 'add':
        return <AddQuestion />;
      case 'ai':
        return <AIGenerator />;
      default:
        return <AddQuestion />;
    }
  };

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo" >
            <img style={{width: '40px', height: '40px', marginBottom: '10px'}} src="/C3AppLogo.png" alt="C³ Logo" className="logo-image" />
          </div>
          <h2>Admin Portal</h2>
          <p className="sidebar-subtitle">Question Management System</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            <span className="nav-icon">+</span>
            Add Question
          </button>
          <button
            className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <span className="nav-icon">Ex</span>
            Extractor
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
        <header className="main-header">
          <div className="header-title">
            <h1>Dashboard</h1>
            <p className="header-subtitle">Manage and organize your question bank</p>
          </div>
          <div className="header-meta">
            <span className="institute-badge">C³ Institute</span>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

export default AdminPanel;
