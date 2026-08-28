// Strips an accidental leading list marker (e.g. "1.", "A.") from a bracketed
// column subtitle like "1. (Key Characteristic)" -> "(Key Characteristic)".
// Real list items (e.g. "1. Calcination of Kaolinite clay") aren't fully
// parenthesized, so they're left untouched.
const cleanListLine = (line: string): string => {
  const match = line.match(/^[A-Za-z0-9]+[.)]\s*(\(.+\))$/);
  return match ? match[1] : line;
};

interface MatchTheFollowing {
  prompt: string;
  listI: string[];
  listII: string[];
}

const parseMatchTheFollowing = (text: string): MatchTheFollowing | null => {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let prompt = '';
  const listI: string[] = [];
  const listII: string[] = [];
  let stage: 'prompt' | 'listI' | 'listII' = 'prompt';

  for (const line of lines) {
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

interface AssertionReason {
  header: string;
  assertion: string;
  reason: string;
}

const parseAssertionReason = (text: string): AssertionReason | null => {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let header = '';
  let assertion = '';
  let reason = '';

  for (const line of lines) {
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

interface QuestionRendererProps {
  question: { type?: string; question: string };
}

export default function QuestionRenderer({ question }: QuestionRendererProps) {
  const isMatch = question.type === 'Match the Following' || /match\s+the\s+following/i.test(question.question);
  const isAR =
    question.type === 'Assertion-Reason' || /assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(question.question);

  if (isMatch) {
    const parsed = parseMatchTheFollowing(question.question);
    if (parsed) {
      return (
        <div>
          <p className="mb-2 whitespace-pre-wrap text-sm text-slate-800">{parsed.prompt}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
              <tbody>
                <tr>
                  <td className="w-1/2 border-r border-slate-200 p-3 align-top">
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">List I</div>
                    {parsed.listI.map((item, idx) => (
                      <div key={idx} className="py-0.5 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </td>
                  <td className="w-1/2 p-3 align-top">
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">List II</div>
                    {parsed.listII.map((item, idx) => (
                      <div key={idx} className="py-0.5 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  if (isAR) {
    const parsed = parseAssertionReason(question.question);
    if (parsed) {
      return (
        <div>
          {parsed.header && <p className="mb-1.5 whitespace-pre-wrap text-sm text-slate-800">{parsed.header}</p>}
          <div className="flex flex-col gap-1.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <div className="whitespace-pre-wrap">{parsed.assertion}</div>
            <div className="whitespace-pre-wrap">{parsed.reason}</div>
          </div>
        </div>
      );
    }
  }

  return <p className="whitespace-pre-wrap text-sm text-slate-800">{question.question}</p>;
}
