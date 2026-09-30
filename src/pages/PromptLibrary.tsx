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
  formatPageRange,
  resizePlan,
  totalMarks,
} from '../lib/promptBuilder';
import type { PromptConfig, PromptDifficulty, PromptLanguage, PromptQuestionType, QuestionSlot } from '../lib/promptBuilder';
import type { Exam } from '../types/models';

const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
const STORAGE_KEY = 'promptLibrary.lastConfig';

type FormState = Omit<PromptConfig, 'examName'> & { questionCount: string };

const DEFAULT_QUESTION_COUNT = 10;
const PAGE_REGEX = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;

const DEFAULT_FORM: FormState = {
  bookName: '',
  questionCount: String(DEFAULT_QUESTION_COUNT),
  chapter: '',
  pageFrom: '',
  pageTo: '',
  difficulty: 'mixed',
  language: 'english',
  questionPlan: resizePlan([], DEFAULT_QUESTION_COUNT),
  extraInstructions: '',
};

const parseCount = (value: string): number | null => {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= MAX_QUESTION_COUNT ? count : null;
};

const PLAN_CONTROL_CLASSES =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

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
  const [bulkType, setBulkType] = useState<PromptQuestionType>('single');
  const [bulkMarks, setBulkMarks] = useState('1');

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
    const saved: FormState = { ...DEFAULT_FORM, ...loadSavedForms()[exam._id] };
    const count = parseCount(saved.questionCount) ?? DEFAULT_QUESTION_COUNT;
    setForm({ ...saved, questionCount: String(count), questionPlan: resizePlan(saved.questionPlan ?? [], count) });
    setFormError('');
    setPrompt('');
    setCopied(false);
  };

  const closeModal = () => setActiveExam(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const updateCount = (value: string) => {
    const count = parseCount(value);
    setForm((prev) => ({
      ...prev,
      questionCount: value,
      questionPlan: count ? resizePlan(prev.questionPlan, count) : prev.questionPlan,
    }));
    setFormError('');
  };

  const updateSlot = <K extends keyof QuestionSlot>(index: number, key: K, value: QuestionSlot[K]) => {
    setForm((prev) => ({
      ...prev,
      questionPlan: prev.questionPlan.map((slot, i) => (i === index ? { ...slot, [key]: value } : slot)),
    }));
    setFormError('');
  };

  const applyToAll = () => {
    setForm((prev) => ({
      ...prev,
      questionPlan: prev.questionPlan.map((slot) => ({ ...slot, type: bulkType, marks: bulkMarks.trim() || slot.marks })),
    }));
    setFormError('');
  };

  const handleGenerate = () => {
    if (!activeExam) return;
    const count = parseCount(form.questionCount);
    if (!form.bookName.trim()) {
      setFormError('Please enter the book name.');
      return;
    }
    if (!count) {
      setFormError(`Number of questions must be between 1 and ${MAX_QUESTION_COUNT}.`);
      return;
    }
    const pageFrom = Number(form.pageFrom);
    const pageTo = Number(form.pageTo);
    if (
      (form.pageFrom.trim() && (!Number.isInteger(pageFrom) || pageFrom < 1)) ||
      (form.pageTo.trim() && (!Number.isInteger(pageTo) || pageTo < 1))
    ) {
      setFormError('Page numbers must be whole numbers of 1 or more.');
      return;
    }
    if (form.pageFrom.trim() && form.pageTo.trim() && pageFrom > pageTo) {
      setFormError('"From page" cannot be after "To page".');
      return;
    }

    for (let i = 0; i < form.questionPlan.length; i++) {
      const slot = form.questionPlan[i];
      const marks = Number(slot.marks);
      if (!slot.marks.trim() || !(marks > 0)) {
        setFormError(`Question ${i + 1}: marks must be a number greater than 0.`);
        return;
      }
      const page = slot.page.trim();
      if (!page) continue;
      const pageMatch = page.match(PAGE_REGEX);
      if (!pageMatch) {
        setFormError(`Question ${i + 1}: page must be a number like 45 or a range like 45-46.`);
        return;
      }
      const start = Number(pageMatch[1]);
      const end = Number(pageMatch[2] ?? pageMatch[1]);
      if (start < 1 || start > end) {
        setFormError(`Question ${i + 1}: page range "${page}" is not valid.`);
        return;
      }
      if ((form.pageFrom.trim() && start < pageFrom) || (form.pageTo.trim() && end > pageTo)) {
        setFormError(`Question ${i + 1}: page ${page} is outside ${formatPageRange(form.pageFrom, form.pageTo).toLowerCase()}.`);
        return;
      }
    }

    const { questionCount: _count, ...config } = form;
    saveForm(activeExam._id, form);
    setPrompt(buildNotebookPrompt({ ...config, examName: activeExam.name }));
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
            ['Generate', 'Pick an exam, enter the book and number of questions, then set the type, marks and page for each question.'],
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
              {formatPageRange(form.pageFrom, form.pageTo) && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{formatPageRange(form.pageFrom, form.pageTo)}</span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{form.questionPlan.length} questions</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{totalMarks(form.questionPlan)} marks</span>
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
                onChange={(e) => updateCount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Input
                label="Chapter / topic (optional)"
                value={form.chapter}
                onChange={(e) => updateForm('chapter', e.target.value)}
                placeholder="Leave empty to cover the whole book"
                wrapperClassName="sm:col-span-2"
              />
              <Input
                label="From page"
                type="number"
                min={1}
                value={form.pageFrom}
                onChange={(e) => updateForm('pageFrom', e.target.value)}
                placeholder="e.g. 45"
              />
              <Input
                label="To page"
                type="number"
                min={1}
                value={form.pageTo}
                onChange={(e) => updateForm('pageTo', e.target.value)}
                placeholder="e.g. 60"
              />
            </div>

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

            <div className="rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Question plan</p>
                  <p className="text-xs text-slate-400">
                    {form.questionPlan.length} questions · {totalMarks(form.questionPlan)} marks · leave page empty to let NotebookLM choose
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Type for all questions"
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as PromptQuestionType)}
                    className={[PLAN_CONTROL_CLASSES, 'w-auto cursor-pointer'].join(' ')}
                  >
                    {(Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Marks for all questions"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={bulkMarks}
                    onChange={(e) => setBulkMarks(e.target.value)}
                    className={[PLAN_CONTROL_CLASSES, 'w-16'].join(' ')}
                  />
                  <Button variant="secondary" size="sm" onClick={applyToAll}>
                    Apply to all
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_5.5rem] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>#</span>
                <span>Type</span>
                <span>Marks</span>
                <span>Page</span>
              </div>
              <div className="scrollbar-thin max-h-72 overflow-y-auto px-4 py-2">
                {form.questionPlan.map((slot, idx) => (
                  <div key={idx} className="grid grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_5.5rem] items-center gap-2 py-1">
                    <span className="flex size-7 items-center justify-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
                      {idx + 1}
                    </span>
                    <select
                      aria-label={`Question ${idx + 1} type`}
                      value={slot.type}
                      onChange={(e) => updateSlot(idx, 'type', e.target.value as PromptQuestionType)}
                      className={[PLAN_CONTROL_CLASSES, 'cursor-pointer'].join(' ')}
                    >
                      {(Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).map((type) => (
                        <option key={type} value={type}>
                          {QUESTION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Question ${idx + 1} marks`}
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={slot.marks}
                      onChange={(e) => updateSlot(idx, 'marks', e.target.value)}
                      className={PLAN_CONTROL_CLASSES}
                    />
                    <input
                      aria-label={`Question ${idx + 1} page`}
                      value={slot.page}
                      onChange={(e) => updateSlot(idx, 'page', e.target.value)}
                      placeholder="Any"
                      className={PLAN_CONTROL_CLASSES}
                    />
                  </div>
                ))}
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
