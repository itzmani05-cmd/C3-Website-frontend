import React, { useState, useEffect } from 'react';
import api from '../api';
import { BACKEND_URL } from '../config';

// Parser for Match the Following questions
const parseMatchTheFollowing = (text) => {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let prompt = '';
  let listI = [];
  let listII = [];
  let stage = 'prompt';

  for (let line of lines) {
    const isListIHeader = /^list\s*I\b/i.test(line) && !/list\s*II\b/i.test(line);
    const isListIIHeader = /^list\s*II\b/i.test(line);

    if (isListIHeader) {
      stage = 'listI';
      continue;
    } else if (isListIIHeader) {
      stage = 'listII';
      continue;
    }

    if (stage === 'prompt') {
      prompt += (prompt ? '\n' : '') + line;
    } else if (stage === 'listI') {
      listI.push(line);
    } else if (stage === 'listII') {
      listII.push(line);
    }
  }

  if (listI.length === 0 || listII.length === 0) {
    return null;
  }

  return { prompt, listI, listII };
};

// Parser for Assertion-Reason questions
const parseAssertionReason = (text) => {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let header = '';
  let assertion = '';
  let reason = '';
  
  for (let line of lines) {
    const isAssertion = /^(?:assertion\s*\(A\)|assertion|கூற்று\s*(?:\([Aஅ]\))?)\s*:/i.test(line);
    const isReason = /^(?:reason\s*\(R\)|reason|காரணம்\s*(?:\([Rக]\))?)\s*:/i.test(line);

    if (isAssertion) {
      assertion = line;
    } else if (isReason) {
      reason = line;
    } else {
      if (!assertion && !reason) {
        header += (header ? '\n' : '') + line;
      } else if (assertion && !reason) {
        assertion += '\n' + line;
      } else if (reason) {
        reason += '\n' + line;
      }
    }
  }

  if (!assertion || !reason) {
    return null;
  }

  return { header, assertion, reason };
};

