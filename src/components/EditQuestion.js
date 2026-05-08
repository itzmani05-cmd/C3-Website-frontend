import React, { useState, useEffect } from 'react';
import api from '../api';
import { BACKEND_URL } from '../config';

function EditQuestion() {
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const response = await api.get('/api/questions/curriculum');
        setCurriculum(response.data || []);
      } catch (error) {
        console.error('Curriculum load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadCurriculum();
  }, []);

  useEffect(() => {
    if (subtopicId) {
      fetchQuestions();
    } else {
      setQuestions([]);
    }
  }, [subtopicId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/questions/by-subtopic/${subtopicId}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      await api.put(`/api/questions/${id}`, updatedData);
      setMessage('Question updated successfully!');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error updating question: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/api/questions/${id}`);
      setMessage('Question deleted successfully!');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error deleting question: ' + error.message);
    }
  };

  if (curriculumLoading) return <div className="tab-content"><p>Loading curriculum...</p></div>;

  const units = curriculum;
  const selectedUnit = units.find(u => u._id === unitId) || (units.length > 0 ? units[0] : null);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find(t => t._id === topicId) || (topics.length > 0 ? topics[0] : null);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Question Bank</h2>
        <button className="btn-secondary" onClick={fetchQuestions} disabled={!subtopicId}>
          Refresh List
        </button>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="hierarchy-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <div className={`form-row ${subtopics.length > 0 ? 'three-col' : 'two-col'}`}>
          <div className="form-group">
            <label>Unit</label>
            <select value={unitId} onChange={(e) => { setUnitId(e.target.value); setTopicId(''); setSubtopicId(''); }}>
              <option value="">-- Select Unit --</option>
              {units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Topic</label>
            <select value={topicId} onChange={(e) => { setTopicId(e.target.value); setSubtopicId(''); }}>
              <option value="">-- Select Topic --</option>
              {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          {subtopics.length > 0 && (
            <div className="form-group">
              <label>Subtopic</label>
              <select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                <option value="">-- Select Subtopic --</option>
                {subtopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <p><strong>{questions.length} Questions</strong> in this Subcategory</p>

      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="question-list">
          {questions.map((q) => (
            <div key={q._id} className="question-list-item">
              <div 
                className="question-summary"
                onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Q: {q.question?.substring(0, 80)}...</span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                   Ans: {getAnswerDisplay(q)}
                </span>
              </div>
              
              {expandedId === q._id && (
                <QuestionEditor 
                  question={q}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const normalizeCorrectAnswer = (val) => {
  if (typeof val === 'number') return ['a', 'b', 'c', 'd'][val] || 'a';
  if (typeof val === 'string' && /^\d+$/.test(val)) return ['a', 'b', 'c', 'd'][parseInt(val)] || 'a';
  return (val || 'a').toString().toLowerCase();
};

const getAnswerDisplay = (q) => {
  return normalizeCorrectAnswer(q.correct_answer || q.correctAnswer).toUpperCase();
};

function QuestionEditor({ question, onUpdate, onDelete }) {
  const getInitialAnswer = () => {
    return normalizeCorrectAnswer(question.correct_answer || question.correctAnswer);
  };

  const [formData, setFormData] = useState({
    question: question.question,
    options: { ...question.options },
    correct_answer: getInitialAnswer(),
    explanation: question.explanation || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value }
    }));
  };

  return (
    <div className="question-detail" style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '0 0 8px 8px' }}>
      <div className="form-group">
        <label>Question Text</label>
        <textarea
          value={formData.question}
          onChange={(e) => handleChange('question', e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Option A</label>
          <input 
            value={formData.options.a}
            onChange={(e) => handleOptionChange('a', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Option B</label>
          <input 
            value={formData.options.b}
            onChange={(e) => handleOptionChange('b', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Option C</label>
          <input 
            value={formData.options.c}
            onChange={(e) => handleOptionChange('c', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Option D</label>
          <input 
            value={formData.options.d}
            onChange={(e) => handleOptionChange('d', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Correct Answer</label>
          <select 
            value={formData.correct_answer}
            onChange={(e) => handleChange('correct_answer', e.target.value)}
          >
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
            <option value="d">D</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 2 }}>
          <label>Explanation</label>
          <textarea 
            value={formData.explanation}
            onChange={(e) => handleChange('explanation', e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="card-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className="btn-primary" 
          onClick={() => onUpdate(question._id, formData)}
        >
          Update Question
        </button>
        <button 
          className="btn-danger" 
          onClick={() => onDelete(question._id)}
          style={{ backgroundColor: '#ff4d4f', color: '#fff' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default EditQuestion;
