import { BACKEND_URL } from '../config';
import type { OptionKey, QuestionType } from '../types/models';

export const getImagePreview = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const detectQuestionType = (question: string): QuestionType => {
  if (/match\s+the\s+following/i.test(question || '')) return 'Match the Following';
  if (/assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(question || '')) {
    return 'Assertion-Reason';
  }
  if (
    /\b(?:consider\s+the\s+following\s+statements?|statements?)\b/i.test(question || '') ||
    /பின்வரும்\s+கூற்றுகள|கூற்றுகளைக்\s+கவனியுங்கள்/u.test(question || '')
  ) {
    return 'Statement type (True/False)';
  }
  return 'Theory-based MCQ';
};

const OPTION_TOKEN_MAP: Record<string, OptionKey> = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  '1': 'a',
  '2': 'b',
  '3': 'c',
  '4': 'd',
  'அ': 'a',
  'ஆ': 'b',
  'இ': 'c',
  'ஈ': 'd',
};

export const normalizeOptionKey = (value: string | null | undefined): OptionKey | null => {
  if (value === null || value === undefined) return null;
  const token = (value || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[()[\].:]/g, '')
    .toLowerCase();
  if (!token) return null;
  return OPTION_TOKEN_MAP[token] || null;
};

export const normalizeCorrectAnswer = (val: string | number | null | undefined): OptionKey => {
  if (val === null || val === undefined) return 'a';
  if (typeof val === 'number') return (['a', 'b', 'c', 'd'] as OptionKey[])[val] || 'a';

  const strVal = val.toString();
  if (/^\d+$/.test(strVal)) {
    return (['a', 'b', 'c', 'd'] as OptionKey[])[parseInt(strVal, 10)] || 'a';
  }

  const str = strVal
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

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

  const match = str.match(/\b([a-d])\b/i);
  if (match) {
    return match[0] as OptionKey;
  }

  return 'a';
};

export const normalizeCorrectAnswers = (value: unknown): OptionKey[] => {
  if (!Array.isArray(value)) return [];
  const keys = value.map((v) => normalizeOptionKey(typeof v === 'string' ? v : String(v))).filter((k): k is OptionKey => !!k);
  return Array.from(new Set(keys));
};

export const formatCorrectAnswerLabel = (value: string | string[] | null | undefined): string => {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => v.toString().toUpperCase()).join(', ');
  return (value ?? '').toString().toUpperCase();
};
