import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Save, Trash2 } from 'lucide-react';
import QuestionForm from '../QuestionForm';
import QuestionPreview from './QuestionPreview';
import Button from '../ui/Button';
import { Input } from '../ui/Field';
import { findLatexErrors, useKatex } from '../../lib/latex';
import { isQuestionDirty } from '../../lib/bank';
import type { BankQuestion } from '../../lib/bank';

// ---------- LaTeX snippets ----------

interface Snippet {
  label: string;
  title: string;
  /** `|` marks where the caret (or the selected text) goes. */
  template: string;
  /** Insert as-is instead of wrapping in $…$ when the caret is outside a formula. */
  raw?: boolean;
}

const SNIPPETS: Snippet[] = [
  { label: '$…$', title: 'Inline math (wraps the selection)', template: '$|$', raw: true },
  { label: 'a/b', title: 'Fraction', template: '\\frac{|}{}' },
  { label: '√', title: 'Square root', template: '\\sqrt{|}' },
  { label: 'xⁿ', title: 'Superscript', template: '^{|}' },
  { label: 'xₙ', title: 'Subscript', template: '_{|}' },
  { label: '[ ]', title: 'Matrix (2×2)', template: '\\begin{bmatrix} | & \\\\ & \\end{bmatrix}' },
  { label: '∑', title: 'Summation', template: '\\sum_{i=1}^{n} |' },
  { label: '∫', title: 'Integral', template: '\\int_{a}^{b} | \\, dx' },
  { label: '×', title: 'Times', template: '\\times' },
  { label: '±', title: 'Plus or minus', template: '\\pm' },
  { label: '≤', title: 'Less than or equal', template: '\\le' },
  { label: '≥', title: 'Greater than or equal', template: '\\ge' },
  { label: '≠', title: 'Not equal', template: '\\ne' },
  { label: '°', title: 'Degree', template: '^{\\circ}' },
  { label: '→', title: 'Arrow', template: '\\rightarrow' },
  { label: 'α', title: 'alpha', template: '\\alpha' },
  { label: 'β', title: 'beta', template: '\\beta' },
  { label: 'γ', title: 'gamma', template: '\\gamma' },
  { label: 'θ', title: 'theta', template: '\\theta' },
  { label: 'λ', title: 'lambda', template: '\\lambda' },
  { label: 'π', title: 'pi', template: '\\pi' },
  { label: 'σ', title: 'sigma', template: '\\sigma' },
  { label: 'φ', title: 'phi', template: '\\phi' },
];

/** True when the caret sits inside an open $…$ (odd number of unescaped $ before it). */
const isInsideMath = (value: string, pos: number): boolean => (value.slice(0, pos).replace(/\\\$/g, '').match(/\$/g) ?? []).length % 2 === 1;

type TextField = HTMLInputElement | HTMLTextAreaElement;

function insertSnippet(el: TextField, snippet: Snippet) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const selected = el.value.slice(start, end);
  const wrap = !snippet.raw && !isInsideMath(el.value, start);
  const marker = snippet.template.indexOf('|');
  const body = marker >= 0 ? snippet.template.replace('|', selected) : snippet.template;
  const text = (wrap ? '$' : '') + body + (wrap ? '$' : '');
  const caret = start + (wrap ? 1 : 0) + (marker >= 0 ? marker + selected.length : body.length);

  // Set through the native setter and fire an input event so React's onChange sees it.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
  el.setSelectionRange(caret, caret);
}

// ---------- draft autosave ----------

const DRAFT_PREFIX = 'qb-draft:';
// Images are left out on purpose: they can be large and localStorage is small.
const DRAFT_FIELDS = ['question', 'explanation', 'options', 'correct_answer', 'answerType', 'year', 'source', 'marks', 'answerMin', 'answerMax', 'verified'] as const;

interface StoredDraft {
  savedAt: number;
  fields: Partial<BankQuestion>;
}

const readDraft = (key: string): StoredDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (key: string, draft: BankQuestion) => {
  try {
    const fields = Object.fromEntries(DRAFT_FIELDS.map((f) => [f, draft[f]]));
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ savedAt: Date.now(), fields }));
  } catch {
    /* storage full or unavailable: drafts are a convenience only */
  }
};
const clearDraft = (key: string) => {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
};

// ---------- component ----------

interface QuestionEditorProps {
  mode: 'new' | 'edit';
  /** Unique per question (or per topic for new questions); names the localStorage draft. */
  draftKey: string;
  initial: BankQuestion;
  /** Returns true when the save succeeded. */
  onSave: (draft: BankQuestion) => Promise<boolean>;
  onDelete?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** e.g. "Last edited by someone@example.com". */
  footnote?: string;
}

