import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AddQuestion() {
  const [curriculum, setCurriculum] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState('');

  const [type, setType] = useState('Theory-based MCQ');
  const [question, setQuestion] = useState('');
  const [questionImage, setQuestionImage] = useState(null);
  const [options, setOptions] = useState({ a: '', b: '', c: '', d: '' });
  const [optionImages, setOptionImages] = useState({ a: null, b: null, c: null, d: null });
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [explanationImage, setExplanationImage] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const response = await axios.get('/api/questions/curriculum');
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

  if (curriculumLoading) {
    return (
      <div className="tab-content">
        <h2>Add Question</h2>
        <p>Loading curriculum...</p>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="tab-content">
        <h2>Add Question</h2>
        <p className="error-message">{curriculumError}</p>
      </div>
    );
  }

  // Get units from curriculum
  const units = curriculum;

  // Get topics for selected unit
  const selectedUnit = units.find(u => u._id === unitId);
  const topics = selectedUnit ? selectedUnit.topics : [];

  // Get subtopics for selected topic
  const selectedTopic = topics.find(t => t._id === topicId);
  const subtopics = selectedTopic ? selectedTopic.subtopics : [];

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Convert to base64
      const base64Image = await fileToBase64(file);

      // Send to backend
      const response = await axios.post('/api/questions/upload', {
        image: base64Image
      });
      const imageUrl = response.data.imageUrl;

      if (type === 'question') {
        setQuestionImage(imageUrl);
      } else if (type === 'explanation') {
        setExplanationImage(imageUrl);
      } else if (['a', 'b', 'c', 'd'].includes(type)) {
        setOptionImages(prev => ({ ...prev, [type]: imageUrl }));
      }
    } catch (error) {
      alert('Image upload failed: ' + error.message);
    }
  };

  const removeImage = (type) => {
    if (type === 'question') {
      setQuestionImage(null);
    } else if (type === 'explanation') {
      setExplanationImage(null);
    } else if (['a', 'b', 'c', 'd'].includes(type)) {
      setOptionImages(prev => ({ ...prev, [type]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post('/api/questions', {
        unitId,
        topicId,
        subtopicId,
        type,
        question,
        questionImage,
        options,
        optionImages,
        correctAnswer,
        explanation,
        explanationImage,
        is_published: isPublished,
        status: 'pending'
      });

      setMessage('Question saved successfully!');
      // Reset form
      setQuestion('');
      setQuestionImage(null);
      setOptions({ a: '', b: '', c: '', d: '' });
      setOptionImages({ a: null, b: null, c: null, d: null });
      setCorrectAnswer(0);
      setType('Theory-based MCQ');
      setExplanation('');
      setExplanationImage(null);
    } catch (error) {
      setMessage('Error saving question: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getImagePreview = (imageUrl) => {
    if (!imageUrl) return null;
    // If it's already a base64 data URL, return as-is
    if (imageUrl.startsWith('data:')) return imageUrl;
    // If it's a URL, return as-is
    if (imageUrl.startsWith('http')) return imageUrl;
    // Otherwise assume it's a relative path (legacy)
    return `http://localhost:5000${imageUrl}`;
  };

  return (
    <div className="tab-content">
      <h2>Add Question</h2>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Hierarchy Selection */}
        <div className="hierarchy-section">
          <h3>Category Hierarchy</h3>
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
        </div>

        <div className="form-group">
          <label>Question Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Theory-based MCQ</option>
            <option>Numerical/Problem-based</option>
            <option>Assertion-Reason</option>
            <option>Match the Following</option>
            <option>Statement type (True/False)</option>
            <option>Diagram-based</option>
          </select>
        </div>

        {/* Question Section */}
        <div className="section">
          <h3>Question</h3>
          <div className="form-group">
            <label>Question Text</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              required
              placeholder="Enter the question text here..."
            />
          </div>

          <div className="form-group">
            <label>Question Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'question')}
            />
            {questionImage && (
              <div className="image-preview-container">
                <img
                  src={getImagePreview(questionImage)}
                  alt="Question"
                  className="image-preview"
                />
                <button type="button" className="btn-remove-image" onClick={() => removeImage('question')}>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Options Section */}
        <div className="section">
          <h3>Options</h3>
          {['a', 'b', 'c', 'd'].map((opt, idx) => (
            <div key={opt} className="option-row">
              <div className="option-input-group">
                <div className="form-group option-text">
                  <label>Option {opt.toUpperCase()}</label>
                  <input
                    value={options[opt]}
                    onChange={(e) => handleOptionChange(opt, e.target.value)}
                    required
                    placeholder={`Enter option ${opt.toUpperCase()}`}
                  />
                </div>
                <div className="form-group option-image">
                  <label>Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, opt)}
                  />
                  {optionImages[opt] && (
                    <div className="image-preview-small">
                      <img
                        src={getImagePreview(optionImages[opt])}
                        alt={`Option ${opt.toUpperCase()}`}
                      />
                      <button type="button" className="btn-remove-small" onClick={() => removeImage(opt)}>
                        x
                      </button>
                    </div>
                  )}
                </div>
                <div className="correct-answer-radio">
                  <input
                    type="radio"
                    name="correctAnswer"
                    id={`correct-${opt}`}
                    checked={correctAnswer === idx}
                    onChange={() => setCorrectAnswer(idx)}
                  />
                  <label htmlFor={`correct-${opt}`}>Correct</label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Explanation Section */}
        <div className="section">
          <h3>Explanation</h3>
          <div className="form-group">
            <label>Explanation Text</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              placeholder="Enter the detailed explanation here..."
            />
          </div>

          <div className="form-group">
            <label>Explanation Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'explanation')}
            />
            {explanationImage && (
              <div className="image-preview-container">
                <img
                  src={getImagePreview(explanationImage)}
                  alt="Explanation"
                  className="image-preview"
                />
                <button type="button" className="btn-remove-image" onClick={() => removeImage('explanation')}>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Publish to Student Portal
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Question'}
        </button>
      </form>
    </div>
  );
}

export default AddQuestion;
