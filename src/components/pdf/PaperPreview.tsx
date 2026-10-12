import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import QuestionRenderer from '../QuestionRenderer';
import { formatCorrectAnswerLabel, getImagePreview } from '../../lib/helpers';
import { exportElementToWord } from '../../lib/wordExport';
import type { PaperSettings } from './PaperSettingsPanels';
import type { ExamQuestion, OptionKey } from '../../types/models';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];
const KEY_COLUMNS = 10;

interface PaperPreviewProps {
  questions: ExamQuestion[];
  settings: PaperSettings;
  /** Test name, or unit / topic / subtopic, printed under the subtitle. */
  sourceHeading: ReactNode;
}

/** The question paper as it will print, with Export Word / Export PDF. */
export default function PaperPreview({ questions, settings, sourceHeading }: PaperPreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const empty = questions.length === 0;

  // Printing renders a second copy of the paper straight under <body> (see .print-portal in index.css),
  // so the rest of the page is removed from the printout rather than only hidden.
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const finish = () => setPrinting(false);
    window.addEventListener('afterprint', finish);
    window.print();
    return () => window.removeEventListener('afterprint', finish);
  }, [printing]);

  return (
    <Card className="self-start p-4 sm:p-6">
      <div className="no-print -mx-4 -mt-4 mb-6 flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
          <p className="text-xs text-slate-500">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'} on the paper
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => documentRef.current && exportElementToWord(documentRef.current, settings.title, settings.fontSize)}
          disabled={empty}
        >
          Export Word
        </Button>
        <Button size="sm" onClick={() => setPrinting(true)} disabled={empty || printing} icon={<Download className="size-3.5" />}>
          Export PDF
        </Button>
      </div>

      {empty ? (
        <div className="flex flex-col items-center py-16 text-center">
          <FileText className="mb-3 size-8 text-slate-300" />
          <h4 className="font-semibold text-slate-700">No questions selected</h4>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Select filter criteria and check at least one question in the left panel to populate the assessment preview.
          </p>
        </div>
      ) : (
        <div className={`overflow-x-auto paper-size-${settings.fontSize}`}>
          <PaperDocument ref={documentRef} questions={questions} settings={settings} sourceHeading={sourceHeading} />
        </div>
      )}

      {printing &&
        createPortal(
          <div className={`print-portal paper-size-${settings.fontSize}`}>
            <PaperDocument questions={questions} settings={settings} sourceHeading={sourceHeading} />
          </div>,
          document.body
        )}
    </Card>
  );
}

const PaperDocument = forwardRef<HTMLDivElement, PaperPreviewProps>(function PaperDocument({ questions, settings, sourceHeading }, ref) {
  return (
    <div ref={ref} className="assessment-document">
      <PaperHeader settings={settings} sourceHeading={sourceHeading} />

      <div className={`questions-grid cols-${settings.columns} ${settings.columns === '2' ? 'grid grid-cols-2 gap-x-8' : 'flex flex-col'}`}>
        {questions.map((q, index) => (
          <PaperQuestion key={q._id} question={q} number={index + 1} previous={questions[index - 1]} showAnswer={settings.answerDisplay === 'each'} />
        ))}
      </div>

      {settings.answerDisplay === 'end-key' && <AnswerKey questions={questions} />}
      {settings.answerDisplay === 'end-explanations' && <AnswersWithExplanations questions={questions} />}
    </div>
  );
});

