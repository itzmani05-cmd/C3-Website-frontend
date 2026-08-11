import { normalizeOptionKey } from './helpers';
import type { OptionKey, QuestionOptionImages, QuestionOptions } from '../types/models';

export interface DraftQuestion {
  id: number;
  question: string;
  options: QuestionOptions;
  correct_answer: OptionKey;
  explanation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  optionImages: QuestionOptionImages;
  questionImage: string | null;
  explanationImage: string | null;
  subcategory: string;
}

export const normalizeLine = (value: string | null | undefined): string => {
  return (value || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const appendText = (existing: string | null | undefined, addition: string | null | undefined): string => {
  const base = normalizeLine(existing);
  const extra = normalizeLine(addition);
  if (!base) return extra;
  if (!extra) return base;
  return `${base} ${extra}`.replace(/\s+/g, ' ').trim();
};

export const formatSpecialQuestion = (value: string | null | undefined): string => {
  let text = (value || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

  if (/match\s+the\s+following/i.test(text)) {
    text = text
      .replace(/match\s+the\s+following[.:]?\s*/i, 'Match the following.\n')
      .replace(/\s*(\/\s*பின்வருவனவற்றைப்\s*பொருத்துக[.:]?)\s*/iu, ' $1\n')
      .replace(/\s+(?=List\s+I{1,2}\b)/gi, '\n')
      .replace(/(List\s+I\b)[.:]?\s*/i, '$1\n')
      .replace(/\s+(?=[A-D]\s*[.)]\s*)/g, '\n');

    const listTwoMatch = text.match(/\bList\s+II\b[.:]?\s*/i);
    if (listTwoMatch && listTwoMatch.index !== undefined) {
      const listTwoStart = listTwoMatch.index;
      const listTwoBodyStart = listTwoStart + listTwoMatch[0].length;
      const beforeListTwo = text.slice(0, listTwoStart).trimEnd();
      let listTwoBody = text.slice(listTwoBodyStart).trim();

      listTwoBody = listTwoBody
        .replace(/\s+(?=(?:[1-4]|[A-D])\s*[.)]\s*)/g, '\n')
        .replace(/([஀-௿])\s+(?=[A-Za-z])/gu, '$1\n');

      const listTwoItems = listTwoBody
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item, index) => (/^(?:[1-4]|[A-D])\s*[.)]/i.test(item) ? item : `${index + 1}. ${item}`));

      text = `${beforeListTwo}\nList II\n${listTwoItems.join('\n')}`;
    }
  }

  if (/assertion\s*[–—-]\s*reason|assertion\s*\(A\)|reason\s*\(R\)/i.test(text)) {
    text = text
      .replace(/assertion\s*[–—-]\s*reason(?:\s+questions?)?[.:]?\s*/i, 'Assertion–Reason Questions:\n\n')
      .replace(/\s*(?=Assertion\s*(?:\([Aஅ]\))?\s*:)/gi, '\n')
      .replace(/\s+(?=Reason\s*(?:\([Rக]\))?\s*:)/gi, '\n')
      .replace(/\s*(?=கூற்று\s*(?:\([Aஅ]\))?\s*:)/gu, '\n')
      .replace(/\s+(?=காரணம்\s*(?:\([Rக]\))?\s*:)/gu, '\n');
  }

  const isStatementQuestion =
    /\b(?:consider\s+the\s+following\s+statements?|statements?)\b/i.test(text) ||
    /பின்வரும்\s+கூற்றுகள|கூற்றுகளைக்\s+கவனியுங்கள்/u.test(text);

  if (isStatementQuestion) {
    text = text
      .replace(/\s+(?=\/\s*பின்வரும்\s+கூற்றுகள)/u, '\n\n')
      .replace(/\s+(?=பின்வரும்\s+கூற்றுகள)/u, '\n\n')
      .replace(/\s+(?=[1-9]\d*\s*[.)]\s*(?:[A-Za-z஀-௿]))/gu, '\n')
      .replace(/\s+(?=Statements?\s*(?:\(?I{1,3}\)?|\(?[1-3]\)?)\s*[:.)-])/gi, '\n')
      .replace(/\s+(?=Statement\s+(?:I{1,3}|[1-3])\b)/gi, '\n');
  }

  return text.replace(/\n{3,}/g, '\n\n').trim();
};

export const extractOptionKeyFromText = (value: string | null | undefined): OptionKey | null => {
  const text = normalizeLine(value);
  if (!text) return null;

  const directMatch = text.match(/^(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))[).:]*\s*/iu);
  if (directMatch) {
    return normalizeOptionKey(directMatch[1] || directMatch[2] || directMatch[3]);
  }

  const labeledMatch = text.match(
    /^(?:answer|ans|correct answer|correct option|option|பதில்|சரியான பதில்|விடை)\s*[:–—-]?\s*(?:\(?([a-d])\)?|\(?([1-4])\)?|([அஆஇஈ]))/iu
  );
  if (labeledMatch) {
    return normalizeOptionKey(labeledMatch[1] || labeledMatch[2] || labeledMatch[3]);
  }

  const standaloneMatch = text.match(/\b([a-d])\b/i);
  if (standaloneMatch) {
    return standaloneMatch[1].toLowerCase() as OptionKey;
  }

  return null;
};

