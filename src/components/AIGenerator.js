import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { BACKEND_URL } from '../config';

function AIGenerator() {
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [notebookUrl, setNotebookUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [batch, setBatch] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const response = await api.get('/api/questions/curriculum');
        const data = response.data || [];
        setCurriculum(data);

        if (data.length > 0) {
          const firstUnit = data[0];
          const firstTopic = firstUnit.topics?.[0];
          const firstSubtopic = firstTopic?.subtopics?.[0];

          setUnitId(firstUnit._id);
          if (firstTopic) setTopicId(firstTopic._id);
          if (firstSubtopic) setSubtopicId(firstSubtopic._id);
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

  useEffect(() => {
    if (!unitId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find(u => u._id === unitId) || curriculum[0];
    const firstTopic = selectedUnit.topics?.[0];

    if (firstTopic && !selectedUnit.topics.some(t => t._id === topicId)) {
      setTopicId(firstTopic._id);
    }
  }, [unitId, curriculum, topicId]);

  useEffect(() => {
    if (!topicId || curriculum.length === 0) return;
    const selectedUnit = curriculum.find(u => u._id === unitId) || curriculum[0];
    const selectedTopic = selectedUnit.topics?.find(t => t._id === topicId);
    const firstSubtopic = selectedTopic?.subtopics?.[0];

    if (selectedTopic && !selectedTopic.subtopics.some(st => st._id === subtopicId)) {
      setSubtopicId(firstSubtopic?._id || '');
    }
  }, [topicId, curriculum, subtopicId, unitId]);

  const fetchQuestionCount = useCallback(async () => {
    if (!topicId) {
      setQuestionCount(0);
      return;
    }

    try {
      let url = `/api/questions/stats/count?topicId=${encodeURIComponent(topicId)}`;
      if (subtopicId) {
        url += `&subtopicId=${encodeURIComponent(subtopicId)}`;
      }
      const response = await api.get(url);
      setQuestionCount(response.data.count);
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  }, [subtopicId, topicId]);

  useEffect(() => {
    fetchQuestionCount();
  }, [fetchQuestionCount]);

  const getImagePreview = (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  const handleQuickExtract = () => {
    if (!pastedContent.trim()) {
      alert('Please paste some content first!');
      return;
    }

    const questions = [];
    const lines = pastedContent.split('\n');
    let currentQuestion = null;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed && !currentQuestion) return;

      // Detect question start: "1. ", "1) ", "Q1: ", "Question 1: "
      const qMatch = trimmed.match(/^(?:\d+[\.\)\:]|Question\s+\d+\:|Q\d+\:)\s*(.*)/i);
      if (qMatch) {
        if (currentQuestion && currentQuestion.question) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          id: Date.now() + idx,
          question: qMatch[1].trim(),
          options: { a: '', b: '', c: '', d: '' },
          correct_answer: 'a',
          explanation: '',
          status: 'PENDING',
          optionImages: { a: null, b: null, c: null, d: null },
          questionImage: null,
          explanationImage: null,
          subcategory: subtopicId || topicId
        };
        return;
      }

      if (!currentQuestion) return;

      // Detect options: "a) ", "a. ", "(a) ", "A) ", "A. "
      const optMatch = trimmed.match(/^[\[\(]?([a-d])[\]\)\.\:\s]+(.*)/i);
      if (optMatch) {
        const letter = optMatch[1].toLowerCase();
        currentQuestion.options[letter] = optMatch[2].trim();
        return;
      }

      // Detect answer: "Answer: b", "Correct Answer: b", "Ans: b"
      const ansMatch = trimmed.match(/^(?:Answer|Correct Answer|Ans|Correct Option)\s*[\:\-\s]+[\[\(\s]*([a-d])[\]\)\s]*/i);
      if (ansMatch) {
        currentQuestion.correct_answer = ansMatch[1].toLowerCase();
        return;
      }

      // Detect explanation: "Explanation: ...", "Exp: ..."
      const expMatch = trimmed.match(/^(?:Explanation|Exp|Detailed Explanation)\s*[\:\-\s]+(.*)/i);
      if (expMatch) {
        currentQuestion.explanation = expMatch[1].trim();
        return;
      }

      // If it's none of the above, append to the last active section
      if (trimmed) {
        if (!currentQuestion.options.a) {
          currentQuestion.question += ' ' + trimmed;
        } else if (currentQuestion.explanation) {
          currentQuestion.explanation += ' ' + trimmed;
        } else if (currentQuestion.options.d) {
          // If we have option D and this doesn't look like a new question, 
          // it might be the start of explanation without the label
          if (!currentQuestion.explanation) {
             currentQuestion.explanation = trimmed;
          } else {
             currentQuestion.explanation += ' ' + trimmed;
          }
        }
      }
    });

    if (currentQuestion && currentQuestion.question) {
      questions.push(currentQuestion);
    }

    if (questions.length === 0) {
      alert('Could not find any questions in the pasted content. Please ensure questions are numbered (e.g., 1. What is...) and options are labeled (a, b, c, d).');
      return;
    }

    setBatch([...batch, ...questions]);
    setPastedContent('');
    setMessage(`Extracted ${questions.length} questions!`);
  };

  const handleSmartExtract = async () => {
    if (!pastedContent.trim()) {
      alert('Please paste some content first!');
      return;
    }

    setLoading(true);
    setMessage('Using Smart Extract (Backend)...');
    try {
      const response = await api.post('/api/ai/extract', {
        textContent: pastedContent,
        unitId,
        topicId,
        subtopicId
      });

      if (response.data.success && response.data.questions.length > 0) {
        const mappedQuestions = response.data.questions.map((q, idx) => ({
          ...q,
          id: Date.now() + idx,
          correct_answer: q.correctAnswer || q.correct_answer || 'a',
          status: 'PENDING',
          optionImages: { a: null, b: null, c: null, d: null },
          questionImage: null,
          explanationImage: null,
          subcategory: subtopicId || topicId
        }));
        setBatch([...batch, ...mappedQuestions]);
        setPastedContent('');
        setMessage(`Smart Extracted ${mappedQuestions.length} questions!`);
      } else {
        alert('Smart Extract failed to find questions. Try the Quick Extract or AI Generate.');
      }
    } catch (error) {
      setMessage('Smart Extract Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!pastedContent.trim()) {
      alert('Please paste some content first!');
      return;
    }

    setLoading(true);
    setMessage('AI is processing your content (Gemini)...');
    try {
      const selectedTopicName = topics.find(t => t._id === topicId)?.name || 'General';
      const selectedSubtopicName = subtopics.find(st => st._id === subtopicId)?.name || '';

      const response = await api.post('/api/ai/generate', {
        textContent: pastedContent,
        subject: selectedTopicName,
        subtopic: selectedSubtopicName
      });

      if (response.data.success && response.data.questions.length > 0) {
        const mappedQuestions = response.data.questions.map((q, idx) => ({
          ...q,
          id: Date.now() + idx,
          correct_answer: q.correct_answer || 'a',
          status: 'PENDING',
          optionImages: { a: null, b: null, c: null, d: null },
          questionImage: null,
          explanationImage: null,
          subcategory: subtopicId || topicId
        }));
        setBatch([...batch, ...mappedQuestions]);
        setPastedContent('');
        setMessage(`AI Generated ${mappedQuestions.length} questions!`);
      } else {
        alert('AI failed to generate questions. Ensure content is sufficient.');
      }
    } catch (error) {
      setMessage('AI Generation Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };


  const addManualQuestion = () => {
    const newQ = {
      id: Date.now(),
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: 'a',
      explanation: '',
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory: subtopicId || topicId
    };
    setBatch([newQ, ...batch]);
  };

  const updateQuestion = (id, field, value) => {
    setBatch(batch.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (id, opt, value) => {
    setBatch(batch.map(q => {
      if (q.id === id) {
        return { ...q, options: { ...q.options, [opt]: value } };
      }
      return q;
    }));
  };

  const setStatus = (id, status) => {
    if (status === 'APPROVED') {
      saveSingleQuestion(id);
    } else {
      setBatch(batch.map(q => q.id === id ? { ...q, status } : q));
    }
  };

  const deleteQuestion = (id) => {
    setBatch(batch.filter(q => q.id !== id));
  };

  const clearBatch = () => {
    setBatch([]);
  };

  const saveSingleQuestion = async (id) => {
    const q = batch.find(item => item.id === id);
    if (!q) return;

    setLoading(true);
    try {
      const answerMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const questionData = {
        unitId,
        topicId,
        subtopicId,
        type: 'Theory-based MCQ',
        question: q.question,
        questionImage: q.questionImage,
        options: q.options,
        optionImages: q.optionImages,
        correctAnswer: answerMap[q.correct_answer] || 0,
        explanation: q.explanation,
        explanationImage: q.explanationImage,
        status: 'accepted',
        is_published: false
      };

      await api.post('/api/questions', questionData);
      setBatch(batch.filter(item => item.id !== id));
      setMessage('Question saved successfully!');
      fetchQuestionCount();
    } catch (error) {
      setMessage('Error saving question: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    const toSave = batch.filter(q => q.status !== 'REJECTED');
    if (toSave.length === 0) {
      alert('No questions to save!');
      return;
    }

    setLoading(true);
    try {
      const answerMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };

      for (const q of toSave) {
        const questionData = {
          unitId,
          topicId,
          subtopicId,
          type: 'Theory-based MCQ',
          question: q.question,
          questionImage: q.questionImage,
          options: q.options,
          optionImages: q.optionImages,
          correctAnswer: answerMap[q.correct_answer] || 0,
          explanation: q.explanation,
          explanationImage: q.explanationImage,
          status: 'accepted',
          is_published: false
        };
        await api.post('/api/questions', questionData);
      }
      setMessage(`Successfully saved ${toSave.length} questions!`);
      setBatch([]);
      fetchQuestionCount();
    } catch (error) {
      setMessage('Error saving: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e, id, type, opt = null) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64Image = await fileToBase64(file);
      const response = await api.post('/api/questions/upload', { image: base64Image });
      const imageUrl = response.data.imageUrl;

      setBatch(batch.map(q => {
        if (q.id === id) {
          if (type === 'question') return { ...q, questionImage: imageUrl };
          if (type === 'explanation') return { ...q, explanationImage: imageUrl };
          if (type === 'option') return { ...q, optionImages: { ...q.optionImages, [opt]: imageUrl } };
        }
        return q;
      }));
    } catch (error) {
      alert('Image upload failed: ' + error.message);
    }
  };

  const removeImage = (id, type, opt = null) => {
    setBatch(batch.map(q => {
      if (q.id === id) {
        if (type === 'question') return { ...q, questionImage: null };
        if (type === 'explanation') return { ...q, explanationImage: null };
        if (type === 'option') return { ...q, optionImages: { ...q.optionImages, [opt]: null } };
      }
      return q;
    }));
  };

  if (curriculumLoading) {
    return (
      <div className="tab-content">
        <h2>Question Extractor</h2>
        <p>Loading curriculum...</p>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="tab-content">
        <h2>Question Extractor</h2>
        <p className="error-message">{curriculumError}</p>
      </div>
    );
  }

  const units = curriculum;
  const selectedUnit = units.find(u => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find(t => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const progressPct = Math.min(100, (questionCount / 25) * 100);

  return (
    <div className="tab-content">
      <h2>Question Extractor</h2>

      <div className="info-box">
        Paste content to extract questions automatically. Review and save individual questions or approve all at once.
      </div>

      <div className={`form-row ${subtopics.length > 0 ? 'three-col' : 'two-col'}`}>
        <div className="form-group">
          <label>Select Unit</label>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Select Topic</label>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        {subtopics.length > 0 && (
          <div className="form-group">
            <label>Select Subtopic</label>
            <select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
              {subtopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-title">
                      Live Pulse: {subtopicId
                        ? subtopics.find(st => st._id === subtopicId)?.name
                        : selectedTopic?.name || ''}
                    </span>
          <span className={`progress-count ${questionCount >= 25 ? 'complete' : ''}`}>
            {questionCount} / 25 Questions Verified
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${questionCount >= 25 ? 'complete' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {questionCount >= 25 ? (
          <div style={{ color: '#008000', marginTop: '8px', fontWeight: 700 }}>Subtopic Complete!</div>
        ) : (
          <div style={{ color: '#000000', marginTop: '8px' }}>Add {25 - questionCount} more to unlock for students.</div>
        )}
      </div>

      <div className="form-group">
        <label>Paste Notebook LLM Source URL</label>
        <input 
          type="text" 
          value={notebookUrl} 
          onChange={(e) => setNotebookUrl(e.target.value)}
          placeholder="https://notebooklm.google.com/..."
        />
      </div>

      <div className="form-group">
        <label>Paste Questions Content</label>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          rows={10}
          placeholder={`Paste your questions here in this format:

1. What is the capital of France?
a) London
b) Paris
c) Berlin
d) Madrid
Answer: b
Explanation: Paris is the capital of France.

2. What is 2+2?
a) 3
b) 4
c) 5
d) 6
Answer: b`}
        />
        <small style={{ color: '#000000', display: 'block', marginTop: '8px' }}>
          Format: Numbered questions with options (a, b, c, d) and optional Answer/Explanation
        </small>
      </div>

      <div className="action-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          onClick={handleQuickExtract}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Quick Extract (Local)'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleSmartExtract}
          disabled={loading}
          style={{ backgroundColor: '#4a90e2', color: 'white' }}
        >
          {loading ? 'Processing...' : 'Smart Extract (Backend)'}
        </button>
        <button
          className="btn-primary"
          onClick={handleAIGenerate}
          disabled={loading}
          style={{ background: 'linear-gradient(45deg, #6e8efb, #a777e3)' }}
        >
          {loading ? 'AI Thinking...' : '✨ Magic AI Extract (Gemini)'}
        </button>
      </div>


      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {batch.length > 0 && (
        <>
          <div className="action-row" style={{ marginTop: '24px' }}>
            <button className="btn-secondary" onClick={addManualQuestion}>
              Add Manual Question
            </button>
            <button className="btn-primary" onClick={saveAll} disabled={loading}>
              {loading ? 'Saving...' : 'Approve & Save Everything'}
            </button>
            <button className="btn-danger" onClick={clearBatch}>
              Clear Review List
            </button>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Review Mode & Question Management</h3>

          {batch.map((q, idx) => (
            <div key={q.id} className={`question-card ${q.status.toLowerCase()}`}>
              <div className="question-header">
                <h3>Question {idx + 1}</h3>
                <span className={`status-badge ${q.status.toLowerCase()}`}>{q.status}</span>
              </div>
              
              <div className="question-topic">[{q.subcategory}]</div>
              
              <div className="edit-form">
                {/* Question Section */}
                <div className="section">
                  <h4>Question</h4>
                  <div className="form-group">
                    <label>Question Text</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Question Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, q.id, 'question')}
                    />
                    {q.questionImage && (
                      <div className="image-preview-container">
                        <img
                          src={getImagePreview(q.questionImage)}
                          alt="Question"
                          className="image-preview"
                        />
                        <button type="button" className="btn-remove-image" onClick={() => removeImage(q.id, 'question')}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options Section */}
                <div className="section">
                  <h4>Options</h4>
                  {['a', 'b', 'c', 'd'].map((opt) => (
                    <div key={opt} className="option-row">
                      <div className="option-input-group">
                        <div className="form-group option-text">
                          <label>Option {opt.toUpperCase()}</label>
                          <input
                            value={q.options[opt]}
                            onChange={(e) => updateOption(q.id, opt, e.target.value)}
                          />
                        </div>
                        <div className="form-group option-image">
                          <label>Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, q.id, 'option', opt)}
                          />
                          {q.optionImages?.[opt] && (
                            <div className="image-preview-small">
                              <img
                                src={getImagePreview(q.optionImages[opt])}
                                alt={`Option ${opt.toUpperCase()}`}
                              />
                              <button type="button" className="btn-remove-small" onClick={() => removeImage(q.id, 'option', opt)}>
                                x
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label>Correct Answer</label>
                  <select
                    value={q.correct_answer}
                    onChange={(e) => updateQuestion(q.id, 'correct_answer', e.target.value)}
                  >
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </select>
                </div>

                {/* Explanation Section */}
                <div className="section">
                  <h4>Explanation</h4>
                  <div className="form-group">
                    <label>Explanation Text</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                      rows={4}
                      placeholder="Enter detailed explanation here..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Explanation Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, q.id, 'explanation')}
                    />
                    {q.explanationImage && (
                      <div className="image-preview-container">
                        <img
                          src={getImagePreview(q.explanationImage)}
                          alt="Explanation"
                          className="image-preview"
                        />
                        <button type="button" className="btn-remove-image" onClick={() => removeImage(q.id, 'explanation')}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-primary" onClick={() => setStatus(q.id, 'APPROVED')}>
                  Save & Accept
                </button>
                <button className="btn-danger" onClick={() => setStatus(q.id, 'REJECTED')}>
                  Reject
                </button>
                <button className="btn-danger" onClick={() => deleteQuestion(q.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default AIGenerator;
