import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { BACKEND_URL } from '../config';

function QuestionFix() {
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Creating state
  const [isAdding, setIsAdding] = useState(false);

  const initialFormState = {
    question: '',
    questionImage: null,
    options: { a: '', b: '', c: '', d: '' },
    optionImages: { a: null, b: null, c: null, d: null },
    correct_answer: 'a',
    explanation: '',
    explanationImage: null
  };

  const [newQuestionForm, setNewQuestionForm] = useState(initialFormState);

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const response = await api.get('/api/questions/curriculum');
        const data = response.data || [];
        setCurriculum(data);
        if (data.length > 0) {
          setUnitId(data[0]._id);
        }
      } catch (error) {
        setCurriculumError('Failed to load curriculum from server.');
        console.error('Curriculum load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadCurriculum();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const params = {};
      if (unitId) params.unitId = unitId;
      if (topicId && topicId !== 'all') params.topicId = topicId;
      if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;

      const response = await api.get('/api/questions', { params });
      setQuestions(response.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setMessage('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [unitId, topicId, subtopicId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleUnitChange = (e) => {
    setUnitId(e.target.value);
    setTopicId('');
    setSubtopicId('');
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleTopicChange = (e) => {
    setTopicId(e.target.value);
    setSubtopicId('');
    setExpandedId(null);
    setIsAdding(false);
  };

  const handleSubtopicChange = (e) => {
    setSubtopicId(e.target.value);
    setExpandedId(null);
    setIsAdding(false);
  };

  const detectQuestionType = (question) => {
    if (/match\s+the\s+following/i.test(question || '')) return 'Match the Following';
    if (/assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(question || '')) {
      return 'Assertion-Reason';
    }
    if (
      /\b(?:consider\s+the\s+following\s+statements?|statements?)\b/i.test(question || '') ||
      /பின்வரும்\s+கூற்றுகள|கூற்றுகளைக்\s+கவனியுங்கள்/u.test(question || '')
    ) {
      return 'Statement type (True/False)';
    }
    return 'Theory-based MCQ';
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e, id, type, opt = null, isNewForm = false) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64Image = await fileToBase64(file);
      const response = await api.post('/api/questions/upload', { image: base64Image });
      const imageUrl = response.data.imageUrl;

      if (isNewForm) {
        setNewQuestionForm(prev => {
          if (type === 'question') return { ...prev, questionImage: imageUrl };
          if (type === 'explanation') return { ...prev, explanationImage: imageUrl };
          if (type === 'option') return { ...prev, optionImages: { ...prev.optionImages, [opt]: imageUrl } };
          return prev;
        });
      } else {
        setQuestions(questions.map(q => {
          if (q._id === id) {
            if (type === 'question') return { ...q, questionImage: imageUrl };
            if (type === 'explanation') return { ...q, explanationImage: imageUrl };
            if (type === 'option') return { ...q, optionImages: { ...q.optionImages, [opt]: imageUrl } };
          }
          return q;
        }));
      }
    } catch (error) {
      alert('Image upload failed: ' + error.message);
    }
  };

  const removeImage = (id, type, opt = null, isNewForm = false) => {
    if (isNewForm) {
      setNewQuestionForm(prev => {
        if (type === 'question') return { ...prev, questionImage: null };
        if (type === 'explanation') return { ...prev, explanationImage: null };
        if (type === 'option') return { ...prev, optionImages: { ...prev.optionImages, [opt]: null } };
        return prev;
      });
    } else {
      setQuestions(questions.map(q => {
        if (q._id === id) {
          if (type === 'question') return { ...q, questionImage: null };
          if (type === 'explanation') return { ...q, explanationImage: null };
          if (type === 'option') return { ...q, optionImages: { ...q.optionImages, [opt]: null } };
        }
        return q;
      }));
    }
  };

  const handleUpdateQuestion = async (id, updatedData) => {
    if (!window.confirm('Are you sure you want to update this question?')) return;
    try {
      setLoading(true);
      await api.put(`/api/questions/${id}`, {
        ...updatedData,
        type: detectQuestionType(updatedData.question)
      });
      setMessage('Question updated successfully!');
      setExpandedId(null);
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error updating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      setLoading(true);
      await api.delete(`/api/questions/${id}`);
      setMessage('Question deleted successfully!');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error deleting question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllQuestions = async () => {
    let targetName = '';
    const selectedUnitObj = curriculum.find(u => u._id === unitId);
    const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
    const selectedTopicObj = topicsList.find(t => t._id === topicId);
    const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

    if (subtopicId && subtopicId !== 'all') {
      const st = subtopicsList.find(s => s._id === subtopicId);
      targetName = `Subtopic: "${st?.name}"`;
    } else if (topicId && topicId !== 'all') {
      const t = topicsList.find(tp => tp._id === topicId);
      targetName = `Topic: "${t?.name}"`;
    } else {
      alert('Please select a topic or subtopic first to perform a bulk delete.');
      return;
    }

    const confirmMessage = `WARNING: Are you sure you want to delete ALL questions in ${targetName}? This will permanently delete all these questions and cannot be undone!`;
    if (!window.confirm(confirmMessage)) return;

    const secondConfirm = `FINAL CONFIRMATION: Type 'DELETE' to confirm deletion of all questions in this category.`;
    const responseText = window.prompt(secondConfirm);
    if (responseText !== 'DELETE') {
      alert('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      setLoading(true);
      const params = {};
      if (topicId && topicId !== 'all') params.topicId = topicId;
      if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;

      const response = await api.delete('/api/questions/delete/bulk', { params });
      setMessage(response.data?.message || 'Bulk deletion completed successfully.');
      fetchQuestions();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      setMessage('Error in bulk delete: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionForm.question.trim()) {
      alert('Question text is required.');
      return;
    }
    if (!newQuestionForm.options.a.trim() || !newQuestionForm.options.b.trim() || !newQuestionForm.options.c.trim() || !newQuestionForm.options.d.trim()) {
      alert('All options (A, B, C, D) are required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        unitId,
        topicId: topicId || null,
        subtopicId: subtopicId && subtopicId !== 'all' ? subtopicId : null,
        type: detectQuestionType(newQuestionForm.question),
        question: newQuestionForm.question,
        questionImage: newQuestionForm.questionImage,
        options: newQuestionForm.options,
        optionImages: newQuestionForm.optionImages,
        correct_answer: newQuestionForm.correct_answer,
        explanation: newQuestionForm.explanation,
        explanationImage: newQuestionForm.explanationImage,
        status: 'accepted',
        is_published: true
      };

      if (!payload.topicId && curriculum.length > 0) {
        // Fallback to first topic if none selected
        const currentUnitObj = curriculum.find(u => u._id === unitId);
        if (currentUnitObj && currentUnitObj.topics?.length > 0) {
          payload.topicId = currentUnitObj.topics[0]._id;
        }
      }

      await api.post('/api/questions', payload);
      setMessage('Question created successfully!');
      setNewQuestionForm(initialFormState);
      setIsAdding(false);
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error creating question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getImagePreview = (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  if (curriculumLoading) {
    return (
      <div className="tab-content extractor-page">
        <div className="extractor-hero">
          <div>
            <h2>Question Fixer</h2>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <p>Loading curriculum...</p>
        </div>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="tab-content extractor-page">
        <div className="extractor-hero">
          <div>
            <h2>Question Fixer</h2>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <p className="error-message">{curriculumError}</p>
        </div>
      </div>
    );
  }

  const selectedUnitObj = curriculum.find(u => u._id === unitId);
  const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
  const selectedTopicObj = topicsList.find(t => t._id === topicId);
  const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

  const normalizeCorrectAnswer = (val) => {
    if (typeof val === 'number') return ['a', 'b', 'c', 'd'][val] || 'a';
    if (typeof val === 'string' && /^\d+$/.test(val)) return ['a', 'b', 'c', 'd'][parseInt(val)] || 'a';
    return (val || 'a').toString().toLowerCase();
  };

  const getAnswerDisplay = (q) => {
    return normalizeCorrectAnswer(q.correct_answer || q.correctAnswer).toUpperCase();
  };

  return (
    <div className="tab-content extractor-page">
      <div className="extractor-hero">
        <div>
          <h2>Question Fixer</h2>
        </div>
      </div>

      <div className="extractor-setup" style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)' }}>
        <div className="extractor-section-heading">
          <span>01</span>
          <div>
            <h3>Select Category</h3>
          </div>
        </div>
        <div className={`form-row ${subtopicsList.length > 0 ? 'three-col' : 'two-col'}`}>
          <div className="form-group">
            <label>Unit</label>
            <select value={unitId} onChange={handleUnitChange}>
              {curriculum.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Topic</label>
            <select value={topicId} onChange={handleTopicChange}>
              <option value="">All Topics</option>
              {topicsList.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          {subtopicsList.length > 0 && (
            <div className="form-group">
              <label>Subtopic</label>
              <select value={subtopicId} onChange={handleSubtopicChange} disabled={!topicId}>
                <option value="">All Subtopics</option>
                {subtopicsList.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 28px 10px' }}>
        <p style={{ margin: 0, fontWeight: '700', color: 'var(--text)' }}>
          Found {questions.length} questions in this selection.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel Add' : '+ Add Question'}
          </button>
          {topicId && questions.length > 0 && (
            <button className="btn-danger" onClick={handleDeleteAllQuestions}>
              Delete all
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'} style={{ margin: '15px 28px' }}>
          {message}
        </div>
      )}

      {/* Add New Question Section */}
      {isAdding && (
        <div className="question-card approved" style={{ margin: '20px 28px', padding: '24px', borderLeft: '4px solid var(--primary)', borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)' }}>
          <div className="question-header" style={{ marginBottom: '18px' }}>
            <h3>Create New Question</h3>
          </div>
          <div className="edit-form" style={{ marginTop: 0, border: 0, paddingTop: 0 }}>
            {/* Question Text */}
            <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h4>Question</h4>
              <div className="form-group">
                <label>Question Text</label>
                <textarea
                  value={newQuestionForm.question}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
                  rows={3}
                  placeholder="Enter question content..."
                />
              </div>
              <div className="form-group">
                <label>Question Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, null, 'question', null, true)}
                />
                {newQuestionForm.questionImage && (
                  <div className="image-preview-container">
                    <img
                      src={getImagePreview(newQuestionForm.questionImage)}
                      alt="Question Preview"
                      className="image-preview"
                    />
                    <button type="button" className="btn-remove-image" onClick={() => removeImage(null, 'question', null, true)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h4>Options</h4>
              {['a', 'b', 'c', 'd'].map((opt) => (
                <div key={opt} className="option-row">
                  <div className="option-input-group">
                    <div className="form-group option-text">
                      <label>Option {opt.toUpperCase()}</label>
                      <input
                        value={newQuestionForm.options[opt]}
                        onChange={(e) => setNewQuestionForm({
                          ...newQuestionForm,
                          options: { ...newQuestionForm.options, [opt]: e.target.value }
                        })}
                        placeholder={`Option ${opt.toUpperCase()} text`}
                      />
                    </div>
                    <div className="form-group option-image">
                      <label>Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, null, 'option', opt, true)}
                      />
                      {newQuestionForm.optionImages[opt] && (
                        <div className="image-preview-small">
                          <img
                            src={getImagePreview(newQuestionForm.optionImages[opt])}
                            alt={`Option ${opt.toUpperCase()} Preview`}
                          />
                          <button type="button" className="btn-remove-small" onClick={() => removeImage(null, 'option', opt, true)}>
                            x
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Correct Answer */}
            <div className="form-group" style={{ margin: '16px 0' }}>
              <label>Correct Answer</label>
              <select
                value={newQuestionForm.correct_answer}
                onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correct_answer: e.target.value })}
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>

            {/* Explanation */}
            <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h4>Explanation</h4>
              <div className="form-group">
                <label>Explanation Text</label>
                <textarea
                  value={newQuestionForm.explanation}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })}
                  rows={3}
                  placeholder="Enter answer explanation..."
                />
              </div>
              <div className="form-group">
                <label>Explanation Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, null, 'explanation', null, true)}
                />
                {newQuestionForm.explanationImage && (
                  <div className="image-preview-container">
                    <img
                      src={getImagePreview(newQuestionForm.explanationImage)}
                      alt="Explanation Preview"
                      className="image-preview"
                    />
                    <button type="button" className="btn-remove-image" onClick={() => removeImage(null, 'explanation', null, true)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card-actions" style={{ marginTop: '20px' }}>
              <button className="btn-primary" onClick={handleCreateQuestion} disabled={loading}>
                {loading ? 'Creating...' : 'Create Question'}
              </button>
              <button className="btn-secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Listing */}
      {loading && questions.length === 0 ? (
        <p style={{ padding: '0 28px' }}>Loading questions...</p>
      ) : (
        <div className="question-list" style={{ padding: '0 28px 28px' }}>
          {questions.map((q, idx) => (
            <div key={q._id} className="question-list-item" style={{ marginBottom: '16px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div
                className="question-summary"
                onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: '#f8fafc' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '800', color: 'var(--primary)' }}>Q{idx + 1}.</span>
                  <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                    {q.question?.length > 100 ? `${q.question.substring(0, 100)}...` : q.question}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className="badge" style={{ padding: '4px 10px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                    Ans: {getAnswerDisplay(q)}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    {expandedId === q._id ? '▲ Collapse' : '▼ Expand'}
                  </span>
                </div>
              </div>

              {expandedId === q._id && (
                <div className="question-detail" style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
                  <div className="edit-form" style={{ marginTop: 0, border: 0, paddingTop: 0 }}>
                    {/* Question Text */}
                    <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4>Question</h4>
                      <div className="form-group">
                        <label>Question Text</label>
                        <textarea
                          value={q.question}
                          onChange={(e) => setQuestions(questions.map(item => item._id === q._id ? { ...item, question: e.target.value } : item))}
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Question Image (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, q._id, 'question')}
                        />
                        {q.questionImage && (
                          <div className="image-preview-container">
                            <img
                              src={getImagePreview(q.questionImage)}
                              alt="Question"
                              className="image-preview"
                            />
                            <button type="button" className="btn-remove-image" onClick={() => removeImage(q._id, 'question')}>
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4>Options</h4>
                      {['a', 'b', 'c', 'd'].map((opt) => (
                        <div key={opt} className="option-row">
                          <div className="option-input-group">
                            <div className="form-group option-text">
                              <label>Option {opt.toUpperCase()}</label>
                              <input
                                value={q.options[opt]}
                                onChange={(e) => setQuestions(questions.map(item => {
                                  if (item._id === q._id) {
                                    return { ...item, options: { ...item.options, [opt]: e.target.value } };
                                  }
                                  return item;
                                }))}
                              />
                            </div>
                            <div className="form-group option-image">
                              <label>Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, q._id, 'option', opt)}
                              />
                              {q.optionImages?.[opt] && (
                                <div className="image-preview-small">
                                  <img
                                    src={getImagePreview(q.optionImages[opt])}
                                    alt={`Option ${opt.toUpperCase()}`}
                                  />
                                  <button type="button" className="btn-remove-small" onClick={() => removeImage(q._id, 'option', opt)}>
                                    x
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Correct Answer */}
                    <div className="form-group" style={{ margin: '16px 0' }}>
                      <label>Correct Answer</label>
                      <select
                        value={normalizeCorrectAnswer(q.correct_answer)}
                        onChange={(e) => setQuestions(questions.map(item => item._id === q._id ? { ...item, correct_answer: e.target.value } : item))}
                      >
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                        <option value="d">D</option>
                      </select>
                    </div>

                    {/* Explanation */}
                    <div className="section" style={{ background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4>Explanation</h4>
                      <div className="form-group">
                        <label>Explanation Text</label>
                        <textarea
                          value={q.explanation || ''}
                          onChange={(e) => setQuestions(questions.map(item => item._id === q._id ? { ...item, explanation: e.target.value } : item))}
                          rows={3}
                          placeholder="Explanation..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Explanation Image (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, q._id, 'explanation')}
                        />
                        {q.explanationImage && (
                          <div className="image-preview-container">
                            <img
                              src={getImagePreview(q.explanationImage)}
                              alt="Explanation"
                              className="image-preview"
                            />
                            <button type="button" className="btn-remove-image" onClick={() => removeImage(q._id, 'explanation')}>
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="card-actions" style={{ marginTop: '20px' }}>
                      <button className="btn-primary" onClick={() => handleUpdateQuestion(q._id, q)}>
                        Save Changes
                      </button>
                      <button className="btn-danger" onClick={() => handleDeleteQuestion(q._id)}>
                        Delete Question
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuestionFix;