// Formatted renderer for special questions
const renderQuestionText = (q) => {
  const isMatch = q.type === 'Match the Following' || /match\s+the\s+following/i.test(q.question);
  const isAR = q.type === 'Assertion-Reason' || /assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(q.question);

  if (isMatch) {
    const parsed = parseMatchTheFollowing(q.question);
    if (parsed) {
      return (
        <div className="matching-question-render">
          <p className="question-text" style={{ whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{parsed.prompt}</p>
          <table className="matching-columns-table">
            <tbody>
              <tr>
                <td>
                  <div className="matching-column-header-inline">List I</div>
                  {parsed.listI.map((item, idx) => (
                    <div key={idx} className="matching-item">{item}</div>
                  ))}
                </td>
                <td>
                  <div className="matching-column-header-inline">List II</div>
                  {parsed.listII.map((item, idx) => (
                    <div key={idx} className="matching-item">{item}</div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }

  if (isAR) {
    const parsed = parseAssertionReason(q.question);
    if (parsed) {
      return (
        <div className="assertion-reason-question-render">
          {parsed.header && <p className="question-text" style={{ whiteSpace: 'pre-wrap', marginBottom: '6px' }}>{parsed.header}</p>}
          <div className="ar-container-inline">
            <div className="ar-line-item">{parsed.assertion}</div>
            <div className="ar-line-item">{parsed.reason}</div>
          </div>
        </div>
      );
    }
  }

  return <p className="question-text" style={{ whiteSpace: 'pre-wrap' }}>{q.question}</p>;
};

// Render Answer Key as a table chunked into rows of 10 for MS Word/print compatibility
const renderAnswerKeyTable = (questionsList) => {
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < questionsList.length; i += chunkSize) {
    chunks.push(questionsList.slice(i, i + chunkSize));
  }

  return (
    <div className="answer-key-tables-container">
      {chunks.map((chunk, chunkIdx) => (
        <table key={chunkIdx} className="doc-answer-key-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {chunk.map((q, idx) => (
                <th key={q._id} style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '12px' }}>
                  Q{chunkIdx * chunkSize + idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {chunk.map((q) => (
                <td key={q._id} style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  {q.correct_answer.toUpperCase()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  );
};

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

  const exportToWord = () => {
    const documentElement = document.querySelector('.assessment-document');
    if (!documentElement) return;

    let htmlContent = documentElement.innerHTML;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${examTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
            margin: 1in;
          }
          h1, h2, h3, h4 {
            font-family: 'Times New Roman', Times, serif;
            margin: 0;
            padding: 0;
          }
          .document-header {
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 3px double #000000;
            padding-bottom: 12px;
          }
          .doc-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .doc-subtitle {
            font-size: 11pt;
            font-style: italic;
            margin-bottom: 12px;
          }
          .curriculum-header {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 12px;
          }
          .doc-instructions {
            text-align: left;
            border: 1px solid #000000;
            padding: 10px;
            margin-top: 12px;
            margin-bottom: 20px;
          }
          .doc-instructions ul {
            margin-top: 4px;
            margin-left: 20px;
            padding-left: 0;
          }
          .questions-grid {
            display: table;
            width: 100%;
          }
          .doc-question-card {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .doc-question-header {
            margin-bottom: 6px;
          }
          .question-number {
            font-weight: bold;
            margin-right: 6px;
          }
          .question-text {
            font-weight: normal;
          }
          .doc-options-grid {
            margin-left: 24px;
            margin-bottom: 12px;
          }
          .doc-option-item {
            margin-bottom: 4px;
          }
          .option-label {
            font-weight: bold;
            margin-right: 6px;
          }
          .doc-inline-answer {
            margin-top: 8px;
            margin-left: 24px;
            border-left: 3px solid #059669;
            padding-left: 10px;
            color: #059669;
          }
          .answer-badge {
            font-weight: bold;
          }
          .explanation-text-box {
            color: #4b5563;
            font-size: 10pt;
          }
          .document-answer-key {
            margin-top: 30px;
            border-top: 2px solid #000000;
            padding-top: 15px;
            page-break-before: always;
          }
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .compact-key-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .compact-key-table td {
            border: 1px solid #000000;
            padding: 6px;
            text-align: center;
          }
          .document-explanations-key {
            margin-top: 30px;
            border-top: 2px solid #000000;
            padding-top: 15px;
            page-break-before: always;
          }
          .explanation-detail-item {
            border-bottom: 1px dashed #cccccc;
            padding-bottom: 12px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .matching-columns-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-top: 8px;
            margin-bottom: 12px;
          }
          .matching-columns-table td {
            border: none;
            padding: 4px 12px 4px 0;
            vertical-align: top;
            width: 50%;
          }
          .matching-column-header-inline {
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 6px;
          }
          .ar-container-inline {
            margin-left: 26px;
            margin-top: 6px;
            margin-bottom: 12px;
          }
          .ar-line-item {
            margin: 4px 0;
            font-weight: 500;
            line-height: 1.45;
          }
        </style>
      </head>
      <body>
    `;
    const footer = '</body></html>';

    const source = header + htmlContent + footer;
    const blob = new Blob(['\ufeff' + source], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_assessment.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (curriculumLoading) {
    return (
      <div className="tab-content extractor-page">
        <div className="extractor-hero">
          <div>
            <h2>Assessment Generator</h2>
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
            <h2>Assessment Generator</h2>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <p className="error-message">{curriculumError}</p>
        </div>
      </div>
    );
  }

  const selectedUnit = curriculum.find(u => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];
  const selectedTopic = topics.find(t => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const printableQuestions = questions.filter(q => selectedQuestionIds.has(q._id));

  return (
    <div className="tab-content extractor-page pdf-generator-page" style={{ padding: 0 }}>
      <div className="extractor-hero">
        <div>
          <h2>Assessment Generator</h2>
        </div>
      </div>

      <div className="pdf-generator-container" style={{ padding: '24px 28px' }}>
        {/* Left Side Content */}
        <div className="config-panel no-print">

          <div className="config-section" style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)', marginBottom: '20px' }}>
            <div className="extractor-section-heading" style={{ marginBottom: '16px' }}>
              <span>01</span>
              <div>
                <h3 style={{ margin: 0 }}>Filter Questions</h3>
              </div>
            </div>
            
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

          <div className="config-section" style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)', marginBottom: '20px' }}>
            <div className="extractor-section-heading" style={{ marginBottom: '16px' }}>
              <span>02</span>
              <div>
                <h3 style={{ margin: 0 }}>Assessment Details</h3>
              </div>
            </div>
            
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

          <div className="config-section" style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)', marginBottom: '20px' }}>
            <div className="extractor-section-heading" style={{ marginBottom: '16px' }}>
              <span>03</span>
              <div>
                <h3 style={{ margin: 0 }}>Layout Preferences</h3>
              </div>
            </div>
            
            <div className="form-group">
              <label>Answers & Explanations</label>
              <select value={answerDisplay} onChange={(e) => setAnswerDisplay(e.target.value)}>
                <option value="none">Exclude Answers (Student Question Paper)</option>
                <option value="each">Show Answer directly under each question</option>
                <option value="end-key">Include Answer Key at the end of PDF</option>
                <option value="end-explanations">Include Answer Key & Explanations at the end</option>
              </select>
            </div>

            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Columns Layout</label>
                <select value={layoutColumns} onChange={(e) => setLayoutColumns(e.target.value)}>
                  <option value="1">1 Column (Standard)</option>
                  <option value="2">2 Columns (Compact/Exam Style)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Text Size</label>
                <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            <div className="download-buttons-row" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button 
                className="btn-primary btn-print-pdf"
                onClick={handlePrint}
                disabled={printableQuestions.length === 0}
                style={{ flex: 1, margin: 0 }}
              >
               Export as PDF
              </button>
              <button 
                className="btn-secondary"
                onClick={exportToWord}
                disabled={printableQuestions.length === 0}
                style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', fontSize: '15px' }}
              >
                Export as Word
              </button>
            </div>
          </div>

          <div className="config-section question-selector-box" style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)' }}>
            <div className="extractor-section-heading" style={{ marginBottom: '16px' }}>
              <span>04</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>Select Questions</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
                  Selected {selectedQuestionIds.size} of {questions.length} questions
                </p>
              </div>
            </div>
            
            <div className="selector-actions" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <button onClick={selectAllQuestions} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '10px' }}>Select All</button>
              <button onClick={deselectAllQuestions} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '10px' }}>Deselect All</button>
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
        <div className={`assessment-preview-panel font-size-${fontSize}`} style={{ border: 0, borderRadius: '20px', background: '#ffffff', boxShadow: '0 8px 28px rgba(30, 41, 59, 0.055)', padding: '24px' }}>
          <div className="preview-header no-print" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: '800' }}>Question Paper Preview</h3>
            </div>
            <div className="preview-badge" style={{ padding: '5px 12px', borderRadius: '999px', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '12px', fontWeight: '700' }}>
              {printableQuestions.length} {printableQuestions.length === 1 ? 'Question' : 'Questions'}
            </div>
          </div>

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
                        {renderQuestionText(q)}
                        
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
                  {renderAnswerKeyTable(printableQuestions)}
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
                        <div className="original-q-text" style={{ whiteSpace: 'pre-wrap', color: '#4b5563', marginBottom: '8px', fontSize: '0.9em' }}>
                          <em>Question:</em> {renderQuestionText(q)}
                        </div>
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
    </div>
  );
}

export default PdfDownload;
