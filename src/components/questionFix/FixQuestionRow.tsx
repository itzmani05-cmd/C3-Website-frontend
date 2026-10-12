import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import QuestionForm from '../QuestionForm';
import { formatCorrectAnswerLabel } from '../../lib/helpers';
import type { FixableQuestion } from './types';

interface FixQuestionRowProps {
  question: FixableQuestion;
  number: number;
  expanded: boolean;
  onToggle: () => void;
  /** Saves the edited copy. */
  onSave: (edited: FixableQuestion) => void;
  onDelete: () => void;
}

/** A question in the list; expanded, it is an editor working on its own copy until saved. */
export default function FixQuestionRow({ question: q, number, expanded, onToggle, onSave, onDelete }: FixQuestionRowProps) {
  return (
    <li className={expanded ? 'bg-slate-50/60' : ''}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="w-8 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{number}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{q.question}</span>
        {q.status && q.status !== 'accepted' && (
          <span
            className={[
              'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium capitalize',
              q.status === 'rejected' ? 'bg-danger-50 text-danger-600' : 'bg-slate-100 text-slate-600',
            ].join(' ')}
          >
            {q.status}
          </span>
        )}
        {q.part && q.section && (
          <span className="hidden shrink-0 text-xs text-slate-500 lg:inline">
            {q.part} · {q.section} · {q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? '' : 's'}
          </span>
        )}
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-slate-600">
          {formatCorrectAnswerLabel(q.correct_answer ?? q.correctAnswer)}
        </span>
        {expanded ? <ChevronUp className="size-4 shrink-0 text-slate-400" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
      </button>

      {expanded && <QuestionEditor question={q} onSave={onSave} onDelete={onDelete} />}
    </li>
  );
}

// Mounted only while expanded, so each opening starts from the saved question.
function QuestionEditor({ question, onSave, onDelete }: { question: FixableQuestion; onSave: (edited: FixableQuestion) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(question);
  return (
    <div className="border-t border-slate-200 px-4 pb-4 pt-4">
      <QuestionForm question={draft} onChange={(updated) => setDraft((prev) => ({ ...prev, ...updated }))} variant="fixer" />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="dangerOutline" onClick={onDelete}>
          Delete
        </Button>
        <Button onClick={() => onSave(draft)}>Save changes</Button>
      </div>
    </div>
  );
}
