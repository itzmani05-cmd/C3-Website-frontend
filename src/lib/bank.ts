import { detectQuestionType } from './helpers';
import type { AnswerType, CorrectAnswer, QuestionOptionImages, QuestionOptions } from '../types/models';

// ---------- question shapes ----------

/** Fields the editor works on. The list endpoint leaves images/options/explanation out; GET /:id returns them all. */
export interface BankQuestion {
  _id?: string;
  question?: string;
  questionImage?: string | null;
  options?: Partial<QuestionOptions>;
  optionImages?: QuestionOptionImages;
  correct_answer?: CorrectAnswer;
  answerType?: AnswerType;
  explanation?: string;
  explanationImage?: string | null;
  year?: number | null;
  source?: string;
  marks?: number | null;
  answerMin?: number | null;
  answerMax?: number | null;
  verified?: boolean;
}

/** A row from the list endpoint: everything except the base64 images, which are only flagged. */
export interface BankQuestionSummary {
  _id: string;
  topicId: string;
  question: string;
  options?: Partial<QuestionOptions>;
  explanation?: string;
  updatedAt?: string;
  type?: string;
  answerType?: AnswerType;
  correct_answer?: CorrectAnswer;
  year?: number | null;
  source?: string;
  marks?: number | null;
  answerMin?: number | null;
  answerMax?: number | null;
  verified?: boolean;
  updatedBy?: string;
  hasQuestionImage?: boolean;
  hasOptionImages?: boolean;
  hasExplanationImage?: boolean;
  hasExplanation?: boolean;
}

export interface QuestionPage {
  items: BankQuestionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const EMPTY_QUESTION: BankQuestion = {
  question: '',
  questionImage: null,
  options: { a: '', b: '', c: '', d: '' },
  optionImages: { a: null, b: null, c: null, d: null },
  correct_answer: 'a',
  answerType: 'single',
  explanation: '',
  explanationImage: null,
  year: null,
  source: '',
  marks: null,
  answerMin: null,
  answerMax: null,
  verified: false,
};

export const errorMessage = (error: any): string => error?.response?.data?.message || error?.message || 'Something went wrong';

// ---------- scope + filters ----------

export interface Scope {
  topicId?: string;
  unitId?: string;
  examId?: string;
}

export interface BankFilters {
  q: string;
  yearFrom: string;
  yearTo: string;
  answerType: string[];
  marks: string[];
  hasImage: boolean;
  missingExplanation: boolean;
  rangeAnswer: boolean;
}

export const EMPTY_FILTERS: BankFilters = {
  q: '',
  yearFrom: '',
  yearTo: '',
  answerType: [],
  marks: [],
  hasImage: false,
  missingExplanation: false,
  rangeAnswer: false,
};

/** Query parameters understood by GET /api/question-bank. */
export function filtersToParams(f: BankFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.q.trim()) p.q = f.q.trim();
  if (f.yearFrom) p.yearFrom = f.yearFrom;
  if (f.yearTo) p.yearTo = f.yearTo;
  if (f.answerType.length) p.answerType = f.answerType.join(',');
  if (f.marks.length) p.marks = f.marks.join(',');
  if (f.hasImage) p.hasImage = '1';
  if (f.missingExplanation) p.missingExplanation = '1';
  if (f.rangeAnswer) p.rangeAnswer = '1';
  return p;
}

// Short keys keep the address bar readable: ?q=…&y1=2015&y2=2020&type=numerical&marks=2&img=1&noexp=1&range=1
const URL_KEYS = ['q', 'y1', 'y2', 'type', 'marks', 'img', 'noexp', 'range'] as const;

export function filtersFromSearch(sp: URLSearchParams): BankFilters {
  const list = (key: string) => (sp.get(key) ? sp.get(key)!.split(',').filter(Boolean) : []);
  return {
    q: sp.get('q') ?? '',
    yearFrom: sp.get('y1') ?? '',
    yearTo: sp.get('y2') ?? '',
    answerType: list('type'),
    marks: list('marks'),
    hasImage: sp.get('img') === '1',
    missingExplanation: sp.get('noexp') === '1',
    rangeAnswer: sp.get('range') === '1',
  };
}

/** Returns a patch ({key: value | null}) that rewrites all filter keys in the URL. */
export function filtersToSearchPatch(f: BankFilters): Record<string, string | null> {
  const patch: Record<string, string | null> = Object.fromEntries(URL_KEYS.map((k) => [k, null]));
  if (f.q.trim()) patch.q = f.q.trim();
  if (f.yearFrom) patch.y1 = f.yearFrom;
  if (f.yearTo) patch.y2 = f.yearTo;
  if (f.answerType.length) patch.type = f.answerType.join(',');
  if (f.marks.length) patch.marks = f.marks.join(',');
  if (f.hasImage) patch.img = '1';
  if (f.missingExplanation) patch.noexp = '1';
  if (f.rangeAnswer) patch.range = '1';
  return patch;
}

