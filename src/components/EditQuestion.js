import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SUBJECTS = [
  "Building Materials & Construction Practices",
  "Engineering Survey",
  "Engineering Mechanics & Strength of Materials",
  "Structural Analysis",
  "Geotechnical Engineering",
  "Environmental Engineering",
  "RCC / Prestressed Concrete & Steel Structures",
  "Hydraulics & Water Resources",
  "Urban & Transportation Engineering",
  "Project Management & Estimating"
];

function EditQuestion() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [subcategory, setSubcategory] = useState('-- All --');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [subject, subcategory, questions]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const filterQuestions = () => {
    let filtered = questions.filter(q => q.subject === subject);
    
    // Extract unique subcategories
    const uniqueSubcats = [...new Set(filtered.map(q => q.subcategory))];
    setSubcategories(['-- All --', ...uniqueSubcats]);
    
    if (subcategory !== '-- All --') {
      filtered = filtered.filter(q => q.subcategory === subcategory);
    }
    
    setFilteredQuestions(filtered);
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      await axios.put(`/api/questions/${id}`, updatedData);
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
      await axios.delete(`/api/questions/${id}`);
      setMessage('Question deleted successfully!');
      fetchQuestions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error deleting question: ' + error.message);
    }
  };

  return (
    <div className="tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Edit Question Bank</h2>
        <button className="btn-secondary" onClick={fetchQuestions}>
          Force Refresh Database
        </button>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Select Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>DB Subcategory</label>
          <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
            {subcategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
        </div>
      </div>

      <p><strong>{filteredQuestions.length} Questions</strong> in this Subcategory</p>

      {filteredQuestions.map((q) => (
        <div key={q._id} className="question-list-item">
          <div 
            className="question-summary"
            onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
          >
            <span>Q: {q.question.substring(0, 60)}...</span>
            <span style={{ color: '#666', fontSize: '12px' }}>
              {q.subcategory} | Ans: {q.correct_answer.toUpperCase()}
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
  );
}

function QuestionEditor({ question, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    question: question.question,
    options: { ...question.options },
    correct_answer: question.correct_answer,
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
    <div className="question-detail">
      <div className="form-group">
        <label>Question</label>
        <textarea
          value={formData.question}
          onChange={(e) => handleChange('question', e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Option A</label>
          <input 
            value={formData.options.a}
            onChange={(e) => handleOptionChange('a', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Option B</label>
          <input 
            value={formData.options.b}
            onChange={(e) => handleOptionChange('b', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Option C</label>
          <input 
            value={formData.options.c}
            onChange={(e) => handleOptionChange('c', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Option D</label>
          <input 
            value={formData.options.d}
            onChange={(e) => handleOptionChange('d', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
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
        <div className="form-group">
          <label>Explanation</label>
          <input 
            value={formData.explanation}
            onChange={(e) => handleChange('explanation', e.target.value)}
          />
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="btn-primary" 
          onClick={() => onUpdate(question._id, formData)}
        >
          Update
        </button>
        <button 
          className="btn-danger" 
          onClick={() => onDelete(question._id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default EditQuestion;