export default function QuestionEditor({ mode, draftKey, initial, onSave, onDelete, onCancel, onDirtyChange, footnote }: QuestionEditorProps) {
  const [draft, setDraft] = useState<BankQuestion>(initial);
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState<StoredDraft | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const lastField = useRef<TextField | null>(null);

  const dirty = useMemo(() => isQuestionDirty(draft, initial), [draft, initial]);
  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;

  // A leftover draft from an earlier session: offer to restore it.
  useEffect(() => {
    const stored = readDraft(draftKey);
    if (stored && isQuestionDirty({ ...initial, ...stored.fields }, initial)) setOffer(stored);
    else clearDraft(draftKey);
  }, [draftKey, initial]);

  useEffect(() => {
    onDirtyRef.current?.(dirty);
  }, [dirty]);
  useEffect(() => () => onDirtyRef.current?.(false), []);

  // Autosave while dirty. The draft is removed on save/discard, or when a stale one matches the saved question.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => writeDraft(draftKey, draft), 800);
    return () => clearTimeout(timer);
  }, [dirty, draft, draftKey]);

  // Warn before the tab is closed or reloaded with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const handleChange = useCallback((next: BankQuestion) => setDraft(next), []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (await onSave(draft)) clearDraft(draftKey);
    } finally {
      setSaving(false);
    }
  };

  const trackFocus = (e: React.FocusEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && ['text', ''].includes((t as HTMLInputElement).type))) lastField.current = t as TextField;
  };

  const onSnippet = (snippet: Snippet) => {
    const target = lastField.current && formRef.current?.contains(lastField.current) ? lastField.current : formRef.current?.querySelector('textarea');
    if (target) insertSnippet(target as TextField, snippet);
  };

  // Preview lags typing slightly so KaTeX isn't re-run on every keystroke.
  const shown = useDeferredValue(draft);
  const katex = useKatex();
  const problems = useMemo(() => {
    const found: string[] = [];
    if (!katex) return found;
    const check = (label: string, text?: string) => findLatexErrors(katex, text).forEach((p) => found.push(`${label}: ${p}`));
    check('Question', shown.question);
    (['a', 'b', 'c', 'd'] as const).forEach((k) => check(`Option ${k.toUpperCase()}`, shown.options?.[k]));
    check('Explanation', shown.explanation);
    return found;
  }, [katex, shown.question, shown.options, shown.explanation]);

  const numerical = draft.answerType === 'numerical';
  const numField = (field: 'year' | 'marks' | 'answerMin' | 'answerMax') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [field]: e.target.value === '' ? null : Number(e.target.value) });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div ref={formRef} onFocusCapture={trackFocus} className="min-w-0">
        {offer && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-500/40 bg-warning-soft px-4 py-3 text-sm text-warning-text">
            <span className="flex items-center gap-2">
              <RotateCcw className="size-4" /> Unsaved draft from {new Date(offer.savedAt).toLocaleString()} found.
            </span>
            <span className="flex gap-2">
              <Button size="sm" onClick={() => { setDraft({ ...draft, ...offer.fields }); setOffer(null); }}>Restore</Button>
              <Button size="sm" variant="secondary" onClick={() => { clearDraft(draftKey); setOffer(null); }}>Discard</Button>
            </span>
          </div>
        )}

        <div role="toolbar" aria-label="LaTeX snippets" className="sticky top-0 z-10 mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-soft-sm backdrop-blur">
          {SNIPPETS.map((s) => (
            <button
              key={s.title}
              type="button"
              title={s.title}
              aria-label={s.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSnippet(s)}
              className="min-w-8 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <Input label="Year asked" type="number" inputMode="numeric" placeholder="e.g. 2024" value={draft.year ?? ''} onChange={numField('year')} />
          <Input label="Marks" type="number" inputMode="numeric" min={0} placeholder="e.g. 2" value={draft.marks ?? ''} onChange={numField('marks')} />
          <Input label="Source (paper / set)" wrapperClassName="sm:col-span-2" placeholder="e.g. GATE CE 2024 SET-1" value={draft.source ?? ''} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
          {numerical && (
            <>
              <Input label="Accepted range: minimum" type="number" step="any" placeholder="optional" value={draft.answerMin ?? ''} onChange={numField('answerMin')} />
              <Input label="Accepted range: maximum" type="number" step="any" placeholder="optional" value={draft.answerMax ?? ''} onChange={numField('answerMax')} />
            </>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input type="checkbox" className="size-4 rounded border-slate-300 text-brand-600" checked={!!draft.verified} onChange={(e) => setDraft({ ...draft, verified: e.target.checked })} />
            Verified (reviewed and correct)
          </label>
        </div>

        <QuestionForm question={draft} onChange={handleChange} variant="fixer" />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} loading={saving} icon={<Save className="size-4" />}>
            {mode === 'new' ? 'Add Question' : 'Save Changes'}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" onClick={onDelete} icon={<Trash2 className="size-4" />}>
              Delete
            </Button>
          )}
          <span aria-live="polite" className={['text-xs font-semibold', dirty ? 'text-warning-text' : 'text-slate-400'].join(' ')}>
            {dirty ? '● Unsaved changes (draft autosaved)' : mode === 'edit' ? 'No changes' : ''}
          </span>
        </div>
        {footnote && <p className="mt-2 text-xs text-slate-400">{footnote}</p>}
      </div>

      <aside aria-label="Live preview" className="min-w-0 self-start xl:sticky xl:top-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Live preview{shown.source ? ` · ${shown.source}` : ''}
            {shown.year ? ` · ${shown.year}` : ''}
            {shown.marks ? ` · ${shown.marks} mark${shown.marks === 1 ? '' : 's'}` : ''}
          </p>

          {problems.length > 0 ? (
            <div role="alert" className="mb-4 rounded-lg border border-danger-500/30 bg-danger-soft px-3 py-2 text-xs text-danger-700">
              <p className="mb-1 flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-3.5" /> LaTeX problems ({problems.length})
              </p>
              <ul className="list-disc pl-4">
                {problems.slice(0, 5).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          ) : (
            shown.question?.includes('$') && (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-success-600">
                <CheckCircle2 className="size-3.5" /> All formulas parse
              </p>
            )
          )}

          <QuestionPreview question={shown} />
        </div>
      </aside>
    </div>
  );
}
