import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { detectQuestionType, normalizeOptionKey } from '../components/helpers';
import QuestionForm from '../components/QuestionForm';
import { useModal } from '../components/ModalProvider';

function AIGenerator() {
  const { showAlert } = useModal();
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [destinationMode, setDestinationMode] = useState('curriculum'); // 'curriculum' or 'test'
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  const [pastedContent, setPastedContent] = useState('');
  const [batch, setBatch] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load curriculum
        const currResponse = await api.get('/api/questions/curriculum');
        const currData = currResponse.data || [];
        setCurriculum(currData);

        if (currData.length > 0) {
          const firstUnit = currData[0];
          const firstTopic = firstUnit.topics?.[0];
          const firstSubtopic = firstTopic?.subtopics?.[0];

          setUnitId(firstUnit._id);
          if (firstTopic) setTopicId(firstTopic._id);
          if (firstSubtopic) setSubtopicId(firstSubtopic._id);
        }

        // Load tests
        const testsResponse = await api.get('/api/questions/tests');
        const testsData = testsResponse.data || [];
        setTests(testsData);
        if (testsData.length > 0) {
          setSelectedTestId(testsData[0]._id);
        }
      } catch (error) {
        setCurriculumError('Failed to load curriculum or tests from server.');
        console.error('Data load error:', error);
      } finally {
        setCurriculumLoading(false);
      }
    };

    loadData();
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
    if (destinationMode === 'test') {
      if (!selectedTestId) {
        setQuestionCount(0);
        return;
      }
      const selectedTest = tests.find(t => t._id === selectedTestId);
      if (!selectedTest) {
        setQuestionCount(0);
        return;
      }
      try {
        const response = await api.get(`/api/questions/exam/count?testName=${encodeURIComponent(selectedTest.name)}`);
        setQuestionCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching exam count:', error);
      }
      return;
    }

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
  }, [destinationMode, selectedTestId, tests, topicId, subtopicId]);

  useEffect(() => {
    fetchQuestionCount();
  }, [fetchQuestionCount]);

  const normalizeLine = (value) => {
    return (value || '')
      .normalize('NFC')
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

  const formatSpecialQuestion = (value) => {
    let text = (value || '')
      .normalize('NFC')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();

    if (/match\s+the\s+following/i.test(text)) {
      text = text
        .replace(/match\s+the\s+following[.:]?\s*/i, 'Match the following.\n')
        .replace(/\s*(\/\s*பின்வருவனவற்றைப்\s*பொருத்துக[.:]?)\s*/iu, ' $1\n')
        .replace(/\s+(?=List\s+I{1,2}\b)/gi, '\n')
        .replace(/(List\s+I\b)[.:]?\s*/i, '$1\n')
        .replace(/\s+(?=[A-D]\s*[.)]\s*)/g, '\n');

      const listTwoMatch = text.match(/\bList\s+II\b[.:]?\s*/i);
      if (listTwoMatch) {
        const listTwoStart = listTwoMatch.index;
        const listTwoBodyStart = listTwoStart + listTwoMatch[0].length;
        const beforeListTwo = text.slice(0, listTwoStart).trimEnd();
        let listTwoBody = text.slice(listTwoBodyStart).trim();

        listTwoBody = listTwoBody
          .replace(/\s+(?=(?:[1-4]|[A-D])\s*[.)]\s*)/g, '\n')
          .replace(/([\u0B80-\u0BFF])\s+(?=[A-Za-z])/gu, '$1\n');

        const listTwoItems = listTwoBody
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item, index) => /^(?:[1-4]|[A-D])\s*[.)]/i.test(item)
            ? item
            : `${index + 1}. ${item}`);

        text = `${beforeListTwo}\nList II\n${listTwoItems.join('\n')}`;
      }
    }

    if (/assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(text)) {
      text = text
        .replace(/assertion\s*[–—-]\s*reason(?:\s+questions?)?[.:]?\s*/i, 'Assertion–Reason Questions:\n\n')
        .replace(/\s*(?=Assertion\s*(?:\([Aஅ]\))?\s*:)/gi, '\n')
        .replace(/\s+(?=Reason\s*(?:\([Rக]\))?\s*:)/gi, '\n')
        .replace(/\s*(?=கூற்று\s*(?:\([Aஅ]\))?\s*:)/gu, '\n')
        .replace(/\s+(?=காரணம்\s*(?:\([Rக]\))?\s*:)/gu, '\n');
    }

    const isStatementQuestion =
      /\b(?:consider\s+the\s+following\s+statements?|statements?)\b/i.test(text) ||
      /பின்வரும்\s+கூற்றுகள|கூற்றுகளைக்\s+கவனியுங்கள்/u.test(text);

    if (isStatementQuestion) {
      text = text
        .replace(/\s+(?=\/\s*பின்வரும்\s+கூற்றுகள)/u, '\n\n')
        .replace(/\s+(?=பின்வரும்\s+கூற்றுகள)/u, '\n\n')
        .replace(/\s+(?=[1-9]\d*\s*[.)]\s*(?:[A-Za-z\u0B80-\u0BFF]))/gu, '\n')
        .replace(/\s+(?=Statements?\s*(?:\(?I{1,3}\)?|\(?[1-3]\)?)\s*[:.)-])/gi, '\n')
        .replace(/\s+(?=Statement\s+(?:I{1,3}|[1-3])\b)/gi, '\n');
    }

    return text.replace(/\n{3,}/g, '\n\n').trim();
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

    const questionText = formatSpecialQuestion(compactBlock.slice(0, optionsMatch.index));
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

  const handleQuickExtract = () => {
    if (!pastedContent.trim()) {
      showAlert('Please paste some content first!', { variant: 'warning' });
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

      currentQuestion.question = formatSpecialQuestion(currentQuestion.question);
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
      const isAssertionReasonLine = /^reason\s*\(R\)\s*:/i.test(trimmed);
      if (explanationLabelMatch && !isAssertionReasonLine) {
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
      showAlert(
        'Could not find any questions in the pasted content. Please ensure questions are numbered (e.g., 1. What is...) and options are labeled (a, b, c, d).',
        { variant: 'error', title: 'No Questions Found' }
      );
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
      if (destinationMode === 'test') {
        const selectedTest = tests.find(t => t._id === selectedTestId);
        if (!selectedTest) {
          throw new Error('No test selected');
        }
        const questionData = {
          testId: selectedTest._id,
          testName: selectedTest.name,
          type: detectQuestionType(q.question),
          question: q.question,
          questionImage: q.questionImage,
          options: q.options,
          optionImages: q.optionImages,
          correct_answer: q.correct_answer || 'a',
          explanation: q.explanation,
          explanationImage: q.explanationImage
        };
        await api.post('/api/questions/exam', questionData);
      } else {
        const questionData = {
          unitId,
          topicId,
          subtopicId,
          type: detectQuestionType(q.question),
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
      showAlert('No questions to save!', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      if (destinationMode === 'test') {
        const selectedTest = tests.find(t => t._id === selectedTestId);
        if (!selectedTest) {
          throw new Error('No test selected');
        }
        for (const q of toSave) {
          const questionData = {
            testId: selectedTest._id,
            testName: selectedTest.name,
            type: detectQuestionType(q.question),
            question: q.question,
            questionImage: q.questionImage,
            options: q.options,
            optionImages: q.optionImages,
            correct_answer: q.correct_answer || 'a',
            explanation: q.explanation,
            explanationImage: q.explanationImage
          };
          await api.post('/api/questions/exam', questionData);
        }
      } else {
        for (const q of toSave) {
          const questionData = {
            unitId,
            topicId,
            subtopicId,
            type: detectQuestionType(q.question),
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
    <div className="tab-content extractor-page">
      <div className="extractor-hero">
        <div>
          <h2>Question Extractor</h2>
        </div>
      </div>

      <div className="extractor-setup">
        <div className="extractor-section-heading">
          <span>01</span>
          <div>
            <h3>Choose destination</h3>
          </div>
        </div>

        <div className="destination-toggle" style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '0 8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
            <input
              type="radio"
              name="destinationMode"
              value="curriculum"
              checked={destinationMode === 'curriculum'}
              onChange={() => setDestinationMode('curriculum')}
              style={{ cursor: 'pointer' }}
            />
            Extract to Curriculum
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
            <input
              type="radio"
              name="destinationMode"
              value="test"
              checked={destinationMode === 'test'}
              onChange={() => setDestinationMode('test')}
              style={{ cursor: 'pointer' }}
            />
            Extract to Test
          </label>
        </div>

        {destinationMode === 'curriculum' ? (
          <div className={`form-row ${subtopics.length > 0 ? 'three-col' : 'two-col'}`}>
            <div className="form-group">
              <label>Unit</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Topic</label>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            {subtopics.length > 0 && (
              <div className="form-group">
                <label>Subtopic</label>
                <select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                  {subtopics.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="form-row one-col">
            <div className="form-group">
              <label>Select Test Name</label>
              {tests.length > 0 ? (
                <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
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

      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-title">
            Progress for {destinationMode === 'test'
              ? (tests.find(t => t._id === selectedTestId)?.name || 'Selected Test')
              : (subtopicId
                  ? subtopics.find(st => st._id === subtopicId)?.name
                  : selectedTopic?.name || '')}
          </span>
          <span className={`progress-count ${destinationMode !== 'test' && questionCount >= 25 ? 'complete' : ''}`}>
            {questionCount} {destinationMode === 'test' ? 'questions' : 'of 25 questions'} ready
          </span>
        </div>
        {destinationMode !== 'test' ? (
          <>
            <div className="progress-bar">
              <div
                className={`progress-fill ${questionCount >= 25 ? 'complete' : ''}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {questionCount >= 25 ? (
              <div className="progress-note success">This subtopic is ready to go.</div>
            ) : (
              <div className="progress-note muted">{25 - questionCount} more {25 - questionCount === 1 ? 'question' : 'questions'} to complete this set.</div>
            )}
          </>
        ) : (
          <div className="progress-note success">Questions will be saved into the ExamQuestions collection.</div>
        )}
      </div>

      <div className="extractor-compose">
        <div className="extractor-section-heading">
          <span>02</span>
          <div>
            <h3>Paste source content</h3>
          </div>
        </div>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          rows={3}
          placeholder={"Enter the questions here"}
        />
        <div className="extractor-compose-footer">
          <button
            className="btn-primary extractor-button"
            onClick={handleQuickExtract}
            disabled={loading || !pastedContent.trim()}
          >
            {loading ? 'Processing...' : 'Extract questions'}
          </button>
        </div>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {batch.length > 0 && (
        <>
          <div className="extractor-review-toolbar">
            <div>
              <span className="extractor-eyebrow">Review queue</span>
              <h3>{batch.length} {batch.length === 1 ? 'question' : 'questions'} ready to review</h3>
            </div>
            <div className="action-row">
              <button className="btn-secondary" onClick={addManualQuestion}>+ Add question</button>
              <button className="btn-primary" onClick={saveAll} disabled={loading}>
                {loading ? 'Saving...' : 'Save all'}
              </button>
              <button className="btn-text-danger" onClick={clearBatch}>Clear queue</button>
            </div>
          </div>

          {batch.map((q, idx) => (
            <div key={q.id} className={`question-card ${q.status.toLowerCase()}`}>
              <div className="question-header">
                <div className="question-heading">
                  <span>{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>Question {idx + 1}</h3>
                    <p>{detectQuestionType(q.question)}</p>
                  </div>
                </div>
                <span className={`status-badge ${q.status.toLowerCase()}`}>
                  {q.status}
                </span>
              </div>
              
              <QuestionForm
                question={q}
                onChange={(updatedQ) => {
                  setBatch(batch.map(item => item.id === q.id ? updatedQ : item));
                }}
              />

              <div className="card-actions">
                <button className="btn-primary" onClick={() => setStatus(q.id, 'APPROVED')}>
                  Save & Accept
                </button>
                <button className="btn-danger" onClick={() => setStatus(q.id, 'REJECTED')}>
                  Reject
                </button>
                <button className="btn-text-danger" onClick={() => deleteQuestion(q.id)}>
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
