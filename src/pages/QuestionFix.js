import React, { useState, useEffect, useCallback } from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import api from '../api';
import { detectQuestionType, normalizeCorrectAnswer } from '../components/helpers';
import QuestionForm from '../components/QuestionForm';
import { useModal } from '../components/ModalProvider';

function QuestionFix() {
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [destinationMode, setDestinationMode] = useState('curriculum'); // 'curriculum' or 'test'

  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');

  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');

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
    const loadData = async () => {
      try {
        const [curriculumResponse, testsResponse] = await Promise.all([
          api.get('/api/questions/curriculum'),
          api.get('/api/questions/tests')
        ]);

        const data = curriculumResponse.data || [];
        setCurriculum(data);
        if (data.length > 0) {
          setUnitId(data[0]._id);
        }

        const testsData = testsResponse.data || [];
        setTests(testsData);
        if (testsData.length > 0) {
          setSelectedTestId(testsData[0]._id);
        }
      } catch (error) {
        setCurriculumError('Failed to load curriculum or tests from server.');
        console.error('Curriculum load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (destinationMode === 'test') {
      if (!selectedTestId) {
        setQuestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await api.get('/api/questions/exam', { params: { testId: selectedTestId } });
        setQuestions(response.data || []);
      } catch (error) {
        console.error('Error fetching exam questions:', error);
        setMessage('Failed to load questions.');
      } finally {
        setLoading(false);
      }
      return;
    }

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
  }, [destinationMode, unitId, topicId, subtopicId, selectedTestId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleModeChange = (mode) => {
    setDestinationMode(mode);
    setExpandedId(null);
    setIsAdding(false);
    setMessage('');
  };

  const handleTestChange = (e) => {
    setSelectedTestId(e.target.value);
    setExpandedId(null);
    setIsAdding(false);
  };

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
    const confirmed = await showConfirm('Are you sure you want to update this question?', { title: 'Update Question' });
    if (!confirmed) return;
    try {
      setLoading(true);
      const endpoint = destinationMode === 'test' ? `/api/questions/exam/${id}` : `/api/questions/${id}`;
      await api.put(endpoint, {
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
    const confirmed = await showConfirm('Are you sure you want to delete this question?', { title: 'Delete Question', confirmText: 'Delete', variant: 'error' });
    if (!confirmed) return;
    try {
      setLoading(true);
      const endpoint = destinationMode === 'test' ? `/api/questions/exam/${id}` : `/api/questions/${id}`;
      await api.delete(endpoint);
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

    if (destinationMode === 'test') {
      const selectedTest = tests.find(t => t._id === selectedTestId);
      if (!selectedTest) {
        await showAlert('Please select a test first to perform a bulk delete.', { variant: 'warning' });
        return;
      }
      targetName = `Test: "${selectedTest.name}"`;
    } else {
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
        await showAlert('Please select a topic or subtopic first to perform a bulk delete.', { variant: 'warning' });
        return;
      }
    }

    const confirmMessage = `Are you sure you want to delete ALL questions in ${targetName}? This will permanently delete all these questions and cannot be undone!`;
    const confirmed = await showConfirm(confirmMessage, { title: 'Bulk Delete Warning', confirmText: 'Continue', variant: 'error' });
    if (!confirmed) return;

    const responseText = await showPrompt(
      "Type 'DELETE' to confirm deletion of all questions in this category.",
      { title: 'Final Confirmation', confirmText: 'Confirm Delete', placeholder: 'DELETE' }
    );
    if (responseText !== 'DELETE') {
      await showAlert('Deletion cancelled. Confirmation text did not match.', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      let response;
      if (destinationMode === 'test') {
        response = await api.delete('/api/questions/exam/delete/bulk', { params: { testId: selectedTestId } });
      } else {
        const params = {};
        if (topicId && topicId !== 'all') params.topicId = topicId;
        if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;
        response = await api.delete('/api/questions/delete/bulk', { params });
      }
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
      await showAlert('Question text is required.', { variant: 'warning' });
      return;
    }
    if (!newQuestionForm.options.a.trim() || !newQuestionForm.options.b.trim() || !newQuestionForm.options.c.trim() || !newQuestionForm.options.d.trim()) {
      await showAlert('All options (A, B, C, D) are required.', { variant: 'warning' });
      return;
    }

    if (destinationMode === 'test' && !selectedTestId) {
      await showAlert('Please select a test first.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);

      if (destinationMode === 'test') {
        const selectedTest = tests.find(t => t._id === selectedTestId);
        const payload = {
          testId: selectedTestId,
          testName: selectedTest?.name,
          type: detectQuestionType(newQuestionForm.question),
          question: newQuestionForm.question,
          questionImage: newQuestionForm.questionImage,
          options: newQuestionForm.options,
          optionImages: newQuestionForm.optionImages,
          correct_answer: newQuestionForm.correct_answer,
          explanation: newQuestionForm.explanation,
          explanationImage: newQuestionForm.explanationImage
        };

        await api.post('/api/questions/exam', payload);
      } else {
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
      }

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

        <div className="destination-toggle" style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '0 8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
            <input
              type="radio"
              name="fixDestinationMode"
              value="curriculum"
              checked={destinationMode === 'curriculum'}
              onChange={() => handleModeChange('curriculum')}
              style={{ cursor: 'pointer' }}
            />
            Unit-wise Questions
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
            <input
              type="radio"
              name="fixDestinationMode"
              value="test"
              checked={destinationMode === 'test'}
              onChange={() => handleModeChange('test')}
              style={{ cursor: 'pointer' }}
            />
            Test Questions
          </label>
        </div>

        {destinationMode === 'curriculum' ? (
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
        ) : (
          <div className="form-row one-col">
            <div className="form-group">
              <label>Select Test</label>
              {tests.length > 0 ? (
                <select value={selectedTestId} onChange={handleTestChange}>
                  {tests.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} {t.publishToStudent ? '(Published)' : '(Draft)'}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ color: '#ef4444', fontWeight: 500, padding: '8px 0' }}>
                  No tests available. Please configure tests first.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 28px 10px' }}>
        <p style={{ margin: 0, fontWeight: '700', color: 'var(--text)' }}>
          Found {questions.length} questions in this selection.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel Add' : '+ Add Question'}
          </button>
          {((destinationMode === 'test' && selectedTestId) || (destinationMode === 'curriculum' && topicId)) && questions.length > 0 && (
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
