import { normalizeOptionKey } from './helpers';
import type { AnswerType, OptionKey, QuestionOptionImages, QuestionOptions, QuestionType } from '../types/models';

/** Where a draft will be saved, fixed when it is extracted so a later change of selection can't redirect it. */
export type DraftDestination =
  | { mode: 'curriculum'; unitId: string; topicId: string; subtopicId: string; label: string }
  | { mode: 'test'; testId: string; label: string };

let lastDraftId = 0;
/** A unique id for a draft question (increasing, so drafts created in the same millisecond differ). */
export const newDraftId = (): number => {
  lastDraftId = Math.max(Date.now(), lastDraftId + 1);
  return lastDraftId;
};

export interface DraftQuestion {
  id: number;
  question: string;
  options: QuestionOptions;
  correct_answer: OptionKey | OptionKey[] | string;
  answerType: AnswerType;
  explanation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  optionImages: QuestionOptionImages;
  questionImage: string | null;
  explanationImage: string | null;
  subcategory: string;
  part?: string;
  section?: string;
  marksValue?: number;
  questionType?: QuestionType;
  page?: string;
  destination?: DraftDestination;
}

/**
 * The Extractor format: a JSON array with one object per question.
 *
 * [{"question": "…", "options": {"a": "…", "b": "…", "c": "…", "d": "…"}, "correct_answer": "b", "explanation": "…"}]
 *
 * correct_answer is a letter, a list of letters for multiple-correct (["a", "c"]), or for a numerical
 * question (empty options) a number or a range ("12.4 to 12.6"). marks, type and page are optional.
 */
export const EXTRACTOR_FORMAT_EXAMPLE =
  '[{"question": "…", "options": {"a": "…", "b": "…", "c": "…", "d": "…"}, "correct_answer": "b", "explanation": "…"}]';

export const normalizeLine = (value: string | null | undefined): string => {
  return (value || '')
    .normalize('NFC')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Like normalizeLine, but keeps line breaks (match/statement/assertion questions are laid out on several lines).
const normalizeText = (value: unknown): string =>
  (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
    .normalize('NFC')
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const normalizeQuestionType = (value: string | null | undefined): QuestionType | undefined => {
  const text = normalizeLine(value).toLowerCase();
  if (!text) return undefined;
  if (/assertion/.test(text)) return 'Assertion-Reason';
  if (/match/.test(text)) return 'Match the Following';
  if (/statement|true\s*\/\s*false/.test(text)) return 'Statement type (True/False)';
  if (/numer|\bnat\b|problem/.test(text)) return 'Numerical/Problem-based';
  if (/diagram/.test(text)) return 'Diagram-based';
  if (/mcq|theory|single|multiple|choice/.test(text)) return 'Theory-based MCQ';
  return undefined;
};

const normalizePage = (value: unknown): string | undefined => {
  const text = normalizeLine(typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '').replace(
    /^(?:page|pg|p)\.?\s*(?:no\.?)?\s*/i,
    ''
  );
  return !text || /^(?:n\/?a|none|unknown|-)$/i.test(text) ? undefined : text;
};

const NUMBER = String.raw`-?\d+(?:\.\d+)?|-?\.\d+`;
// "2.5 to 3.5", "2.5 - 3.5", "2.5–3.5", "between 2.5 and 3.5", "2.5 ~ 3.5" (also negatives like "-3 to -1").
const NUMERIC_RANGE_REGEX = new RegExp(String.raw`(?:between\s+)?(${NUMBER})\s*(?:to|and|–|—|-|~)\s*(${NUMBER})`, 'i');
const SINGLE_NUMBER_REGEX = new RegExp(NUMBER);

const tidyNumber = (raw: string) => String(Number(raw));

// The answer of a numerical question: a single number ("12.5") or a range in the canonical
// "<from> to <to>" form that grading understands. Returns null when there is no number.
export const extractNumericalAnswer = (value: string | null | undefined): string | null => {
  const text = normalizeLine(value);
  if (!text) return null;

  const range = text.match(NUMERIC_RANGE_REGEX);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
    return from === to ? tidyNumber(String(from)) : `${tidyNumber(String(from))} to ${tidyNumber(String(to))}`;
  }

  const single = text.match(SINGLE_NUMBER_REGEX);
  return single ? tidyNumber(single[0]) : null;
};

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

// {"a": "…"} or {"A": "…"} or {"(a)": "…"}, or a plain list of up to four options.
const parseOptions = (value: unknown): QuestionOptions => {
  const options: QuestionOptions = { a: '', b: '', c: '', d: '' };
  if (Array.isArray(value)) {
    value.slice(0, 4).forEach((text, idx) => {
      options[OPTION_KEYS[idx]] = normalizeText(text);
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, text]) => {
      const optionKey = normalizeOptionKey(key);
      if (optionKey) options[optionKey] = normalizeText(text);
    });
  }
  return options;
};

