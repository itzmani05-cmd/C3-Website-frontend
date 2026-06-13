import React, { useState, useEffect } from 'react';
import api from '../api';
import { BACKEND_URL } from '../config';

function PdfDownload() {
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');
  
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');

  const [examTitle, setExamTitle] = useState('C³ - Assessment Test');
  const [examSubtitle, setExamSubtitle] = useState('Duration: 1.5 Hours | Max Marks: 50');
  const [instructions, setInstructions] = useState('1. Attempt all questions.\n2. Each question carries equal marks.');

  const [layoutColumns, setLayoutColumns] = useState('1'); // '1' or '2'
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'
  const [answerDisplay, setAnswerDisplay] = useState('end-key'); // 'none', 'each', 'end-key', 'end-explanations'

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const response = await api.get('/api/questions/curriculum');
        const data = response.data || [];
        setCurriculum(data);
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
    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      setQuestionsError('');
      try {
        const params = {};
        if (unitId && unitId !== 'all') params.unitId = unitId;
        if (topicId && topicId !== 'all') params.topicId = topicId;
        if (subtopicId && subtopicId !== 'all') params.subtopicId = subtopicId;
        
        const response = await api.get('/api/questions', { params });
        let fetchedQuestions = response.data || [];
        
        setQuestions(fetchedQuestions);
        // Automatically select all questions by default
        setSelectedQuestionIds(new Set(fetchedQuestions.map(q => q._id)));
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestionsError('Failed to fetch questions matching the criteria.');
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (!curriculumLoading) {
      fetchQuestions();
    }
  }, [unitId, topicId, subtopicId, curriculumLoading]);

  // Handle unit change
  const handleUnitChange = (e) => {
    const val = e.target.value;
    setUnitId(val);
    setTopicId('all');
    setSubtopicId('all');
  };

  // Handle topic change
  const handleTopicChange = (e) => {
    const val = e.target.value;
    setTopicId(val);
    setSubtopicId('all');
  };

  // Handle checkbox select / deselect
  const toggleQuestionSelection = (id) => {
    const updated = new Set(selectedQuestionIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedQuestionIds(updated);
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(new Set(questions.map(q => q._id)));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestionIds(new Set());
  };

  const getImagePreview = (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (curriculumLoading) {
    return (
      <div className="tab-content">
        <h2>PDF Download Assessment Creator</h2>
        <p>Loading curriculum...</p>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="tab-content">
        <h2>PDF Download Assessment Creator</h2>
        <p className="error-message">{curriculumError}</p>
      </div>
    );
  }

  const selectedUnit = curriculum.find(u => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find(t => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const printableQuestions = questions.filter(q => selectedQuestionIds.has(q._id));

  return (
    <div className="pdf-generator-container">
      {/* Left Side Content */}
      <div className="config-panel no-print">

        <div className="config-section">
          <h3>1. Filter Questions</h3>
          
          <div className="form-group">
            <label>Unit</label>
            <select value={unitId} onChange={handleUnitChange}>
              <option value="all">All Units</option>
              {curriculum.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Topic</label>
              <select 
                value={topicId} 
                onChange={handleTopicChange} 
                disabled={!unitId || unitId === 'all'}
              >
                <option value="all">All Topics</option>
                {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Subtopic</label>
              <select 
                value={subtopicId} 
                onChange={(e) => setSubtopicId(e.target.value)}
                disabled={!topicId || topicId === 'all'}
              >
                <option value="all">All Subtopics</option>
                {subtopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>2. Assessment Details</h3>
          
          <div className="form-group">
            <label>Exam Title</label>
            <input 
              type="text" 
              value={examTitle} 
              onChange={(e) => setExamTitle(e.target.value)} 
              placeholder="e.g. Unit 1 Examination"
            />
          </div>

          <div className="form-group">
            <label>Subtitle / Metadata</label>
            <input 
              type="text" 
              value={examSubtitle} 
              onChange={(e) => setExamSubtitle(e.target.value)} 
              placeholder="e.g. Subject: Strength of Materials | Time: 1 hr"
            />
          </div>

          <div className="form-group">
            <label>General Instructions</label>
            <textarea 
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
              rows={3} 
              placeholder="Enter instructions, one per line..."
            />
          </div>
        </div>

        <div className="config-section">
          <h3>3. PDF Layout Preferences</h3>
          
          <div className="form-group">
            <label>Answers & Explanations</label>
            <select value={answerDisplay} onChange={(e) => setAnswerDisplay(e.target.value)}>
              <option value="none">Exclude Answers (Student Question Paper)</option>
              <option value="each">Show Answer directly under each question</option>
              <option value="end-key">Include Answer Key at the end of PDF</option>
              <option value="end-explanations">Include Answer Key & Explanations at the end</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Columns Layout</label>
              <select value={layoutColumns} onChange={(e) => setLayoutColumns(e.target.value)}>
                <option value="1">1 Column (Standard)</option>
                <option value="2">2 Columns (Compact/Exam Style)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Text Size</label>
              <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <button 
            className="btn-primary btn-print-pdf"
            onClick={handlePrint}
            disabled={printableQuestions.length === 0}
          >
            🖨️ Print assessment / Save as PDF
          </button>
        </div>

        <div className="config-section question-selector-box">
          <div className="selector-header">
            <h3>4. Select Questions ({selectedQuestionIds.size} / {questions.length})</h3>
            <div className="selector-actions">
              <button onClick={selectAllQuestions} className="text-btn">Select All</button>
              <span className="divider">|</span>
              <button onClick={deselectAllQuestions} className="text-btn">Deselect All</button>
            </div>
          </div>
          
          {loadingQuestions ? (
            <p className="loading-text">Loading matching questions...</p>
          ) : questionsError ? (
            <p className="error-text">{questionsError}</p>
          ) : questions.length === 0 ? (
            <p className="empty-text">No questions found matching your filter criteria.</p>
          ) : (
            <div className="questions-select-list">
              {questions.map((q, index) => (
                <label key={q._id} className="question-select-item">
                  <input 
                    type="checkbox" 
                    checked={selectedQuestionIds.has(q._id)}
                    onChange={() => toggleQuestionSelection(q._id)}
                  />
                  <span className="question-select-number">{index + 1}.</span>
                  <span className="question-select-text">{q.question}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Content */}
      <div className={`assessment-preview-panel font-size-${fontSize}`}>
        {printableQuestions.length === 0 ? (
          <div className="no-questions-placeholder">
            <div className="placeholder-icon">📄</div>
            <h4>No questions selected</h4>
            <p>Select filter criteria and check at least one question in the left panel to populate the assessment preview.</p>
          </div>
        ) : (
          <div className="assessment-document">
            <div className="document-header">
              <h1 className="doc-title">{examTitle}</h1>
              <p className="doc-subtitle">{examSubtitle}</p>
              <div className="curriculum-header">
                <p>
                  <strong>
                    {selectedUnit?.name || "All Units"}
                  </strong>

                  {selectedTopic?.name &&
                    topicId !== 'all' &&
                    ` - ${selectedTopic.name}`}

                  {subtopicId !== 'all' &&
                    subtopicId &&
                    subtopics.find(st => st._id === subtopicId)?.name &&
                    ` (${subtopics.find(st => st._id === subtopicId)?.name})`}
                </p>
              </div>
              {instructions && (
                <div className="doc-instructions">
                  <strong>General Instructions:</strong>
                  <ul>
                    {instructions.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Questions Container */}
            <div className={`questions-grid cols-${layoutColumns}`}>
              {printableQuestions.map((q, index) => (
                <div key={q._id} className="doc-question-card">
                  <div className="doc-question-header">
                    <span className="question-number">Q{index + 1}.</span>
                    <div className="question-body">
                      <p className="question-text">{q.question}</p>
                      
                      {q.questionImage && (
                        <div className="doc-image-container">
                          <img 
                            src={getImagePreview(q.questionImage)} 
                            alt={`Question ${index + 1}`} 
                            className="doc-question-image"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="doc-options-grid">
                    {['a', 'b', 'c', 'd'].map(opt => {
                      const hasText = q.options && q.options[opt];
                      const imgUrl = q.optionImages && q.optionImages[opt];
                      
                      if (!hasText && !imgUrl) return null;
                      
                      return (
                        <div key={opt} className="doc-option-item">
                          <span className="option-label">({opt.toUpperCase()})</span>
                          <div className="option-content">
                            {hasText && <span className="option-text">{q.options[opt]}</span>}
                            {imgUrl && (
                              <div className="doc-option-image-container">
                                <img 
                                  src={getImagePreview(imgUrl)} 
                                  alt={`Option ${opt.toUpperCase()}`}
                                  className="doc-option-image"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Answer displayed inline if configured */}
                  {answerDisplay === 'each' && (
                    <div className="doc-inline-answer">
                      <span className="answer-badge">Correct Answer: {q.correct_answer.toUpperCase()}</span>
                      {q.explanation && (
                        <div className="explanation-text-box">
                          <strong>Explanation:</strong> {q.explanation}
                          {q.explanationImage && (
                            <div className="doc-explanation-image-container">
                              <img 
                                src={getImagePreview(q.explanationImage)} 
                                alt="Explanation"
                                className="doc-explanation-image"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Answer Key at the end */}
            {answerDisplay === 'end-key' && (
              <div className="document-answer-key page-break-before">
                <h2 className="section-title">Answer Key</h2>
                <div className="compact-key-table">
                  {printableQuestions.map((q, index) => (
                    <div key={q._id} className="key-table-cell">
                      <span className="cell-q">Q{index + 1}</span>
                      <span className="cell-ans">{q.correct_answer.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Key + Explanations at the end */}
            {answerDisplay === 'end-explanations' && (
              <div className="document-explanations-key page-break-before">
                <h2 className="section-title">Answers & Detailed Explanations</h2>
                <div className="explanations-list">
                  {printableQuestions.map((q, index) => (
                    <div key={q._id} className="explanation-detail-item">
                      <h4>
                        Q{index + 1}. Correct Answer: <span className="ans-highlight">{q.correct_answer.toUpperCase()}</span>
                      </h4>
                      <p className="original-q-text"><em>Question: {q.question}</em></p>
                      {q.explanation ? (
                        <div className="ex-content">
                          <strong>Explanation:</strong> {q.explanation}
                          {q.explanationImage && (
                            <div className="doc-explanation-image-container">
                              <img 
                                src={getImagePreview(q.explanationImage)} 
                                alt={`Explanation ${index + 1}`}
                                className="doc-explanation-image"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="no-explanation">No explanation provided for this question.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfDownload;
