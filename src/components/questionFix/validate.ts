import type { QuestionFormValue } from '../QuestionForm';

/** A warning for a question that can't be saved yet, or null. */
export const validateQuestion = (form: QuestionFormValue): string | null => {
  if (!form.question?.trim()) return 'Question text is required.';
  if (form.answerType === 'numerical') {
    return String(form.correct_answer ?? '').trim() ? null : 'A numerical correct answer is required.';
  }

  // An option may be an image instead of text.
  const missing = (['a', 'b', 'c', 'd'] as const).some((key) => !form.options?.[key]?.trim() && !form.optionImages?.[key]);
  if (missing) return 'All options (A, B, C, D) are required.';
  const answer = form.correct_answer;
  if (Array.isArray(answer) ? answer.length === 0 : !answer) return 'Choose the correct answer.';
  if (form.answerType === 'multiple' && Array.isArray(answer) && answer.length < 2) return 'Pick at least two correct options for a multiple-answer question.';
  return null;
};
