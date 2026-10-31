import type { ExamQuestion } from '../types/models';

export const toOptionKeys = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  return Array.from(new Set(raw.map((v) => String(v).trim().toLowerCase()).filter(Boolean))).sort();
};

const isNumericalAnswerCorrect = (studentAns: string, correctAnswer: unknown, answerMin?: number | null, answerMax?: number | null): boolean => {
  const studentNum = parseFloat(studentAns);
  const correctNum = parseFloat(String(correctAnswer));
  if (!Number.isNaN(studentNum) && typeof answerMin === 'number' && typeof answerMax === 'number' && answerMin <= answerMax) {
    return studentNum >= answerMin && studentNum <= answerMax;
  }
  if (!Number.isNaN(studentNum) && !Number.isNaN(correctNum)) {
    return Math.abs(studentNum - correctNum) < 0.01;
  }
  return studentAns.trim().toLowerCase() === String(correctAnswer ?? '').trim().toLowerCase();
};

export const isAnswerCorrect = (q: Pick<ExamQuestion, 'answerType' | 'correct_answer' | 'answerMin' | 'answerMax'>, studentAns: string): boolean => {
  if (!studentAns) return false;
  if (q.answerType === 'numerical') return isNumericalAnswerCorrect(studentAns, q.correct_answer, q.answerMin, q.answerMax);
  const student = toOptionKeys(studentAns);
  const correct = toOptionKeys(q.correct_answer);
  return correct.length > 0 && student.length === correct.length && student.every((k, i) => k === correct[i]);
};
