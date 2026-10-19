import MathText from './ui/MathText';

interface ListItem {
  marker: string;
  text: string;
}

interface MatchTheFollowing {
  prompt: string;
  titleI: string;
  titleII: string;
  listI: ListItem[];
  listII: ListItem[];
  /** Instructions after the lists, e.g. "Select the correct option". */
  trailer: string;
}

// "List I", "List-II", "Group 1", "Column II": the headers that start each list. II is tried before I.
const LIST_HEADER_RE = /\b(?:List|Group|Column)[\s-]*\(?(II|I|2|1)\)?(?![A-Za-z0-9])/gi;
// "A.", "B)", "(P)", "1.", "(iii)", "iv." when they start a word: the labels in front of list entries.
const ITEM_MARKER_RE = /(?:^|\s)(\([A-Za-z0-9]{1,4}\)|[A-Z][.)]|\d{1,2}[.)]|(?:i{1,3}|iv|vi{0,3}|ix|x)[.)])(?=\s|$)/g;
const TRAILER_RE = /\s+(?=(?:Select|Choose|Which|Identify|Codes?\s*:|The correct)\b)/;

/** Splits one list's text into its optional title (e.g. "(Crop Type)") and the labelled entries. */
function parseList(segment: string): { title: string; items: ListItem[] } {
  const marks = [...segment.matchAll(ITEM_MARKER_RE)];
  let title = '';
  let items: ListItem[];

  if (marks.length === 0) {
    // No labels: treat each line as an entry.
    const lines = segment.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines[0] && /^\(.*\)$/.test(lines[0])) title = lines.shift() as string;
    items = lines.map((text) => ({ marker: '', text }));
  } else {
    title = segment.slice(0, marks[0].index).trim();
    items = marks.map((m, i) => {
      const start = (m.index ?? 0) + m[0].length;
      const end = marks[i + 1]?.index ?? segment.length;
      return { marker: m[1], text: segment.slice(start, end).trim() };
    });
    // A first entry that is only a parenthesised caption, e.g. "1. (Characteristic/Example)", is really the list's title.
    if (items.length > 1 && /^\(.*\)$/.test(items[0].text)) {
      title = [title, items[0].text].filter(Boolean).join(' ');
      items = items.slice(1);
    }
  }
  return { title, items };
}

/**
 * Understands both layouts the question bank holds: lists on separate lines ("List I⏎A. …⏎List II⏎1. …") and the same
 * thing flattened onto one line ("List I A. … B. … List II 1. … 2. …").
 */
const parseMatchTheFollowing = (text: string): MatchTheFollowing | null => {
  if (!text) return null;
  const headers = [...text.matchAll(LIST_HEADER_RE)].map((m) => ({ at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, isFirst: /^(I|1)$/i.test(m[1]) }));

  // The prompt can mention "Group I" and "Group II" in passing; use the first I-then-II pair that is followed by real entries.
  for (let i = 0; i < headers.length; i++) {
    const first = headers[i];
    const second = headers.slice(i + 1).find((h) => !h.isFirst);
    if (!first.isFirst || !second) continue;

    const left = parseList(text.slice(first.end, second.at));
    const right = parseList(text.slice(second.end));
    if (left.items.length < 2 || right.items.length < 2) continue;

    // Anything after the last entry's first line (or a "Select the correct option" sentence) is an instruction, not part of the entry.
    let trailer = '';
    const last = right.items[right.items.length - 1];
    const newline = last.text.indexOf('\n');
    const sentence = last.text.search(TRAILER_RE);
    const cut = [newline, sentence].filter((n) => n > 0).sort((x, y) => x - y)[0];
    if (cut !== undefined) {
      trailer = last.text.slice(cut).trim();
      last.text = last.text.slice(0, cut).trim();
    }

    return {
      prompt: text.slice(0, first.at).trim(),
      titleI: left.title,
      titleII: right.title,
      listI: left.items,
      listII: right.items,
      trailer,
    };
  }
  return null;
};

function MatchTable({ match }: { match: MatchTheFollowing }) {
  const rows = Math.max(match.listI.length, match.listII.length);
  const cell = (item?: ListItem) => (
    <div className="flex min-w-0 items-start gap-2 p-3">
      {item && (
        <>
          {item.marker && <span className="w-7 shrink-0 font-bold text-brand-700">{item.marker.replace(/^\(|\)$/g, '').replace(/[.)]$/, '')}.</span>}
          <span className="min-w-0 break-words text-slate-800">
            <MathText>{item.text}</MathText>
          </span>
        </>
      )}
    </div>
  );
  const heading = (label: string, title: string) => (
    <div className="p-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      {title && <span className="ml-1.5 text-xs font-medium normal-case text-slate-500">{title}</span>}
    </div>
  );

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
      <div className="grid grid-cols-2 border-b border-slate-300 bg-slate-100">
        {heading('List I', match.titleI)}
        <div className="border-l border-slate-300">{heading('List II', match.titleII)}</div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-2 border-b border-slate-200 last:border-b-0">
          {cell(match.listI[i])}
          <div className="border-l border-slate-200">{cell(match.listII[i])}</div>
        </div>
      ))}
    </div>
  );
}

