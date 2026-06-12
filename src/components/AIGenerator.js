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

  const normalizeLine = (value) => {
    return (value || '')
      .normalize('NFKC')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const appendText = (existing, addition) => {
    const base = normalizeLine(existing);
    const extra = normalizeLine(addition);
    if (!base) return extra;
    if (!extra) return base;
    return `${base} ${extra}`.replace(/\s+/g, ' ').trim();
  };

  const OPTION_TOKEN_MAP = {
    a: 'a',
    b: 'b',
    c: 'c',
    d: 'd',
    1: 'a',
    2: 'b',
    3: 'c',
    4: 'd',
    'அ': 'a',
    'ஆ': 'b',
    'இ': 'c',
    'ஈ': 'd'
  };


  const normalizeOptionKey = (value) => {
    if (value === null || value === undefined) return null;
    const token = normalizeLine(value).replace(/[()[\].:]/g, '').toLowerCase();
    if (!token) return null;
    return OPTION_TOKEN_MAP[token] || null;
  };

  const extractOptionKeyFromText = (value) => {
    const text = normalizeLine(value);
    if (!text) return null;

    const directMatch = text.match(/^(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))[).:]*\s*/iu);
    if (directMatch) {
      return normalizeOptionKey(directMatch[1] || directMatch[2] || directMatch[3]);
    }

    const labeledMatch = text.match(
      /^(?:answer|ans|correct answer|correct option|option|பதில்|சரியான பதில்|விடை)\s*[:–—-]?\s*(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))/iu
    );
    if (labeledMatch) {
      return normalizeOptionKey(labeledMatch[1] || labeledMatch[2] || labeledMatch[3]);
    }

    const standaloneMatch = text.match(/\b([a-d])\b/i);
    if (standaloneMatch) {
      return standaloneMatch[1].toLowerCase();
    }

    return null;
  };

  const QUESTION_START_REGEX = /^(?:(?:question|q|கேள்வி)\s*\d+\s*[:.)–—-]\s*|\d+\s*[:.)–—-]\s*)/iu;
  const ANSWER_LABEL_REGEX = /^(?:answer|ans|correct answer|correct option|பதில்|சரியான பதில்|விடை)\s*[:–—-]\s*/iu;
  const EXPLANATION_LABEL_REGEX = /^(?:explanation|reason|detailed explanation|விளக்கம்|காரணம்)\s*[:–—-]\s*/iu;
  const OPTIONS_LABEL_REGEX = /^(?:options?|choices?|answer choices?|விருப்பங்கள்|தேர்வுகள்)\s*[:–—-]?\s*/iu;
  const STRICT_OPTION_MARKER_REGEX = /(?:^|[\s/|•·-])(\([a-dA-D1-4அஆஇஈ]\)|\([a-dA-D1-4அஆஇஈ]\)|\([1-4]\))\s*/gu;
  const LOOSE_OPTION_MARKER_REGEX = /(?:^|[\s/|•·-])([a-dA-D1-4அஆஇஈ])[).:]\s*/gu;

  const parseInlineOptions = (text) => {
    const optionsText = text.replace(OPTIONS_LABEL_REGEX, '');
    const strictMatches = [...optionsText.matchAll(STRICT_OPTION_MARKER_REGEX)];
    const looseMatches = strictMatches.length > 0 ? [] : [...optionsText.matchAll(LOOSE_OPTION_MARKER_REGEX)];
    const matches = strictMatches.length > 0 ? strictMatches : looseMatches;

    return matches.map((tokenMatch, tokenIndex, allMatches) => {
      const rawToken = tokenMatch[1];
      const key = normalizeOptionKey(rawToken);
      if (!key) return null;

      const valueStart = tokenMatch.index + tokenMatch[0].length;
      const nextToken = allMatches[tokenIndex + 1];
      const valueEnd = nextToken ? nextToken.index : optionsText.length;
      return {
        key,
        text: optionsText.slice(valueStart, valueEnd)
      };
    }).filter(Boolean);
  };

  const splitQuestionBlocks = (text) => {
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const questionStartPattern = /(?:^|\n)\s*(?:(?:question|q|கேள்வி)\s*\d+|\d+)\s*[:.)–—-]\s*/giu;
    const matches = [...normalizedText.matchAll(questionStartPattern)];

    if (matches.length === 0) return [];

    return matches.map((match, index) => {
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? normalizedText.length;
      return normalizedText.slice(start, end).trim();
    }).filter(Boolean);
  };

  const parseQuestionBlock = (block, idx) => {
    const compactBlock = normalizeLine(block);
    if (!compactBlock) return null;

    const optionsMatch = compactBlock.match(/\b(?:options?|choices?|answer choices?|விருப்பங்கள்|தேர்வுகள்)\s*[:–—-]?\s*/iu);
    const answerMatch = compactBlock.match(/\b(?:correct answer|answer|ans|correct option|பதில்|சரியான பதில்|விடை)\s*[:–—-]\s*/iu);
    const explanationMatch = compactBlock.match(/\b(?:detailed explanation|explanation|reason|விளக்கம்|காரணம்)\s*[:–—-]\s*/iu);

    if (!optionsMatch) return null;

    const questionText = compactBlock.slice(0, optionsMatch.index).trim();
    const optionsStart = optionsMatch.index + optionsMatch[0].length;
    const optionsEnd = [answerMatch?.index, explanationMatch?.index, compactBlock.length]
      .filter((value) => typeof value === 'number' && value >= optionsStart)
      .sort((a, b) => a - b)[0];
    const optionsText = compactBlock.slice(optionsStart, optionsEnd).trim();

    const options = { a: '', b: '', c: '', d: '' };
    parseInlineOptions(`Options: ${optionsText}`).forEach((token) => {
      options[token.key] = appendText(options[token.key], token.text);
    });

    let correctAnswer = 'a';
    if (answerMatch) {
      const answerStart = answerMatch.index + answerMatch[0].length;
      const answerEnd = explanationMatch && explanationMatch.index > answerStart
        ? explanationMatch.index
        : compactBlock.length;
      correctAnswer = extractOptionKeyFromText(compactBlock.slice(answerStart, answerEnd)) || 'a';
    }

    const explanation = explanationMatch
      ? compactBlock.slice(explanationMatch.index + explanationMatch[0].length).trim()
      : '';

    if (!questionText || Object.values(options).filter(Boolean).length < 2) return null;

    return {
      id: Date.now() + idx,
      question: questionText,
      options,
      correct_answer: correctAnswer,
      explanation,
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory: subtopicId || topicId
    };
  };

  const normalizeCorrectAnswer = (val) => {
    if (val === null || val === undefined) return 'a';
    if (typeof val === 'number') return ['a', 'b', 'c', 'd'][val] || 'a';
    
    const str = normalizeLine(val).toLowerCase();
    
    // If it's a numeric string like "0", "1", "2", "3"
    if (/^\d+$/.test(str)) {
      return ['a', 'b', 'c', 'd'][parseInt(str)] || 'a';
    }
    
    const directMatch = str.match(/^(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))/iu);
    if (directMatch) {
      return normalizeOptionKey(directMatch[1] || directMatch[2] || directMatch[3]) || 'a';
    }

    const labeledMatch = str.match(
      /^(?:answer|ans|correct answer|correct option|option|பதில்|சரியான பதில்|விடை)\s*[:\-–—]?\s*(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))/iu
    );
    if (labeledMatch) {
      return normalizeOptionKey(labeledMatch[1] || labeledMatch[2] || labeledMatch[3]) || 'a';
    }
    
    // If it's something like "Option C", "Ans: B", "(a)", "a)"
    const match = str.match(/\b([a-d])\b/i);
    if (match) {
      return match[0];
    }
    
    return 'a';
  };

  const handleQuickExtract = () => {
    if (!pastedContent.trim()) {
      alert('Please paste some content first!');
      return;
    }

    const blockQuestions = splitQuestionBlocks(pastedContent)
      .map(parseQuestionBlock)
      .filter(Boolean);

    if (blockQuestions.length > 0) {
      setBatch([...batch, ...blockQuestions]);
      setPastedContent('');
      setMessage(`Extracted ${blockQuestions.length} questions!`);
      return;
    }

    const questions = [];
    const lines = pastedContent.split('\n');
    let currentQuestion = null;
    let currentSection = null;
    let currentOptionKey = null;

    const finalizeQuestion = () => {
      if (!currentQuestion) return;

      currentQuestion.question = normalizeLine(currentQuestion.question);
      currentQuestion.explanation = normalizeLine(currentQuestion.explanation);
      currentQuestion.options = {
        a: normalizeLine(currentQuestion.options.a),
        b: normalizeLine(currentQuestion.options.b),
        c: normalizeLine(currentQuestion.options.c),
        d: normalizeLine(currentQuestion.options.d)
      };

      if (currentQuestion.question) {
        questions.push(currentQuestion);
      }
    };

    const startQuestion = (questionText, idx) => {
      finalizeQuestion();
      currentQuestion = {
        id: Date.now() + idx,
        question: normalizeLine(questionText),
        options: { a: '', b: '', c: '', d: '' },
        correct_answer: 'a',
        explanation: '',
        status: 'PENDING',
        optionImages: { a: null, b: null, c: null, d: null },
        questionImage: null,
        explanationImage: null,
        subcategory: subtopicId || topicId
      };
      currentSection = 'question';
      currentOptionKey = null;
    };

    lines.forEach((line, idx) => {
      const trimmed = normalizeLine(line);
      if (!trimmed && !currentQuestion) return;

      // Detect question start: "1. ", "1) ", "Q1: ", "Question 1: ", "கேள்வி 1: "
      const qMatch = trimmed.match(QUESTION_START_REGEX);
      if (qMatch) {
        startQuestion(trimmed.slice(qMatch[0].length), idx);
        return;
      }

      if (!currentQuestion) {
        const fallbackQuestionLike = trimmed.match(
          /^(?:what|which|who|whom|whose|why|how|when|where|explain|describe|define|discuss|compare|prove|show|list|name|mention|state|write|calculate|derive|கேள்வி|என்ன|எப்படி|ஏன்|விளக்குக|வரையறு|விவரி)\b/i
        );

        if (fallbackQuestionLike) {
          startQuestion(trimmed, idx);
        } else {
          return;
        }
      }

      const hasOptionsLabel = OPTIONS_LABEL_REGEX.test(trimmed);
      if (hasOptionsLabel) {
        currentSection = 'options';
        currentOptionKey = null;
      }

      const answerLabelMatch = trimmed.match(ANSWER_LABEL_REGEX);
      if (answerLabelMatch) {
        const answerValue = trimmed.slice(answerLabelMatch[0].length);
        const parsedAnswer = extractOptionKeyFromText(answerValue);
        if (parsedAnswer) {
          currentQuestion.correct_answer = parsedAnswer;
        }
        currentSection = 'answer';
        currentOptionKey = null;
        return;
      }

      const explanationLabelMatch = trimmed.match(EXPLANATION_LABEL_REGEX);
      if (explanationLabelMatch) {
        currentQuestion.explanation = appendText(
          currentQuestion.explanation,
          trimmed.slice(explanationLabelMatch[0].length)
        );
        currentSection = 'explanation';
        currentOptionKey = null;
        return;
      }

      const optionTokens = parseInlineOptions(trimmed);
      if (optionTokens.length > 0) {
        optionTokens.forEach((token) => {
          currentQuestion.options[token.key] = appendText(currentQuestion.options[token.key], token.text);
          currentOptionKey = token.key;
        });
        currentSection = 'options';
        return;
      }

      if (hasOptionsLabel) {
        return;
      }

      if (trimmed) {
        if (currentSection === 'question' || (!currentQuestion.options.a && !currentQuestion.options.b && !currentQuestion.options.c && !currentQuestion.options.d && currentSection !== 'explanation')) {
          currentQuestion.question = appendText(currentQuestion.question, trimmed);
        } else if (currentSection === 'explanation') {
          currentQuestion.explanation = appendText(currentQuestion.explanation, trimmed);
        } else if (currentSection === 'options' && currentOptionKey) {
          currentQuestion.options[currentOptionKey] = appendText(currentQuestion.options[currentOptionKey], trimmed);
        } else if (!currentQuestion.explanation && currentQuestion.options.d) {
          currentQuestion.explanation = appendText(currentQuestion.explanation, trimmed);
        }
      }
    });

    finalizeQuestion();

    if (questions.length === 0) {
      alert('Could not find any questions in the pasted content. Please ensure questions are numbered (e.g., 1. What is...) and options are labeled (a, b, c, d).');
      return;
    }

    setBatch([...batch, ...questions]);
    setPastedContent('');
    setMessage(`Extracted ${questions.length} questions!`);
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
      const questionData = {
        unitId,
        topicId,
        subtopicId,
        type: 'Theory-based MCQ',
        question: q.question,
        questionImage: q.questionImage,
        options: q.options,
        optionImages: q.optionImages,
        correct_answer: q.correct_answer || 'a',
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
          correct_answer: q.correct_answer || 'a',
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
          <div className="progress-note success">Subtopic Complete!</div>
        ) : (
          <div className="progress-note muted">Add {25 - questionCount} more to unlock for students.</div>
        )}
      </div>

      <div className="form-group">
        <label>Paste Questions</label>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          rows={10}
          placeholder={`Paste your questions here...`}
        />
      </div>

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleQuickExtract}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Extract'}
        </button>
      </div>


      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {batch.length > 0 && (
        <>
          <div className="action-row">
            <button className="btn-secondary" onClick={addManualQuestion}>
              Add Question
            </button>
            <button className="btn-primary" onClick={saveAll} disabled={loading}>
              {loading ? 'Saving...' : 'Save Everything'}
            </button>
            <button className="btn-danger" onClick={clearBatch}>
              Clear List
            </button>
          </div>

          <h3 className="review-section-title">Review Mode & Question Management</h3>

          {batch.map((q, idx) => (
            <div key={q.id} className={`question-card ${q.status.toLowerCase()}`}>
              <div className="question-header">
                <h3>Question {idx + 1}</h3>
                <span className={`status-badge ${q.status.toLowerCase()}`}>
                  {q.status}
                </span>
              </div>
              
              
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
                    value={normalizeCorrectAnswer(q.correct_answer)}
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
