export type PromptQuestionType = 'single' | 'multiple' | 'numerical' | 'assertion' | 'match' | 'statement';
export type PromptDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type PromptLanguage = 'english' | 'tamil' | 'bilingual';

export interface PagePlanRow {
  page: string;
  questionNo: string;
  type: PromptQuestionType;
  marks: string;
}

export interface PromptConfig {
  examName: string;
  bookName: string;
  chapter: string;
  difficulty: PromptDifficulty;
  language: PromptLanguage;
  pagePlan: PagePlanRow[];
  extraInstructions: string;
}

export const QUESTION_TYPE_LABELS: Record<PromptQuestionType, string> = {
  single: 'Single-correct MCQ',
  multiple: 'Multiple-correct MCQ',
  numerical: 'Numerical answer (NAT)',
  assertion: 'Assertion–Reason',
  match: 'Match the following',
  statement: 'Statement based',
};

export const DIFFICULTY_LABELS: Record<PromptDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  mixed: 'Mixed',
};

export const LANGUAGE_LABELS: Record<PromptLanguage, string> = {
  english: 'English',
  tamil: 'Tamil',
  bilingual: 'Bilingual (English / Tamil)',
};

export const MAX_QUESTION_COUNT = 100;
// Prompts longer than this are split into parts that are pasted into NotebookLM one after another.
export const NOTEBOOKLM_CHAR_LIMIT = 2000;

const DIFFICULTY_TEXT: Record<PromptDifficulty, string> = {
  easy: 'easy (direct recall)',
  medium: 'medium (concept + 1-2 step application)',
  hard: 'hard (multi-step reasoning, tricky distractors)',
  mixed: 'mixed (30% easy, 50% medium, 20% hard)',
};

const LANGUAGE_TEXT: Record<PromptLanguage, string> = {
  english: '',
  tamil: '- Write question, options and explanation in Tamil; keep labels and (a)-(d) in English.',
  bilingual: '- Write question and each option as "English / Tamil" on the same line; explanation in English; labels in English.',
};

const TYPE_HINTS: Partial<Record<PromptQuestionType, string>> = {
  multiple: 'Multiple-correct: "Answer: (a), (c)".',
  numerical: 'Numerical: no Options line, "Answer: 12.5".',
  assertion: 'Assertion–Reason: "Assertion (A): … Reason (R): …" with the 4 standard A/R options.',
  match: 'Match: "List I: A. … B. … List II: 1) … 2) …" on one line, options like "A-3, B-1, C-4, D-2".',
  statement: 'Statement based: "Statement I: … Statement II: …" on one line.',
};

export const createRow = (previous?: PagePlanRow): PagePlanRow => ({
  page: previous?.page ?? '',
  questionNo: previous ? nextQuestionNo(previous.questionNo) : '',
  type: previous?.type ?? 'single',
  marks: previous?.marks ?? '1',
});

// "1.1" -> "1.2", "Q9" -> "Q10"; anything without a trailing number is left empty.
export const nextQuestionNo = (questionNo: string): string => {
  const match = questionNo.trim().match(/^(.*?)(\d+)$/);
  return match ? `${match[1]}${Number(match[2]) + 1}` : '';
};

export const totalQuestions = (plan: PagePlanRow[]): number => plan.length;

export const totalMarks = (plan: PagePlanRow[]): number => plan.reduce((sum, row) => sum + (Number(row.marks) || 0), 0);

const planLine = (row: PagePlanRow, number: number): string => {
  const page = row.page.trim() ? `PDF page ${row.page.trim()}` : 'any page';
  const source = row.questionNo.trim() ? `question no. ${row.questionNo.trim()}` : 'new question';
  const marks = row.marks.trim();
  return `Q${number}: ${page}, ${source}, ${QUESTION_TYPE_LABELS[row.type]}, ${marks} mark${marks === '1' ? '' : 's'}`;
};

