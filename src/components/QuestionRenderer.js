import React from 'react';

// Strips an accidental leading list marker (e.g. "1.", "A.") from a bracketed
// column subtitle like "1. (Key Characteristic)" -> "(Key Characteristic)".
// Real list items (e.g. "1. Calcination of Kaolinite clay") aren't fully
// parenthesized, so they're left untouched.
const cleanListLine = (line) => {
  const match = line.match(/^[A-Za-z0-9]+[.)]\s*(\(.+\))$/);
  return match ? match[1] : line;
};

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
      listI.push(cleanListLine(line));
    } else if (stage === 'listII') {
      listII.push(cleanListLine(line));
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

function QuestionRenderer({ question }) {
  const isMatch = question.type === 'Match the Following' || /match\s+the\s+following/i.test(question.question);
  const isAR = question.type === 'Assertion-Reason' || /assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(question.question);

  if (isMatch) {
    const parsed = parseMatchTheFollowing(question.question);
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
    const parsed = parseAssertionReason(question.question);
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

  return <p className="question-text" style={{ whiteSpace: 'pre-wrap' }}>{question.question}</p>;
}

export default QuestionRenderer;
