import React, { useState, useEffect } from 'react';
import { EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../api';
import { useModal } from '../components/ModalProvider';

const getApiConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

function ManageStudents() {
  const { showConfirm } = useModal();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/auth/admin/students', getApiConfig());
      setStudents(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch students.');
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
    setNewEmail('');
    setNewPassword('');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    try {
      await api.post('/api/auth/admin/students', {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
      }, getApiConfig());
      showSuccess('Student added successfully.');
      resetAddForm();
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding student.');
    }
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setEditName(student.name || '');
    setEditEmail(student.email);
    setEditStatus(student.status || 'active');
  };

  const handleEditStudent = async (studentId) => {
    if (!editName.trim() || !editEmail.trim()) return;
    try {
      await api.put(`/api/auth/admin/students/${studentId}`, {
        name: editName.trim(),
        email: editEmail.trim(),
        status: editStatus,
      }, getApiConfig());
      showSuccess('Student updated successfully.');
      setEditingId(null);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating student.');
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const confirmDelete = await showConfirm(
      `Are you sure you want to delete the student "${studentName}"?\n\nThis will remove their login access. Their exam results will not be deleted.`,
      { title: 'Delete Student', confirmText: 'Delete', variant: 'error' }
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/auth/admin/students/${studentId}`, getApiConfig());
      showSuccess('Student deleted successfully.');
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting student.');
    }
  };

  return (
    <div className="tab-content curriculum-management">
      <div className="main-header" style={{ padding: '0 0 20px 0', position: 'static', background: 'transparent', borderBottom: 'none' }}>
        <div className="header-title">
          <h1>Manage Students</h1>
          <p className="header-subtitle">Add, Edit, and Delete student accounts</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsAdding(true)}
        >
          + Add Student
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
          <h3>Add New Student</h3>
          <form onSubmit={handleAddStudent} style={{ marginTop: '12px' }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter student name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter student email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Set initial password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={resetAddForm} style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                Add Student
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading students...</div>}

      {!loading && students.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '12px' }}>
          No students found. Add your first student to get started!
        </div>
      )}

      <div className="curriculum-tree" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {students.map((student) => {
          const isEditing = editingId === student._id;

          return (
            <div key={student._id} className="unit-card" style={{
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px 20px',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '15px', flex: 1, minWidth: '160px' }}
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '15px', flex: 1, minWidth: '200px' }}
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '13px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button className="btn-primary" onClick={() => handleEditStudent(student._id)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    Save
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                      {student.name || 'Unnamed Student'}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{student.email}</span>
                    <span style={{
                      fontSize: '11px',
                      background: student.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: student.status === 'active' ? '#16a34a' : '#ef4444',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {student.status || 'active'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => startEdit(student)}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <EditOutlined />
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteStudent(student._id, student.name || student.email)}
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

export default ManageStudents;