function PaperHeader({ settings, sourceHeading }: { settings: PaperSettings; sourceHeading: ReactNode }) {
  const instructions = settings.instructions.split('\n').filter((line) => line.trim() !== '');
  return (
    <div className="document-header mb-6 border-b-2 border-double border-slate-900 pb-4 text-center">
      <h1 className="doc-title text-xl font-bold uppercase tracking-tight">{settings.title}</h1>
      <p className="doc-subtitle mt-1 text-sm italic text-slate-600">{settings.subtitle}</p>
      <div className="curriculum-header mt-2 text-xs font-bold text-slate-700">
        <p>{sourceHeading}</p>
      </div>
      {settings.instructions && (
        <div className="doc-instructions mt-3 rounded-md border border-slate-300 p-3 text-left text-sm">
          <strong>General Instructions:</strong>
          <ul className="ml-5 mt-1 list-decimal">
            {instructions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface PaperQuestionProps {
  question: ExamQuestion;
  number: number;
  /** The question before this one, to print part / section headings where they change. */
  previous: ExamQuestion | undefined;
  showAnswer: boolean;
}

function PaperQuestion({ question: q, number, previous, showAnswer }: PaperQuestionProps) {
  const isNewPart = !!q.part && q.part !== previous?.part;
  const isNewSection = !!q.section && (q.part !== previous?.part || q.section !== previous?.section);

  // In two columns a heading takes the full width, ahead of the question's own cell.
  return (
    <>
      {(isNewPart || isNewSection) && (
        <div className="col-span-2">
          {isNewPart && <h2 className="part-header mb-2 mt-4 border-b-2 border-slate-800 pb-1 text-base font-bold uppercase tracking-tight">{q.part}</h2>}
          {isNewSection && (
            <h3 className="section-header mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
              {q.section}
              {typeof q.marks === 'number' && ` (${q.marks} mark${q.marks === 1 ? '' : 's'} each)`}
            </h3>
          )}
        </div>
      )}
      <div className="doc-question-card mb-5">
        <div className="doc-question-header mb-1.5">
          <span className="question-number font-bold">Q{number}.</span>
          <span className="question-body">
            <QuestionRenderer question={q} />
            {q.questionImage && (
              <div className="mt-2">
                <img src={getImagePreview(q.questionImage) ?? undefined} alt={`Question ${number}`} className="max-h-56 rounded-md border border-slate-200 object-contain" />
              </div>
            )}
          </span>
        </div>

        <div className="doc-options-grid ml-6 mb-3 flex flex-col gap-1">
          {!OPTION_KEYS.some((opt) => q.options?.[opt] || q.optionImages?.[opt]) && <div className="doc-answer-line text-sm">Answer: ____________________</div>}
          {OPTION_KEYS.map((opt) => {
            const text = q.options?.[opt];
            const imgUrl = q.optionImages?.[opt];
            if (!text && !imgUrl) return null;
            return (
              <div key={opt} className="doc-option-item text-sm">
                <span className="option-label font-bold">({opt.toUpperCase()})</span> {text && <span className="option-text">{text}</span>}
                {imgUrl && (
                  <div className="mt-1">
                    <img src={getImagePreview(imgUrl) ?? undefined} alt={`Option ${opt.toUpperCase()}`} className="max-h-32 rounded-md border border-slate-200" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showAnswer && (
          <div className="doc-inline-answer ml-6 mt-2 border-l-2 border-success-600 pl-2.5 text-success-600">
            <span className="answer-badge font-bold">Correct Answer: {formatCorrectAnswerLabel(q.correct_answer)}</span>
            {q.explanation && (
              <div className="explanation-text-box mt-1 text-xs text-slate-500">
                <strong>Explanation:</strong> {q.explanation}
                {q.explanationImage && (
                  <div className="mt-1">
                    <img src={getImagePreview(q.explanationImage) ?? undefined} alt="Explanation" className="max-h-40 rounded-md border border-slate-200" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Answers in rows of ten: Q1 … Q10 over their answers, then Q11 … Q20, and so on.
function AnswerKey({ questions }: { questions: ExamQuestion[] }) {
  const rows: ExamQuestion[][] = [];
  for (let i = 0; i < questions.length; i += KEY_COLUMNS) rows.push(questions.slice(i, i + KEY_COLUMNS));

  return (
    <div className="document-answer-key page-break-before mt-8 border-t-2 border-slate-900 pt-4">
      <h2 className="section-title mb-3 text-center text-lg font-bold uppercase">Answer Key</h2>
      <div>
        {rows.map((row, rowIdx) => (
          <table key={rowIdx} className="mb-4 w-full table-fixed border-collapse">
            <thead>
              <tr>
                {row.map((q, idx) => (
                  <th key={q._id} className="border border-black bg-slate-100 p-1.5 text-center text-xs font-bold">
                    Q{rowIdx * KEY_COLUMNS + idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {row.map((q) => (
                  <td key={q._id} className="border border-black p-2 text-center text-sm font-bold">
                    {formatCorrectAnswerLabel(q.correct_answer)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}

function AnswersWithExplanations({ questions }: { questions: ExamQuestion[] }) {
  return (
    <div className="document-explanations-key page-break-before mt-8 border-t-2 border-slate-900 pt-4">
      <h2 className="section-title mb-3 text-center text-lg font-bold uppercase">Answers &amp; Detailed Explanations</h2>
      <div className="flex flex-col gap-4">
        {questions.map((q, index) => (
          <div key={q._id} className="explanation-detail-item border-b border-dashed border-slate-300 pb-3">
            <h4 className="mb-1 text-sm font-bold">
              Q{index + 1}. Correct Answer: <span className="ans-highlight text-success-600">{formatCorrectAnswerLabel(q.correct_answer)}</span>
            </h4>
            <div className="original-q-text mb-2 whitespace-pre-wrap text-sm text-slate-600">
              <em>Question:</em> <QuestionRenderer question={q} />
            </div>
            {q.explanation ? (
              <div className="ex-content text-sm">
                <strong>Explanation:</strong> {q.explanation}
                {q.explanationImage && (
                  <div className="mt-1">
                    <img src={getImagePreview(q.explanationImage) ?? undefined} alt={`Explanation ${index + 1}`} className="max-h-40 rounded-md border border-slate-200" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No explanation provided for this question.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