export const QUESTION_START_REGEX = /^(?:(?:question|q|கேள்வி)\s*\d+\s*[:.)–—-]\s*|\d+\s*[:.)–—-]\s*)/iu;
export const ANSWER_LABEL_REGEX = /^(?:answer|ans|correct answer|correct option|பதில்|சரியான பதில்|விடை)\s*[:–—-]\s*/iu;
export const EXPLANATION_LABEL_REGEX = /^(?:explanation|reason|detailed explanation|விளக்கம்|காரணம்)\s*[:–—-]\s*/iu;
export const OPTIONS_LABEL_REGEX = /^(?:options?|choices?|answer choices?|விருப்பங்கள்|தேர்வுகள்)\s*[:–—-]?\s*/iu;
const STRICT_OPTION_MARKER_REGEX = /(?:^|[\s/|•·-])(\([a-dA-D1-4அஆஇஈ]\)|\([a-dA-D1-4அஆஇஈ]\)|\([1-4]\))\s*/gu;
const LOOSE_OPTION_MARKER_REGEX = /(?:^|[\s/|•·-])([a-dA-D1-4அஆஇஈ])[).:]\s*/gu;

export interface OptionToken {
  key: OptionKey;
  text: string;
}

export const parseInlineOptions = (text: string): OptionToken[] => {
  const optionsText = text.replace(OPTIONS_LABEL_REGEX, '');
  const strictMatches = [...optionsText.matchAll(STRICT_OPTION_MARKER_REGEX)];
  const looseMatches = strictMatches.length > 0 ? [] : [...optionsText.matchAll(LOOSE_OPTION_MARKER_REGEX)];
  const matches = strictMatches.length > 0 ? strictMatches : looseMatches;

  return matches
    .map((tokenMatch, tokenIndex, allMatches): OptionToken | null => {
      const rawToken = tokenMatch[1];
      const key = normalizeOptionKey(rawToken);
      if (!key) return null;

      const valueStart = tokenMatch.index! + tokenMatch[0].length;
      const nextToken = allMatches[tokenIndex + 1];
      const valueEnd = nextToken ? nextToken.index! : optionsText.length;
      return { key, text: optionsText.slice(valueStart, valueEnd) };
    })
    .filter((v): v is OptionToken => v !== null);
};

export const splitQuestionBlocks = (text: string): string[] => {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const questionStartPattern = /(?:^|\n)\s*(?:(?:question|q|கேள்வி)\s*\d+|\d+)\s*[:.)–—-]\s*/giu;
  const matches = [...normalizedText.matchAll(questionStartPattern)];

  if (matches.length === 0) return [];

  return matches
    .map((match, index) => {
      const start = match.index! + match[0].length;
      const end = matches[index + 1]?.index ?? normalizedText.length;
      return normalizedText.slice(start, end).trim();
    })
    .filter(Boolean);
};

export const parseQuestionBlock = (block: string, idx: number, subcategory: string): DraftQuestion | null => {
  const compactBlock = normalizeLine(block);
  if (!compactBlock) return null;

  const optionsMatch = compactBlock.match(/\b(?:options?|choices?|answer choices?|விருப்பங்கள்|தேர்வுகள்)\s*[:–—-]?\s*/iu);
  const answerMatch = compactBlock.match(/\b(?:correct answer|answer|ans|correct option|பதில்|சரியான பதில்|விடை)\s*[:–—-]\s*/iu);
  const explanationMatch = compactBlock.match(/\b(?:detailed explanation|explanation|reason|விளக்கம்|காரணம்)\s*[:–—-]\s*/iu);

  if (!optionsMatch || optionsMatch.index === undefined) return null;

  const questionText = formatSpecialQuestion(compactBlock.slice(0, optionsMatch.index));
  const optionsStart = optionsMatch.index + optionsMatch[0].length;
  const optionsEnd = [answerMatch?.index, explanationMatch?.index, compactBlock.length]
    .filter((value): value is number => typeof value === 'number' && value >= optionsStart)
    .sort((a, b) => a - b)[0];
  const optionsText = compactBlock.slice(optionsStart, optionsEnd).trim();

  const options: QuestionOptions = { a: '', b: '', c: '', d: '' };
  parseInlineOptions(`Options: ${optionsText}`).forEach((token) => {
    options[token.key] = appendText(options[token.key], token.text);
  });

  let correctAnswer: OptionKey = 'a';
  if (answerMatch && answerMatch.index !== undefined) {
    const answerStart = answerMatch.index + answerMatch[0].length;
    const answerEnd =
      explanationMatch && explanationMatch.index !== undefined && explanationMatch.index > answerStart
        ? explanationMatch.index
        : compactBlock.length;
    correctAnswer = extractOptionKeyFromText(compactBlock.slice(answerStart, answerEnd)) || 'a';
  }

  const explanation =
    explanationMatch && explanationMatch.index !== undefined
      ? compactBlock.slice(explanationMatch.index + explanationMatch[0].length).trim()
      : '';

  if (!questionText || Object.values(options).filter(Boolean).length < 2) return null;

  return {
    id: Date.now() + idx,
    question: questionText,
    options,
    correct_answer: correctAnswer,
    explanation,
    status: 'PENDING',
    optionImages: { a: null, b: null, c: null, d: null },
    questionImage: null,
    explanationImage: null,
    subcategory,
  };
};