const buildRules = (config: PromptConfig, types: PromptQuestionType[]): string => {
  const bookName = config.bookName.trim();
  const chapter = config.chapter.trim();
  const extra = config.extraInstructions.trim();
  const source = chapter ? `"${chapter}" in the book "${bookName}"` : `the book "${bookName}"`;
  const hints = types.map((t) => TYPE_HINTS[t]).filter(Boolean);

  return [
    `You are a ${config.examName} question-paper setter. Using ONLY ${source} in this notebook (no outside knowledge), prepare the questions in the plan below. Difficulty: ${DIFFICULTY_TEXT[config.difficulty]}; higher marks = harder question.`,
    `RULES
- Page numbers are PDF page numbers: the 1st page of the PDF file (cover included) is PDF page 1. Ignore the page numbers printed in the book.
- "question no. X" = the question numbered X printed on that PDF page. Reproduce it with its original wording and options (fix only formatting), then give its correct answer and explanation.
- "new question" = write an original question from that PDF page: 4 options (a)-(d), plausible distractors, no "All/None of the above".
- Use the plan type and marks. Skip a number if it cannot be found on that page; never invent facts.
- Explanation: 1-3 sentences.${LANGUAGE_TEXT[config.language] ? `\n${LANGUAGE_TEXT[config.language]}` : ''}`,
    `FORMAT (strict, plain text, no markdown, no citations, no intro or summary, blank line between questions):
1. <question on ONE line>
Options: (a) … (b) … (c) … (d) …
Answer: (b)
Explanation: <ONE line>
Marks: <plan marks>
Type: <plan type>
Page: <PDF page, or N/A>
Number questions Q1 = 1, Q2 = 2 … as in the plan (not the book's question numbers). Never write the labels (Options:, Answer:, etc.) inside question or explanation text.${hints.length ? `\n${hints.join('\n')}` : ''}`,
    extra ? `EXTRA\n${extra}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

/**
 * Builds the NotebookLM prompt. Returns one part when it fits within NOTEBOOKLM_CHAR_LIMIT,
 * otherwise several parts: the first carries the rules, the rest continue the plan.
 */
export const buildNotebookPrompts = (config: PromptConfig, limit = NOTEBOOKLM_CHAR_LIMIT): string[] => {
  const plan = config.pagePlan;
  const count = totalQuestions(plan);
  const types = (Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).filter((t) => plan.some((row) => row.type === t));
  const rules = buildRules(config, types);

  const lines = plan.map((row, idx) => ({ line: planLine(row, idx + 1), last: idx + 1 }));

  const header = (part: number, parts: number) =>
    parts === 1 ? `PLAN (${count} questions, ${totalMarks(plan)} marks)` : `PLAN part ${part}/${parts}`;
  const firstFooter = (last: number) => `Write Q1 to Q${last} now.`;
  const contFooter = (first: number, last: number) =>
    `Continue with the same rules and format. Write Q${first} to Q${last} now.`;

  const single = `${rules}\n\n${header(1, 1)}\n${lines.map((l) => l.line).join('\n')}\n${firstFooter(count)}`;
  if (single.length <= limit) return [single];

  // Greedily pack plan lines into chunks, leaving room for the header/footer of each part.
  const chunks: { line: string; last: number }[][] = [];
  let current: { line: string; last: number }[] = [];
  let size = rules.length + 120;
  for (const l of lines) {
    if (current.length && size + l.line.length + 1 > limit) {
      chunks.push(current);
      current = [];
      size = 120;
    }
    current.push(l);
    size += l.line.length + 1;
  }
  if (current.length) chunks.push(current);

  let first = 1;
  return chunks.map((chunk, idx) => {
    const last = chunk[chunk.length - 1].last;
    const body = `${header(idx + 1, chunks.length)}\n${chunk.map((l) => l.line).join('\n')}`;
    const text =
      idx === 0
        ? `${rules}\n\nThe plan is sent in ${chunks.length} parts.\n${body}\n${firstFooter(last)}`
        : `${body}\n${contFooter(first, last)}`;
    first = last + 1;
    return text;
  });
};
