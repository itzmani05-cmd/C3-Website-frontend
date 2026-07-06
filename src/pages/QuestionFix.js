import React, { useState, useEffect, useCallback } from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import api from '../api';
import { detectQuestionType, normalizeCorrectAnswer } from '../components/helpers';
import QuestionForm from '../components/QuestionForm';

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

  const selectedUnitObj = curriculum.find(u => u._id === unitId);
  const topicsList = selectedUnitObj ? selectedUnitObj.topics : [];
  const selectedTopicObj = topicsList.find(t => t._id === topicId);
  const subtopicsList = selectedTopicObj ? selectedTopicObj.subtopics : [];

  const getAnswerDisplay = (q) => {
    return normalizeCorrectAnswer(q.correct_answer || q.correctAnswer).toUpperCase();
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
          
          <QuestionForm
            question={newQuestionForm}
            onChange={setNewQuestionForm}
            variant="fixer"
          />

          <div className="card-actions" style={{ marginTop: '20px' }}>
            <button className="btn-primary" onClick={handleCreateQuestion} disabled={loading}>
              {loading ? 'Creating...' : 'Create Question'}
            </button>
            <button className="btn-secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
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
                  <span style={{ color: 'var(--muted)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {expandedId === q._id ? <><UpOutlined /> Collapse</> : <><DownOutlined /> Expand</>}
                  </span>
                </div>
              </div>

              {expandedId === q._id && (
                <div className="question-detail" style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
                  <QuestionForm
                    question={q}
                    onChange={(updatedQ) => {
                      setQuestions(questions.map(item => item._id === q._id ? updatedQ : item));
                    }}
                    variant="fixer"
                  />

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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuestionFix;