const FALLBACK_QUESTION_LIKE_REGEX =
  /^(?:what|which|who|whom|whose|why|how|when|where|explain|describe|define|discuss|compare|prove|show|list|name|mention|state|write|calculate|derive|கேள்வி|என்ன|எப்படி|ஏன்|விளக்குக|வரையறு|விவரி)\b/i;

export const parseLineByLine = (pastedContent: string, subcategory: string): DraftQuestion[] => {
  const questions: DraftQuestion[] = [];
  const lines = pastedContent.split('\n');
  let currentQuestion: DraftQuestion | null = null;
  let currentSection: 'question' | 'options' | 'answer' | 'explanation' | null = null;
  let currentOptionKey: OptionKey | null = null;

  const finalizeQuestion = () => {
    if (!currentQuestion) return;

    currentQuestion.question = formatSpecialQuestion(currentQuestion.question);
    currentQuestion.explanation = normalizeLine(currentQuestion.explanation);
    currentQuestion.options = {
      a: normalizeLine(currentQuestion.options.a),
      b: normalizeLine(currentQuestion.options.b),
      c: normalizeLine(currentQuestion.options.c),
      d: normalizeLine(currentQuestion.options.d),
    };

    if (currentQuestion.question) {
      questions.push(currentQuestion);
    }
  };

  const startQuestion = (questionText: string, idx: number) => {
    finalizeQuestion();
    currentQuestion = {
      id: Date.now() + idx,
      question: normalizeLine(questionText),
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: 'a',
      explanation: '',
      status: 'PENDING',
      optionImages: { a: null, b: null, c: null, d: null },
      questionImage: null,
      explanationImage: null,
      subcategory,
    };
    currentSection = 'question';
    currentOptionKey = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = normalizeLine(line);
    if (!trimmed && !currentQuestion) return;

    const qMatch = trimmed.match(QUESTION_START_REGEX);
    if (qMatch) {
      startQuestion(trimmed.slice(qMatch[0].length), idx);
      return;
    }

    if (!currentQuestion) {
      const fallbackQuestionLike = trimmed.match(FALLBACK_QUESTION_LIKE_REGEX);
      if (fallbackQuestionLike) {
        startQuestion(trimmed, idx);
      } else {
        return;
      }
    }

    const q = currentQuestion as DraftQuestion;

    const hasOptionsLabel = OPTIONS_LABEL_REGEX.test(trimmed);
    if (hasOptionsLabel) {
      currentSection = 'options';
      currentOptionKey = null;
    }

    const answerLabelMatch = trimmed.match(ANSWER_LABEL_REGEX);
    if (answerLabelMatch) {
      const answerValue = trimmed.slice(answerLabelMatch[0].length);
      const parsedAnswer = extractOptionKeyFromText(answerValue);
      if (parsedAnswer) {
        q.correct_answer = parsedAnswer;
      }
      currentSection = 'answer';
      currentOptionKey = null;
      return;
    }

    const explanationLabelMatch = trimmed.match(EXPLANATION_LABEL_REGEX);
    const isAssertionReasonLine = /^reason\s*\(R\)\s*:/i.test(trimmed);
    if (explanationLabelMatch && !isAssertionReasonLine) {
      q.explanation = appendText(q.explanation, trimmed.slice(explanationLabelMatch[0].length));
      currentSection = 'explanation';
      currentOptionKey = null;
      return;
    }

    const optionTokens = parseInlineOptions(trimmed);
    if (optionTokens.length > 0) {
      optionTokens.forEach((token) => {
        q.options[token.key] = appendText(q.options[token.key], token.text);
        currentOptionKey = token.key;
      });
      currentSection = 'options';
      return;
    }

    if (hasOptionsLabel) {
      return;
    }

    if (trimmed) {
      if (
        currentSection === 'question' ||
        (!q.options.a && !q.options.b && !q.options.c && !q.options.d && currentSection !== 'explanation')
      ) {
        q.question = appendText(q.question, trimmed);
      } else if (currentSection === 'explanation') {
        q.explanation = appendText(q.explanation, trimmed);
      } else if (currentSection === 'options' && currentOptionKey) {
        q.options[currentOptionKey] = appendText(q.options[currentOptionKey], trimmed);
      } else if (!q.explanation && q.options.d) {
        q.explanation = appendText(q.explanation, trimmed);
      }
    }
  });

  finalizeQuestion();

  return questions;
};
