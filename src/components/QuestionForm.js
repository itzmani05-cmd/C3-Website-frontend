import React from 'react';
import api from '../api';
import { fileToBase64, getImagePreview, normalizeCorrectAnswer } from './helpers';

function QuestionForm({ question, onChange, variant = 'extractor' }) {
  const handleFieldChange = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const handleOptionChange = (opt, value) => {
    onChange({
      ...question,
      options: {
        ...question.options,
        [opt]: value
      }
    });
  };

  const handleImageUpload = async (e, type, opt = null) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64Image = await fileToBase64(file);
      const response = await api.post('/api/questions/upload', { image: base64Image });
      const imageUrl = response.data.imageUrl;

      if (type === 'question') {
        onChange({ ...question, questionImage: imageUrl });
      } else if (type === 'explanation') {
        onChange({ ...question, explanationImage: imageUrl });
      } else if (type === 'option') {
        onChange({
          ...question,
          optionImages: {
            ...question.optionImages,
            [opt]: imageUrl
          }
        });
      }
    } catch (error) {
      alert('Image upload failed: ' + error.message);
    }
  };

  const removeImage = (type, opt = null) => {
    if (type === 'question') {
      onChange({ ...question, questionImage: null });
    } else if (type === 'explanation') {
      onChange({ ...question, explanationImage: null });
    } else if (type === 'option') {
      onChange({
        ...question,
        optionImages: {
          ...question.optionImages,
          [opt]: null
        }
      });
    }
  };

  const isFixer = variant === 'fixer';
  const editFormStyle = isFixer ? { marginTop: 0, border: 0, paddingTop: 0 } : {};
  const sectionStyle = isFixer ? { background: '#fbfdff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' } : {};
  const correctAnswerStyle = isFixer ? { margin: '16px 0' } : {};
  
  return (
    <div className="edit-form" style={editFormStyle}>
      {/* Question Section */}
      <div className="section" style={sectionStyle}>
        <h4>Question</h4>
        <div className="form-group">
          <label>Question Text</label>
          <textarea
            value={question.question || ''}
            onChange={(e) => handleFieldChange('question', e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Question Image (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, 'question')}
          />
          {question.questionImage && (
            <div className="image-preview-container">
              <img
                src={getImagePreview(question.questionImage)}
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
      <div className="section" style={sectionStyle}>
        <h4>Options</h4>
        {['a', 'b', 'c', 'd'].map((opt) => (
          <div key={opt} className="option-row">
            <div className="option-input-group">
              <div className="form-group option-text">
                <label>Option {opt.toUpperCase()}</label>
                <input
                  value={question.options?.[opt] || ''}
                  onChange={(e) => handleOptionChange(opt, e.target.value)}
                  placeholder={isFixer ? `Option ${opt.toUpperCase()} text` : undefined}
                />
              </div>
              <div className="form-group option-image">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'option', opt)}
                />
                {question.optionImages?.[opt] && (
                  <div className="image-preview-small">
                    <img
                      src={getImagePreview(question.optionImages[opt])}
                      alt={`Option ${opt.toUpperCase()}`}
                    />
                    <button type="button" className="btn-remove-small" onClick={() => removeImage('option', opt)}>
                      x
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-group" style={correctAnswerStyle}>
        <label>Correct Answer</label>
        <select
          value={normalizeCorrectAnswer(question.correct_answer)}
          onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
        >
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
          <option value="d">D</option>
        </select>
      </div>

      {/* Explanation Section */}
      <div className="section" style={sectionStyle}>
        <h4>Explanation</h4>
        <div className="form-group">
          <label>Explanation Text</label>
          <textarea
            value={question.explanation || ''}
            onChange={(e) => handleFieldChange('explanation', e.target.value)}
            rows={isFixer ? 3 : 4}
            placeholder={isFixer ? 'Explanation...' : 'Enter detailed explanation here...'}
          />
        </div>
        <div className="form-group">
          <label>Explanation Image (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, 'explanation')}
          />
          {question.explanationImage && (
            <div className="image-preview-container">
              <img
                src={getImagePreview(question.explanationImage)}
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
    </div>
  );
}

export default QuestionForm;
