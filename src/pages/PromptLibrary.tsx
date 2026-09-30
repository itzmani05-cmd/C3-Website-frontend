import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Copy, ExternalLink, GraduationCap, Search, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Banner from '../components/ui/Banner';
import EmptyState from '../components/ui/EmptyState';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LoadingState } from '../components/ui/Spinner';
import {
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  MAX_QUESTION_COUNT,
  QUESTION_TYPE_LABELS,
  buildNotebookPrompt,
} from '../lib/promptBuilder';
import type { PromptConfig, PromptDifficulty, PromptLanguage, PromptQuestionType } from '../lib/promptBuilder';
import type { Exam } from '../types/models';

const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
const STORAGE_KEY = 'promptLibrary.lastConfig';

type FormState = Omit<PromptConfig, 'examName' | 'questionCount'> & { questionCount: string };

const DEFAULT_FORM: FormState = {
  bookName: '',
  questionCount: '25',
  chapter: '',
  difficulty: 'mixed',
  language: 'english',
  questionTypes: ['single'],
  extraInstructions: '',
};

const loadSavedForms = (): Record<string, FormState> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveForm = (examId: string, form: FormState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSavedForms(), [examId]: form }));
  } catch {
    // Storage unavailable; the prompt still works without remembered values.
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
};

export default function PromptLibrary() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await api.get<Exam[]>('/api/questions/exams');
        setExams(response.data || []);
      } catch (err) {
        setError('Failed to load exams from server.');
        console.error('Exam load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? exams.filter((ex) => ex.name.toLowerCase().includes(term)) : exams;
  }, [exams, search]);

  const openExam = (exam: Exam) => {
    setActiveExam(exam);
    setForm({ ...DEFAULT_FORM, ...loadSavedForms()[exam._id] });
    setFormError('');
    setPrompt('');
    setCopied(false);
  };

  const closeModal = () => setActiveExam(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const toggleType = (type: PromptQuestionType) => {
    setForm((prev) => {
      const has = prev.questionTypes.includes(type);
      if (has && prev.questionTypes.length === 1) return prev;
      const order = Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[];
      const next = has ? prev.questionTypes.filter((t) => t !== type) : [...prev.questionTypes, type];
      return { ...prev, questionTypes: order.filter((t) => next.includes(t)) };
    });
  };

  const handleGenerate = () => {
    if (!activeExam) return;
    const count = Number(form.questionCount);
    if (!form.bookName.trim()) {
      setFormError('Please enter the book name.');
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTION_COUNT) {
      setFormError(`Number of questions must be between 1 and ${MAX_QUESTION_COUNT}.`);
      return;
    }

    saveForm(activeExam._id, form);
    setPrompt(buildNotebookPrompt({ ...form, examName: activeExam.name, questionCount: count }));
    setCopied(false);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopied(true);
      toast.success('Prompt copied — paste it into NotebookLM.');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Could not copy automatically. Please select the text and copy it manually.');
    }
  };

  const pageHeader = (
    <div className="mb-6 flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Sparkles className="size-5" />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Prompt Library</h1>
        <p className="mt-0.5 text-sm text-slate-500">Generate NotebookLM prompts that return questions in Extractor-ready format</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {pageHeader}
        <LoadingState message="Loading exams..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {pageHeader}
        <Banner variant="error" message={error} />
      </div>
    );
  }

  const modalTitle = activeExam && (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <GraduationCap className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">{activeExam.name}</p>
        <p className="text-xs font-normal text-slate-400">{prompt ? 'Your prompt is ready' : 'Prompt details'}</p>
      </div>
    </div>
  );

  const modalFooter = prompt ? (
    <>
      <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setPrompt('')}>
        Edit details
      </Button>
      <Button
        variant="secondary"
        icon={<ExternalLink className="size-4" />}
        onClick={() => window.open(NOTEBOOKLM_URL, '_blank', 'noopener,noreferrer')}
      >
        Open NotebookLM
      </Button>
      <Button icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy prompt'}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={closeModal}>
        Cancel
      </Button>
      <Button icon={<Sparkles className="size-4" />} onClick={handleGenerate}>
        Generate prompt
      </Button>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      {pageHeader}

      <Card className="mb-6 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">How it works</h3>
        <ol className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
          {[
            ['Generate', 'Pick an exam, enter the book name and number of questions.'],
            ['Paste in NotebookLM', 'Upload the book as a source in NotebookLM and paste the copied prompt in the chat.'],
            ['Extract', 'Copy NotebookLM’s answer into the Extractor tab — it is already in the right format.'],
          ].map(([title, text], idx) => (
            <li key={title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                {idx + 1}
              </span>
              <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {exams.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-10" />}
          title="No exams yet"
          description="Add an exam under Manage Exams to start generating prompts."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">Exams</span>
              <h3 className="text-lg font-bold text-slate-900">
                {exams.length} {exams.length === 1 ? 'exam' : 'exams'} available
              </h3>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exams"
              leadingIcon={<Search className="size-4" />}
              wrapperClassName="w-full sm:w-72"
            />
          </div>

          {filteredExams.length === 0 ? (
            <EmptyState icon={<Search className="size-10" />} title="No exams match your search" />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredExams.map((exam, idx) => {
                const saved = loadSavedForms()[exam._id];
                return (
                  <Card key={exam._id} className="flex flex-wrap items-center justify-between gap-4 p-5 transition-shadow hover:shadow-soft-md">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-slate-900">{exam.name}</h4>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                          <BookOpen className="size-3.5 shrink-0" />
                          {saved?.bookName ? `Last used: ${saved.bookName}` : 'NotebookLM question prompt'}
                        </p>
                      </div>
                    </div>
                    <Button icon={<Sparkles className="size-4" />} onClick={() => openExam(exam)}>
                      Create prompt
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={!!activeExam} onClose={closeModal} title={modalTitle} footer={modalFooter} size="xl">
        {prompt ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-brand-100 px-2.5 py-1 font-semibold text-brand-700">{form.bookName}</span>
              {form.chapter && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{form.chapter}</span>}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{form.questionCount} questions</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{DIFFICULTY_LABELS[form.difficulty]}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{LANGUAGE_LABELS[form.language]}</span>
            </div>
            <pre className="scrollbar-thin max-h-[48vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700">
              {prompt}
            </pre>
            <p className="text-xs text-slate-400">
              Tip: upload the book as a source in NotebookLM first. For large question counts, NotebookLM may stop midway — reply “continue” and paste the rest into the Extractor too.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Book name *"
                value={form.bookName}
                onChange={(e) => updateForm('bookName', e.target.value)}
                placeholder="e.g. Strength of Materials"
                wrapperClassName="sm:col-span-2"
                autoFocus
              />
              <Input
                label="Number of questions *"
                type="number"
                min={1}
                max={MAX_QUESTION_COUNT}
                value={form.questionCount}
                onChange={(e) => updateForm('questionCount', e.target.value)}
              />
            </div>

            <Input
              label="Chapter / topic (optional)"
              value={form.chapter}
              onChange={(e) => updateForm('chapter', e.target.value)}
              placeholder="Leave empty to cover the whole book"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Difficulty" value={form.difficulty} onChange={(e) => updateForm('difficulty', e.target.value as PromptDifficulty)}>
                {(Object.keys(DIFFICULTY_LABELS) as PromptDifficulty[]).map((key) => (
                  <option key={key} value={key}>
                    {DIFFICULTY_LABELS[key]}
                  </option>
                ))}
              </Select>
              <Select label="Language" value={form.language} onChange={(e) => updateForm('language', e.target.value as PromptLanguage)}>
                {(Object.keys(LANGUAGE_LABELS) as PromptLanguage[]).map((key) => (
                  <option key={key} value={key}>
                    {LANGUAGE_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Question types</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).map((type) => {
                  const selected = form.questionTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      aria-pressed={selected}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                      ].join(' ')}
                    >
                      {selected && <Check className="size-3.5" />}
                      {QUESTION_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <Textarea
              label="Additional instructions (optional)"
              value={form.extraInstructions}
              onChange={(e) => updateForm('extraInstructions', e.target.value)}
              rows={3}
              placeholder="e.g. Focus on previous-year question patterns; include formula-based questions"
            />

            {formError && <p className="text-sm font-medium text-danger-600">{formError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