export const ANSWER_TYPE_LABEL: Record<string, string> = { single: 'Single', multiple: 'Multiple', numerical: 'Numerical' };

interface FilterChip {
  key: string;
  label: string;
  clear: (f: BankFilters) => BankFilters;
}

export function activeFilterChips(f: BankFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.q.trim()) chips.push({ key: 'q', label: `Search: “${f.q.trim()}”`, clear: (x) => ({ ...x, q: '' }) });
  if (f.yearFrom || f.yearTo) {
    const label = f.yearFrom && f.yearTo ? `Year ${f.yearFrom}–${f.yearTo}` : f.yearFrom ? `Year ≥ ${f.yearFrom}` : `Year ≤ ${f.yearTo}`;
    chips.push({ key: 'year', label, clear: (x) => ({ ...x, yearFrom: '', yearTo: '' }) });
  }
  f.answerType.forEach((t) =>
    chips.push({ key: `type-${t}`, label: ANSWER_TYPE_LABEL[t] ?? t, clear: (x) => ({ ...x, answerType: x.answerType.filter((v) => v !== t) }) })
  );
  f.marks.forEach((m) =>
    chips.push({ key: `marks-${m}`, label: `${m} mark${m === '1' ? '' : 's'}`, clear: (x) => ({ ...x, marks: x.marks.filter((v) => v !== m) }) })
  );
  if (f.hasImage) chips.push({ key: 'img', label: 'Has image', clear: (x) => ({ ...x, hasImage: false }) });
  if (f.missingExplanation) chips.push({ key: 'noexp', label: 'Missing explanation', clear: (x) => ({ ...x, missingExplanation: false }) });
  if (f.rangeAnswer) chips.push({ key: 'range', label: 'Range answer', clear: (x) => ({ ...x, rangeAnswer: false }) });
  return chips;
}

export const hasActiveFilters = (f: BankFilters): boolean => activeFilterChips(f).length > 0;

// ---------- editing helpers ----------

const numOrNull = (v: unknown): number | null => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/**
 * Body for POST/PUT /api/question-bank. The list does not load images, so an image field is only sent when the editor
 * actually has a value for it (a new upload, or null for "removed"); leaving it out keeps the stored image.
 */
export function buildPayload(q: BankQuestion) {
  const optionImages = Object.fromEntries(Object.entries(q.optionImages ?? {}).filter(([, v]) => v !== undefined));
  return {
    type: detectQuestionType(q.question || ''),
    question: q.question,
    ...(q.questionImage !== undefined && { questionImage: q.questionImage }),
    options: q.options,
    ...(Object.keys(optionImages).length > 0 && { optionImages }),
    correct_answer: q.correct_answer,
    answerType: q.answerType || 'single',
    explanation: q.explanation,
    ...(q.explanationImage !== undefined && { explanationImage: q.explanationImage }),
    year: numOrNull(q.year),
    source: q.source ?? '',
    marks: numOrNull(q.marks),
    answerMin: q.answerType === 'numerical' ? numOrNull(q.answerMin) : null,
    answerMax: q.answerType === 'numerical' ? numOrNull(q.answerMax) : null,
    verified: !!q.verified,
  };
}

export function validateQuestion(q: BankQuestion): string {
  if (!q.question?.trim()) return 'Question text is required.';
  if (q.answerType === 'numerical') {
    if (q.correct_answer === undefined || q.correct_answer === '' || (Array.isArray(q.correct_answer) && !q.correct_answer.length)) {
      return 'A numerical correct answer is required.';
    }
    const min = numOrNull(q.answerMin);
    const max = numOrNull(q.answerMax);
    if (min !== null && max !== null && min > max) return 'The accepted range minimum must not be above the maximum.';
  } else {
    const o = q.options;
    if (!o?.a?.trim() || !o?.b?.trim() || !o?.c?.trim() || !o?.d?.trim()) return 'All options (A, B, C, D) are required.';
  }
  return '';
}

const TEXT_FIELDS = ['question', 'explanation', 'source', 'answerType', 'questionImage', 'explanationImage'] as const;

/** Cheap change detection (no JSON.stringify of large base64 images on every keystroke). */
export function isQuestionDirty(a: BankQuestion, b: BankQuestion): boolean {
  if (TEXT_FIELDS.some((k) => (a[k] ?? '') !== (b[k] ?? ''))) return true;
  if (numOrNull(a.year) !== numOrNull(b.year) || numOrNull(a.marks) !== numOrNull(b.marks)) return true;
  if (numOrNull(a.answerMin) !== numOrNull(b.answerMin) || numOrNull(a.answerMax) !== numOrNull(b.answerMax)) return true;
  if (!!a.verified !== !!b.verified) return true;
  if (JSON.stringify(a.correct_answer ?? '') !== JSON.stringify(b.correct_answer ?? '')) return true;
  return (['a', 'b', 'c', 'd'] as const).some(
    (k) => (a.options?.[k] ?? '') !== (b.options?.[k] ?? '') || (a.optionImages?.[k] ?? '') !== (b.optionImages?.[k] ?? '')
  );
}
