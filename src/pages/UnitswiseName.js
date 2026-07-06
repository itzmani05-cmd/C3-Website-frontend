import React, { useState, useEffect } from 'react';
import { EditOutlined, DeleteOutlined, DownOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../api';
function UnitswiseName() {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});

  const [editingId, setEditingId] = useState(null); 
  const [editingType, setEditingType] = useState(null);
  const [editName, setEditName] = useState('');

  const [addingType, setAddingType] = useState(null); 
  const [addingParentId, setAddingParentId] = useState(null); 
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState(0);

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const fetchCurriculum = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/questions/curriculum');
      setCurriculum(response.data);
      const initialExpandedUnits = {};
      response.data.forEach(unit => {
        initialExpandedUnits[unit._id] = true;
      });
      setExpandedUnits(prev => ({ ...initialExpandedUnits, ...prev }));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch curriculum data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const currentScroll = window.scrollY;

    try {
      await api.post('/api/questions/units', {
        name: newName.trim(),
        order: Number(newOrder),
      });

      showSuccess('Unit added successfully.');
      resetForm();

      await fetchCurriculum();

      requestAnimationFrame(() => {
        window.scrollTo({
          top: currentScroll,
          behavior: 'auto',
        });
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding unit.');
    }
  };

  const handleEditUnit = async (unitId) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/units/${unitId}`, {
        name: editName.trim(),
      });
      showSuccess('Unit updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating unit.');
    }
  };

  const handleDeleteUnit = async (unitId, unitName) => {
    const confirmDelete = window.confirm(
      `WARNING!\n\nAre you sure you want to delete the Unit: "${unitName}"?\n\nThis will permanently delete ALL topics, subtopics, and questions belonging to this Unit.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/units/${unitId}`);
      showSuccess('Unit deleted successfully.');
      fetchCurriculum();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting unit.');
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;

    const currentScroll = window.scrollY;

    try {
      await api.post('/api/questions/topics', {
        name: newName.trim(),
        unitId: addingParentId,
        order: Number(newOrder),
      });

      showSuccess('Topic added successfully.');
      resetForm();

      await fetchCurriculum();

      requestAnimationFrame(() => {
        window.scrollTo({
          top: currentScroll,
          behavior: 'auto',
        });
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding topic.');
    }
  };

  const handleEditTopic = async (topicId, unitId) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/topics/${topicId}`, {
        name: editName.trim(),
        unitId,
      });
      showSuccess('Topic updated successfully.');
      setEditingId(null);
      fetchCurriculum();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating topic.');
    }
  };

  const handleDeleteTopic = async (topicId, topicName) => {
    const confirmDelete = window.confirm(
      `WARNING!\n\nAre you sure you want to delete the Topic: "${topicName}"?\n\nThis will permanently delete ALL subtopics and questions belonging to this Topic.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/topics/${topicId}`);
      showSuccess('Topic deleted successfully.');
      fetchCurriculum();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting topic.');
    }
  };

  const handleAddSubtopic = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !addingParentId) return;

    const currentScroll = window.scrollY;

    try {
      await api.post('/api/questions/subtopics', {
        name: newName.trim(),
        topicId: addingParentId,
        order: Number(newOrder),
      });

      showSuccess('Subtopic added successfully.');
      resetForm();

      await fetchCurriculum();

      requestAnimationFrame(() => {
        window.scrollTo({
          top: currentScroll,
          behavior: 'auto',
        });
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding subtopic.');
    }
  };

  const handleEditSubtopic = async (subtopicId, topicId) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/api/questions/subtopics/${subtopicId}`, {
        name: editName.trim(),
        topicId,
      });
      showSuccess('Subtopic updated successfully.');
      setEditingId(null);
      fetchCurriculum();

       
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating subtopic.');
    }
  };

  const handleDeleteSubtopic = async (subtopicId, subtopicName) => {
    const confirmDelete = window.confirm(
      `WARNING!\n\nAre you sure you want to delete the Subtopic: "${subtopicName}"?\n\nThis will permanently delete ALL questions belonging to this Subtopic.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/questions/subtopics/${subtopicId}`);
      showSuccess('Subtopic deleted successfully.');
      fetchCurriculum();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting subtopic.');
    }
  };

  const resetForm = () => {
    setAddingType(null);
    setAddingParentId(null);
    setNewName('');
    setNewOrder(0);
  };

  const startEdit = (item, type) => {
    setEditingId(item._id);
    setEditingType(type);
    setEditName(item.name);
  };

  return (
    <div className="tab-content curriculum-management">
      <div className="main-header" style={{ padding: '0 0 20px 0', position: 'static', background: 'transparent', borderBottom: 'none' }}>
        <div className="header-title">
          <h1>Unitswise Name</h1>
          <p className="header-subtitle">Add, Edit, and Delete Units, Topics, and Subtopics</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setAddingType('unit');
            setNewOrder(curriculum.length + 1);
          }}
        >
          + Add Unit
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{error}</span>
        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      </div>}

      {/* Adding Form Block */}
      {addingType && (
        <div className="adding-form-card" style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3>
            {addingType === 'unit' && 'Add New Unit'}
            {addingType === 'topic' && 'Add New Topic'}
            {addingType === 'subtopic' && 'Add New Subtopic'}
          </h3>
          <form onSubmit={
            addingType === 'unit' ? handleAddUnit :
            addingType === 'topic' ? handleAddTopic :
            handleAddSubtopic
          } style={{ marginTop: '12px' }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Name</label>
                <input
                  type="text"
                  placeholder={`Enter ${addingType} name`}
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Sort Order</label>
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={resetForm} style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                Add {addingType.charAt(0).toUpperCase() + addingType.slice(1)}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading curriculum structure...</div>}

      {!loading && curriculum.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '12px' }}>
          No units found. Add your first unit to get started!
        </div>
      )}

      <div className="curriculum-tree" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {curriculum.map((unit) => {
          const isUnitExpanded = expandedUnits[unit._id];
          const isEditingUnit = editingId === unit._id && editingType === 'unit';

          return (
            <div key={unit._id} className="unit-card" style={{
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              background: 'var(--surface)'
            }}>
              <div className="unit-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--surface-2)',
                borderBottom: isUnitExpanded ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <button
                    onClick={() => toggleUnit(unit._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      width: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isUnitExpanded ? <DownOutlined /> : <RightOutlined />}
                  </button>

                  {isEditingUnit ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--primary)',
                          fontSize: '15px',
                          flex: 1
                        }}
                      />
                      <button className="btn-primary" onClick={() => handleEditUnit(unit._id)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                        Save
                      </button>
                      <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                        {unit.name}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        background: 'rgba(0,0,0,0.05)',
                        color: 'var(--muted)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {unit.topics?.length || 0} Topics
                      </span>
                    </div>
                  )}
                </div>

                {!isEditingUnit && (
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => startEdit(unit, 'unit')}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <EditOutlined />
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setAddingType('topic');
                        setAddingParentId(unit._id);
                        setNewOrder((unit.topics?.length || 0) + 1);
                      }}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
                    >
                      + Add Topic
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteUnit(unit._id, unit.name)}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isUnitExpanded && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafbfc' }}>
                  {(!unit.topics || unit.topics.length === 0) && (
                    <div style={{ padding: '16px', color: 'var(--muted)', fontStyle: 'italic', fontSize: '14px', textAlign: 'center' }}>
                      No topics in this unit yet.
                    </div>
                  )}

                  {unit.topics && unit.topics.map((topic) => {
                    const isTopicExpanded = expandedTopics[topic._id];
                    const isEditingTopic = editingId === topic._id && editingType === 'topic';

                    return (
                      <div key={topic._id} style={{
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: '12px',
                        background: 'var(--surface)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderBottom: isTopicExpanded ? '1px solid rgba(226, 232, 240, 0.8)' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <button
                              onClick={() => toggleTopic(topic._id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '14px',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                                width: '20px'
                              }}
                            >
                              {isTopicExpanded ? <DownOutlined /> : <RightOutlined />}
                            </button>

                            {isEditingTopic ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--primary)',
                                    fontSize: '14px',
                                    flex: 1
                                  }}
                                />
                                <button className="btn-primary" onClick={() => handleEditTopic(topic._id, unit._id)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                  Save
                                </button>
                                <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                                  {topic.name}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  background: 'rgba(0,0,0,0.04)',
                                  color: 'var(--muted)',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontWeight: '600'
                                }}>
                                  {topic.subtopics?.length || 0} Subtopics
                                </span>
                              </div>
                            )}
                          </div>

                          {!isEditingTopic && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => startEdit(topic, 'topic')}
                                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <EditOutlined />
                              </button>
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setAddingType('subtopic');
                                  setAddingParentId(topic._id);
                                  setNewOrder((topic.subtopics?.length || 0) + 1);
                                }}
                                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                              >
                                + Add Subtopic
                              </button>
                              <button
                                className="btn-danger"
                                onClick={() => handleDeleteTopic(topic._id, topic.name)}
                                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <DeleteOutlined />
                              </button>
                            </div>
                          )}
                        </div>

                        {isTopicExpanded && (
                          <div style={{
                            padding: '10px 16px 14px 42px',
                            background: '#fcfdfe',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            borderTop: '1px solid rgba(226, 232, 240, 0.5)'
                          }}>
                            {(!topic.subtopics || topic.subtopics.length === 0) && (
                              <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '13px', padding: '6px 0' }}>
                                No subtopics in this topic yet.
                              </div>
                            )}

                            {topic.subtopics && topic.subtopics.map((subtopic) => {
                              const isEditingSubtopic = editingId === subtopic._id && editingType === 'subtopic';

                              return (
                                <div key={subtopic._id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: 'var(--surface)',
                                  border: '1px solid rgba(226, 232, 240, 0.5)'
                                }}>
                                  {isEditingSubtopic ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                      <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          border: '1px solid var(--primary)',
                                          fontSize: '13px',
                                          flex: 1
                                        }}
                                      />
                                      
                                      <button className="btn-primary" onClick={() => handleEditSubtopic(subtopic._id, topic._id)} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                        Save
                                      </button>
                                      <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>
                                          • {subtopic.name}
                                        </span>
                                        <span style={{
                                          fontSize: '9px',
                                          background: 'var(--primary-soft)',
                                          color: 'var(--primary)',
                                          padding: '1px 5px',
                                          borderRadius: '8px',
                                          fontWeight: '500'
                                        }}>
                                          Order: {subtopic.order || 0}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          className="btn-secondary"
                                          onClick={() => startEdit(subtopic, 'subtopic')}
                                          style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                                        >
                                          <EditOutlined />
                                        </button>
                                        <button
                                          className="btn-danger"
                                          onClick={() => handleDeleteSubtopic(subtopic._id, subtopic.name)}
                                          style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UnitswiseName;
