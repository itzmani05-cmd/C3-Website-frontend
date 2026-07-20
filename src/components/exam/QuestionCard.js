import React from 'react';
import { LeftOutlined, RightOutlined, ClearOutlined } from '@ant-design/icons';
import QuestionRenderer from '../QuestionRenderer';

function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onSelectOption,
  onClearSelection,
  onPrev,
  onNext,
}) {
  if (!question) {
    return (
      <div className="exam-error-container" style={{ height: 'auto', background: 'transparent' }}>
        <div className="error-card">
          <h2>No Questions Available</h2>
          <p>No questions have been configured or published for this exam session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="question-number">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span className="question-type-tag">{question.type}</span>
      </div>

      <QuestionRenderer question={question} />

      {question.questionImage && (
        <div className="question-media-container">
          <img
            src={question.questionImage}
            alt={`Question ${questionIndex + 1}`}
            className="question-media"
          />
        </div>
      )}
      <div className="options-list">
        {Object.entries(question.options || {}).map(([key, text]) => {
          const isSelected  = selectedAnswer === key;
          const optionImage = question.optionImages?.[key];

          return (
            <div
              key={key}
              className={`option-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectOption(question._id, key)}
            >
              <div className="option-marker">{key.toUpperCase()}</div>
              <div className="option-content">
                {text}
                {optionImage && (
                  <img src={optionImage} alt={`Option ${key}`} className="option-media" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="question-footer-nav">
        <button
          className="nav-btn-action"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          disabled={questionIndex === 0}
          onClick={onPrev}
        >
          <LeftOutlined /> Previous
        </button>

        {selectedAnswer && (
          <button
            className="nav-btn-action clear-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => onClearSelection(question._id)}
          >
            <ClearOutlined /> Clear Answer
          </button>
        )}

        <button
          className="nav-btn-action primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          disabled={questionIndex === totalQuestions - 1}
          onClick={onNext}
        >
          Next Question <RightOutlined />
        </button>
      </div>
    </div>
  );
}

export default QuestionCard;
