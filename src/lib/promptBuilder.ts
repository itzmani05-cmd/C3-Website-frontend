export type PromptQuestionType = 'single' | 'multiple' | 'numerical' | 'assertion' | 'match' | 'statement';
export type PromptDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type PromptLanguage = 'english' | 'tamil' | 'bilingual';

export interface QuestionSlot {
  type: PromptQuestionType;
  marks: string;
  page: string;
}

export interface PromptConfig {
  examName: string;
  bookName: string;
  chapter: string;
  pageFrom: string;
  pageTo: string;
  difficulty: PromptDifficulty;
  language: PromptLanguage;
  questionPlan: QuestionSlot[];
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

const DIFFICULTY_TEXT: Record<PromptDifficulty, string> = {
  easy: 'Easy — direct recall of definitions, facts and basic formulas.',
  medium: 'Medium — conceptual understanding and one or two step application.',
  hard: 'Hard — multi-step reasoning, analysis and tricky distractors, at the level of the actual competitive exam.',
  mixed: 'Mixed — roughly 30% easy, 50% medium and 20% hard.',
};

const LANGUAGE_TEXT: Record<PromptLanguage, string> = {
  english: 'Write everything in English.',
  tamil: 'Write the question, options and explanation in Tamil. Keep the labels "Options:", "Answer:" and "Explanation:" and the option markers (a) (b) (c) (d) in English exactly as shown.',
  bilingual:
    'Write the question and every option in English followed by " / " and the Tamil translation on the same line (example: "Which gas is most abundant in air? / காற்றில் அதிகம் உள்ள வாயு எது?"). The explanation may be in English only. Keep the labels "Options:", "Answer:" and "Explanation:" in English.',
};

const TYPE_TEMPLATES: Record<PromptQuestionType, string> = {
  single: `1. Which of the following is the SI unit of force?
Options: (a) Joule (b) Newton (c) Watt (d) Pascal
Answer: (b)
Explanation: Force is measured in newtons, where 1 N = 1 kg·m/s².
Marks: 1
Type: Single-correct MCQ
Page: 12`,
  multiple: `2. Which of the following are vector quantities?
Options: (a) Velocity (b) Mass (c) Force (d) Temperature
Answer: (a), (c)
Explanation: Velocity and force have both magnitude and direction; mass and temperature are scalars.
Marks: 1
Type: Multiple-correct MCQ
Page: 15`,
  numerical: `3. A body of mass 2 kg is accelerated at 3 m/s². What is the force acting on it in newtons?
Answer: 6
Explanation: F = m × a = 2 × 3 = 6 N.
Marks: 2
Type: Numerical answer (NAT)
Page: 18`,
  assertion: `4. Assertion (A): Ice floats on water. Reason (R): Ice has a lower density than liquid water.
Options: (a) Both A and R are true and R is the correct explanation of A (b) Both A and R are true but R is not the correct explanation of A (c) A is true but R is false (d) A is false but R is true
Answer: (a)
Explanation: Water expands on freezing, so ice is less dense and floats; R directly explains A.
Marks: 2
Type: Assertion–Reason
Page: 23`,
  match: `5. Match the following. List I: A. Newton B. Joule C. Watt D. Pascal List II: 1) Power 2) Pressure 3) Force 4) Energy
Options: (a) A-3, B-4, C-1, D-2 (b) A-4, B-3, C-2, D-1 (c) A-3, B-1, C-4, D-2 (d) A-2, B-4, C-1, D-3
Answer: (a)
Explanation: Newton is the unit of force, joule of energy, watt of power and pascal of pressure.
Marks: 1
Type: Match the following
Page: 9`,
  statement: `6. Consider the following statements. Statement I: Sound cannot travel through vacuum. Statement II: Light requires a medium to travel. Which of the statements given above is/are correct?
Options: (a) Statement I only (b) Statement II only (c) Both Statement I and II (d) Neither Statement I nor II
Answer: (a)
Explanation: Sound is a mechanical wave and needs a medium, while light is electromagnetic and travels through vacuum.
Marks: 2
Type: Statement based
Page: 31`,
};

const numberTemplates = (types: PromptQuestionType[]) =>
  types.map((type, idx) => TYPE_TEMPLATES[type].replace(/^\d+\./, `${idx + 1}.`)).join('\n\n');

export const createSlot = (previous?: QuestionSlot): QuestionSlot => ({
  type: previous?.type ?? 'single',
  marks: previous?.marks ?? '1',
  page: '',
});

export const resizePlan = (plan: QuestionSlot[], count: number): QuestionSlot[] => {
  if (plan.length >= count) return plan.slice(0, count);
  const next = [...plan];
  while (next.length < count) next.push(createSlot(next[next.length - 1]));
  return next;
};

export const totalMarks = (plan: QuestionSlot[]): number => plan.reduce((sum, slot) => sum + (Number(slot.marks) || 0), 0);

export const formatPageRange = (from: string, to: string): string => {
  const start = from.trim();
  const end = to.trim();
  if (start && end) return start === end ? `Page ${start}` : `Pages ${start}–${end}`;
  if (start) return `Pages ${start} onwards`;
  if (end) return `Pages up to ${end}`;
  return '';
};

export const buildNotebookPrompt = (config: PromptConfig): string => {
  const plan = config.questionPlan;
  const count = plan.length;
  const types = (Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).filter((t) => plan.some((slot) => slot.type === t));
  const bookName = config.bookName.trim();
  const chapter = config.chapter.trim();
  const extra = config.extraInstructions.trim();
  const pageRange = formatPageRange(config.pageFrom, config.pageTo);
  const scope = [
    pageRange ? `${pageRange.toLowerCase()} of` : '',
    chapter ? `the chapter / topic "${chapter}" of` : '',
    `the book "${bookName}"`,
  ]
    .filter(Boolean)
    .join(' ');
  const hasOptionTypes = types.some((t) => t !== 'numerical');
  const anyPage = pageRange ? `any page within ${pageRange.toLowerCase()}` : 'any page';

  const planRows = plan
    .map(
      (slot, idx) =>
        `Q${idx + 1} | Type: ${QUESTION_TYPE_LABELS[slot.type]} | Marks: ${slot.marks.trim()} | Page: ${slot.page.trim() || anyPage}`
    )
    .join('\n');

  const sections: string[] = [
    `ROLE
You are a senior question-paper setter for the ${config.examName} examination. You write accurate, exam-standard multiple choice questions strictly from the uploaded source material.`,

    `TASK
Using ONLY the content of ${scope} uploaded in this notebook, create exactly ${count} original questions that follow the question plan below.`,

    `SOURCE RULES
- Every question, option, answer and explanation must be supported by the uploaded source. Do not use outside knowledge.
- Record the book page number each question is taken from.${
      pageRange ? `\n- Use only ${pageRange.toLowerCase()}. Ignore every page outside this range.` : ''
    }
- If the source does not contain enough material for a question in the plan, skip that question number rather than invent facts.
- Cover the material broadly; do not ask the same concept twice.`,

    `QUESTION PLAN (follow exactly — question N must match row N)
${planRows}
Total: ${count} questions, ${totalMarks(plan)} marks.`,

    `PLAN RULES
- Each question must be exactly the type given in its row.
- When a row gives a page number, write that question only from the content of that page, and show that page in its Page line.
- Marks set the depth of the question: 1 mark = direct recall of a single fact, definition or formula; 2 marks = understanding or a one-to-two step application; 3 or more marks = multi-step reasoning, calculation or combining several concepts. Higher-mark questions must be clearly harder and have more detailed explanations.
- Overall difficulty: ${DIFFICULTY_TEXT[config.difficulty]}`,

    `QUALITY RULES${
      hasOptionTypes
        ? `
- Every option-based question has exactly four options: (a), (b), (c), (d).
- Wrong options must be plausible distractors of similar length and style — no "All of the above" or "None of the above".
- Spread the correct answers across (a), (b), (c) and (d); avoid a predictable pattern.`
        : ''
    }
- Each explanation states why the correct answer is right in one to three sentences.
- ${LANGUAGE_TEXT[config.language]}`,

    `OUTPUT FORMAT (STRICT — the output is imported by an automatic extractor)
Follow this exact structure for every question:

<number>. <complete question text on ONE line>
Options: (a) <option> (b) <option> (c) <option> (d) <option>
Answer: (<letter>)
Explanation: <explanation on ONE line>
Marks: <marks from the plan>
Type: <question type from the plan>
Page: <page number in the book>

Formatting rules:
1. Number questions 1, 2, 3 … followed by a full stop, at the start of the line, matching the plan row numbers.
2. The whole question stays on a single line. Never put numbered sub-points on new lines; write statements as "Statement I: … Statement II: …" and match lists as "List I: A. … B. … List II: 1) … 2) …" on the same line.
3. All four options are on ONE line after the label "Options:", each marked (a) (b) (c) (d).
4. Answer line: "Answer: (b)" for one correct option, "Answer: (a), (c)" for multiple correct options, and just the number (e.g. "Answer: 12.5") for numerical questions. Numerical questions have NO Options line.
5. Explanation is a single paragraph on ONE line. It must not start any line with a number and must not contain the words "Answer:" or "Options:".
6. Do not use the words "Options:", "Answer:", "Explanation:", "Marks:", "Type:" or "Page:" inside question text or explanations.
7. Marks line: the marks from that question's plan row (e.g. "Marks: 2").
8. Type line: the type from that question's plan row, written exactly as one of these labels — ${types.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')}.
9. Page line: the page number printed in the book where the answer is found (e.g. "Page: 45", or "Page: 45-46" if it spans pages). If the page number cannot be identified, write "Page: N/A". Never guess a page number.
10. Leave one blank line between questions.
11. Plain text only — no markdown, no bold, no tables, no headings, no citations or source numbers like [1].
12. Output ONLY the questions. No introduction, summary or closing remarks.`,

    `EXAMPLE (format reference only — do not reuse this content)

${numberTemplates(types)}`,
  ];

  if (extra) {
    sections.push(`ADDITIONAL INSTRUCTIONS
${extra}`);
  }

  sections.push(`Begin now with question 1 and continue until question ${count}.`);

  return sections.join('\n\n');
};