// "b", "(b)", "B", ["a", "c"], "a, c" → option keys, in order and without duplicates.
const parseAnswerKeys = (value: unknown): OptionKey[] => {
  const tokens = Array.isArray(value)
    ? value.map((v) => String(v))
    : String(value ?? '')
        .replace(/^(?:answer|ans|correct answer|correct option|options?)\s*[:–—-]?\s*/i, '')
        .split(/\s*(?:,|\band\b|&|\/)\s*/i);
  const keys = tokens.map((token) => normalizeOptionKey(token)).filter((k): k is OptionKey => !!k);
  return Array.from(new Set(keys));
};

const toDraft = (item: Record<string, unknown>, subcategory: string): DraftQuestion | null => {
  const question = normalizeText(item.question ?? item.questions);
  if (!question) return null;

  const options = parseOptions(item.options);
  const hasOptions = Object.values(options).filter(Boolean).length >= 2;
  const answer = item.correct_answer ?? item.correctAnswer ?? item.answer;

  let correctAnswer: DraftQuestion['correct_answer'];
  let answerType: AnswerType;
  if (hasOptions) {
    const keys = parseAnswerKeys(answer);
    correctAnswer = keys.length >= 2 ? keys : keys[0] || 'a';
    answerType = keys.length >= 2 ? 'multiple' : 'single';
  } else {
    const numeric = extractNumericalAnswer(typeof answer === 'number' ? String(answer) : typeof answer === 'string' ? answer : '');
    if (!numeric) return null;
    correctAnswer = numeric;
    answerType = 'numerical';
  }

  const marks = parseFloat(String(item.marks ?? ''));
  const typeText = typeof item.type === 'string' ? item.type : typeof item.questionType === 'string' ? item.questionType : '';

  return {
    id: newDraftId(),
    question,
    options,
    correct_answer: correctAnswer,
    answerType,
    explanation: normalizeText(item.explanation),
    status: 'PENDING',
    optionImages: { a: null, b: null, c: null, d: null },
    questionImage: null,
    explanationImage: null,
    subcategory,
    ...(marks > 0 ? { marksValue: marks } : {}),
    ...(normalizeQuestionType(typeText) ? { questionType: normalizeQuestionType(typeText) } : {}),
    ...(normalizePage(item.page) ? { page: normalizePage(item.page) } : {}),
  };
};

const VALID_JSON_ESCAPES = '"\\/bfnrtu';

/**
 * Fixes the usual slips in chat-written JSON: markdown escapes such as \_ (NotebookLM's copied answer
 * has "correct\_answer"), real line breaks or tabs inside a string (instead of \n / \t) and trailing
 * commas ("…",] / "…",}).
 */
const repairJson = (json: string): string => {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (inString) {
      if (escaped) {
        escaped = false;
        // Not a JSON escape (\_, \*, \[ …): drop the backslash and keep the character.
        if (!VALID_JSON_ESCAPES.includes(ch)) out = out.slice(0, -1);
      } else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      else if (ch === '\n') {
        out += '\\n';
        continue;
      } else if (ch === '\t') {
        out += '\\t';
        continue;
      } else if (ch === '\r') continue;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === '}' || ch === ']') {
      out = out.replace(/,\s*$/, '');
    }
    out += ch;
  }
  return out;
};

// Parses one object; if that fails, retries with curly quotes turned into straight ones (some editors
// "smarten" the quotes when the answer is copied through them).
const parseObject = (raw: string): unknown => {
  for (const candidate of [raw, raw.replace(/[“”]/g, '"')]) {
    try {
      return JSON.parse(repairJson(candidate));
    } catch {
      // try the next candidate
    }
  }
  return null;
};

/**
 * Finds every top-level {...} object in the text. Chat tools wrap the array in code fences, add
 * citations, split a long answer over several arrays or stop midway, so rather than parsing the
 * whole paste as one array, each complete question object is picked out and parsed on its own.
 */
const findJsonObjects = (text: string): string[] => {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) objects.push(text.slice(start, i + 1));
    }
  }
  return objects;
};

/** Parses pasted Extractor-format JSON into draft questions; objects that are not valid questions are skipped. */
export const parseQuestionsJson = (pastedContent: string, subcategory: string): DraftQuestion[] => {
  return findJsonObjects(pastedContent.normalize('NFC'))
    .map(parseObject)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => toDraft(item, subcategory))
    .filter((q): q is DraftQuestion => q !== null);
};