interface AssertionReason {
  header: string;
  assertionLabel: string;
  assertion: string;
  reasonLabel: string;
  reason: string;
  trailer: string;
}

const ASSERTION_RE = /(?:assertion\s*\(A\)|assertion|கூற்று\s*(?:\([Aஅ]\))?)\s*:/i;
const REASON_RE = /(?:reason\s*\(R\)|reason|காரணம்\s*(?:\([Rக]\))?)\s*:/i;

/** Splits "text" at its first line break or instruction sentence ("Select the correct answer…"), returning [body, trailer]. */
const splitTrailer = (text: string): [string, string] => {
  const newline = text.indexOf('\n');
  const sentence = text.search(TRAILER_RE);
  const cut = [newline, sentence].filter((n) => n > 0).sort((x, y) => x - y)[0];
  return cut === undefined ? [text.trim(), ''] : [text.slice(0, cut).trim(), text.slice(cut).trim()];
};

/** Works whether "Assertion (A): …" and "Reason (R): …" are on separate lines or run together on one line. */
const parseAssertionReason = (text: string): AssertionReason | null => {
  if (!text) return null;
  const a = ASSERTION_RE.exec(text);
  if (!a) return null;
  const afterAssertion = a.index + a[0].length;
  const r = REASON_RE.exec(text.slice(afterAssertion));
  if (!r) return null;
  const reasonStart = afterAssertion + r.index;

  const [reason, trailer] = splitTrailer(text.slice(reasonStart + r[0].length));
  return {
    header: text.slice(0, a.index).trim(),
    assertionLabel: a[0].replace(/\s*:\s*$/, ''),
    assertion: text.slice(afterAssertion, reasonStart).trim(),
    reasonLabel: r[0].replace(/\s*:\s*$/, ''),
    reason,
    trailer,
  };
};

interface StatementList {
  intro: string;
  statements: string[];
  /** The question asked after the statements, e.g. "Which of the above statements are correct?" */
  question: string;
}

const NUMBER_MARKER_RE = /(?:^|\s)(\d{1,2})[.)](?=\s)/g;

/** "Consider the following statements… 1. … 2. … 3. … Which of the above are correct?" in one line or many. */
const parseStatements = (text: string): StatementList | null => {
  if (!text || !/\bstatements?\b/i.test(text)) return null;

  // Take the numbers 1, 2, 3… in order; any other "5." inside a statement is ordinary text.
  const marks: RegExpMatchArray[] = [];
  for (const m of text.matchAll(NUMBER_MARKER_RE)) {
    if (Number(m[1]) === marks.length + 1) marks.push(m);
  }
  if (marks.length < 2) return null;

  const statements = marks.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = marks[i + 1]?.index ?? text.length;
    return text.slice(start, end).trim();
  });
  const [lastStatement, question] = splitTrailer(statements[statements.length - 1]);
  statements[statements.length - 1] = lastStatement;

  return { intro: text.slice(0, marks[0].index).trim(), statements, question };
};

interface QuestionRendererProps {
  question: { type?: string; question: string };
}

export default function QuestionRenderer({ question }: QuestionRendererProps) {
  const isMatch = question.type === 'Match the Following' || /\bmatch(ing)?\b/i.test(question.question);
  const isAR =
    question.type === 'Assertion-Reason' || /assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(question.question);

  if (isMatch) {
    const parsed = parseMatchTheFollowing(question.question);
    if (parsed) {
      return (
        <div>
          {parsed.prompt && (
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              <MathText>{parsed.prompt}</MathText>
            </p>
          )}
          <MatchTable match={parsed} />
          {parsed.trailer && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              <MathText>{parsed.trailer}</MathText>
            </p>
          )}
        </div>
      );
    }
  }

  if (isAR) {
    const parsed = parseAssertionReason(question.question);
    if (parsed) {
      const row = (label: string, body: string) => (
        <div className="flex items-start gap-2.5">
          <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wide text-brand-700">{label}</span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-slate-800">
            <MathText>{body}</MathText>
          </span>
        </div>
      );
      return (
        <div>
          {parsed.header && (
            <p className="mb-2 whitespace-pre-wrap text-sm text-slate-800">
              <MathText>{parsed.header}</MathText>
            </p>
          )}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
            {row(parsed.assertionLabel, parsed.assertion)}
            <div className="border-t border-slate-200" />
            {row(parsed.reasonLabel, parsed.reason)}
          </div>
          {parsed.trailer && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              <MathText>{parsed.trailer}</MathText>
            </p>
          )}
        </div>
      );
    }
  }

  const statementList = parseStatements(question.question);
  if (statementList) {
    return (
      <div>
        {statementList.intro && (
          <p className="whitespace-pre-wrap text-sm text-slate-800">
            <MathText>{statementList.intro}</MathText>
          </p>
        )}
        <ol className="mt-2 flex flex-col gap-2">
          {statementList.statements.map((statement, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
              <span className="min-w-0 flex-1 break-words text-slate-800">
                <MathText>{statement}</MathText>
              </span>
            </li>
          ))}
        </ol>
        {statementList.question && (
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-slate-900">
            <MathText>{statementList.question}</MathText>
          </p>
        )}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap text-sm text-slate-800"><MathText>{question.question}</MathText></p>;
}
