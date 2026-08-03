import React, { useState, useEffect } from 'react';
import { EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../api';
import { useModal } from '../components/ModalProvider';

function ManageTests() {
  const { showConfirm } = useModal();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPublish, setNewPublish] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPublish, setEditPublish] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/questions/tests');
      setTests(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setNewName('');
    setNewPublish(false);
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.post('/api/questions/tests', {
        name: newName.trim(),
        publishToStudent: newPublish,
      });
      showSuccess('Test added successfully.');
      resetAddForm();
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding test.');
    }
  };

  const startEdit = (test) => {
    setEditingId(test._id);
    setEditName(test.name);
    setEditPublish(!!test.publishToStudent);
  };

  const handleEditTest = async (testId) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/tests/${testId}`, {
        name: editName.trim(),
        publishToStudent: editPublish,
      });
      showSuccess('Test updated successfully.');
      setEditingId(null);
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating test.');
    }
  };

  const handleDeleteTest = async (testId, testName) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the Test: "${testName}"?\n\nThis will permanently delete ALL exam questions and student attempts belonging to this test.`,
      { title: 'Delete Test', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/tests/${testId}`);
      showSuccess('Test deleted successfully.');
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting test.');
    }
  };

  return (
    <div className="tab-content curriculum-management">
      <div className="main-header" style={{ padding: '0 0 20px 0', position: 'static', background: 'transparent', borderBottom: 'none' }}>
        <div className="header-title">
          <h1>Manage Tests</h1>
          <p className="header-subtitle">Add, Edit, and Delete exam tests shown to students</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsAdding(true)}
        >
          + Add Test
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && (
        <div className="error-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <CloseOutlined style={{ fontSize: 12 }} />
          </button>
        </div>
      )}

      {isAdding && (
        <div className="adding-form-card" style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3>Add New Test</h3>
          <form onSubmit={handleAddTest} style={{ marginTop: '12px' }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Test Name</label>
                <input
                  type="text"
                  placeholder="Enter test name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)'
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={newPublish}
                    onChange={(e) => setNewPublish(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Publish to students
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={resetAddForm} style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                Add Test
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading tests...</div>}

      {!loading && tests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '12px' }}>
          No tests found. Add your first test to get started!
        </div>
      )}

      <div className="curriculum-tree" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tests.map((test) => {
          const isEditing = editingId === test._id;

          return (
            <div key={test._id} className="unit-card" style={{
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px 20px',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--primary)',
                      fontSize: '15px',
                      flex: 1,
                      minWidth: '180px'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={editPublish}
                      onChange={(e) => setEditPublish(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Publish
                  </label>
                  <button className="btn-primary" onClick={() => handleEditTest(test._id)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    Save
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                      {test.name}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      background: test.publishToStudent ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)',
                      color: test.publishToStudent ? '#16a34a' : 'var(--muted)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {test.publishToStudent ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => startEdit(test)}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <EditOutlined />
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteTest(test._id, test.name)}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ManageTests;
