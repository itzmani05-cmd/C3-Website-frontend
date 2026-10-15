import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Copy, ExternalLink, GraduationCap, Plus, Search, Sparkles, Trash2, Trophy } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
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
  DAILY_CHALLENGE_MAX_QUESTIONS,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  MAX_QUESTION_COUNT,
  NOTEBOOKLM_CHAR_LIMIT,
  QUESTION_TYPE_LABELS,
  buildDailyChallengePrompt,
  buildNotebookPrompts,
  createRow,
  totalMarks,
  totalQuestions,
} from '../lib/promptBuilder';
import type { DailyChallengePromptConfig, PagePlanRow, PromptConfig, PromptDifficulty, PromptLanguage, PromptQuestionType } from '../lib/promptBuilder';
import type { Exam } from '../types/models';

const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
const STORAGE_KEY = 'promptLibrary.questionNoConfig';
const DAILY_STORAGE_KEY = 'promptLibrary.dailyChallengeConfig';

type FormState = Omit<PromptConfig, 'examName'>;
type DailyFormState = Omit<DailyChallengePromptConfig, 'examName'>;
type PromptKind = 'bank' | 'daily';

const PAGE_REGEX = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;

const DEFAULT_FORM: FormState = {
  bookName: '',
  chapter: '',
  difficulty: 'mixed',
  language: 'english',
  pagePlan: [createRow()],
  extraInstructions: '',
};

const DEFAULT_DAILY_FORM: DailyFormState = {
  bookName: '',
  chapter: '',
  pages: '',
  questionCount: DAILY_CHALLENGE_MAX_QUESTIONS,
  difficulty: 'mixed',
  language: 'english',
  types: ['single'],
  extraInstructions: '',
};

const PLAN_CONTROL_CLASSES =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const PLAN_GRID = 'grid grid-cols-[2.25rem_5rem_6rem_minmax(0,1fr)_4.5rem_2rem] gap-2';

const loadSavedForms = <T,>(key = STORAGE_KEY): Record<string, T> => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
};

const saveForm = <T,>(examId: string, form: T, key = STORAGE_KEY) => {
  try {
    localStorage.setItem(key, JSON.stringify({ ...loadSavedForms<T>(key), [examId]: form }));
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
  const [kind, setKind] = useState<PromptKind>('bank');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [dailyForm, setDailyForm] = useState<DailyFormState>(DEFAULT_DAILY_FORM);
  const [formError, setFormError] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [copiedPart, setCopiedPart] = useState<number | null>(null);

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

  const openExam = (exam: Exam, nextKind: PromptKind) => {
    setActiveExam(exam);
    setKind(nextKind);
    const saved: FormState = { ...DEFAULT_FORM, ...loadSavedForms<FormState>()[exam._id] };
    setForm({ ...saved, pagePlan: saved.pagePlan?.length ? saved.pagePlan : [createRow()] });
    setDailyForm({ ...DEFAULT_DAILY_FORM, ...loadSavedForms<DailyFormState>(DAILY_STORAGE_KEY)[exam._id] });
    setFormError('');
    setPrompts([]);
    setCopiedPart(null);
  };

  const closeModal = () => setActiveExam(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const updateDailyForm = <K extends keyof DailyFormState>(key: K, value: DailyFormState[K]) => {
    setDailyForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const toggleDailyType = (type: PromptQuestionType) => {
    setDailyForm((prev) => {
      const types = prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      return { ...prev, types };
    });
    setFormError('');
  };

  const updateRow = <K extends keyof PagePlanRow>(index: number, key: K, value: PagePlanRow[K]) => {
    setForm((prev) => ({
      ...prev,
      pagePlan: prev.pagePlan.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
    setFormError('');
  };

  const addRow = () => {
    setForm((prev) => {
      const last = prev.pagePlan[prev.pagePlan.length - 1];
      // Same page and the next question number (1.1 -> 1.2), so a page's questions are quick to enter.
      return { ...prev, pagePlan: [...prev.pagePlan, createRow(last)] };
    });
    setFormError('');
  };

  const removeRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      pagePlan: prev.pagePlan.length > 1 ? prev.pagePlan.filter((_, i) => i !== index) : prev.pagePlan,
    }));
    setFormError('');
  };

  const handleGenerateDaily = () => {
    if (!activeExam) return;
    if (!dailyForm.bookName.trim()) {
      setFormError('Please enter the book name.');
      return;
    }
    const pages = dailyForm.pages.trim();
    const pageMatch = pages ? pages.match(PAGE_REGEX) : null;
    if (pages && (!pageMatch || Number(pageMatch[1]) < 1 || Number(pageMatch[1]) > Number(pageMatch[2] ?? pageMatch[1]))) {
      setFormError('PDF pages must be a number like 45 or a range like 45-52.');
      return;
    }
    const count = Number(dailyForm.questionCount);
    if (!Number.isInteger(count) || count < 1 || count > DAILY_CHALLENGE_MAX_QUESTIONS) {
      setFormError(`Number of questions must be between 1 and ${DAILY_CHALLENGE_MAX_QUESTIONS}.`);
      return;
    }
    if (dailyForm.types.length === 0) {
      setFormError('Pick at least one question type.');
      return;
    }

    saveForm(activeExam._id, dailyForm, DAILY_STORAGE_KEY);
    setPrompts([buildDailyChallengePrompt({ ...dailyForm, questionCount: count, examName: activeExam.name })]);
    setCopiedPart(null);
  };

  const handleGenerate = () => {
    if (!activeExam) return;
    if (kind === 'daily') {
      handleGenerateDaily();
      return;
    }
    if (!form.bookName.trim()) {
      setFormError('Please enter the book name.');
      return;
    }

    for (let i = 0; i < form.pagePlan.length; i++) {
      const row = form.pagePlan[i];
      const label = `Row ${i + 1}`;
      if (!(Number(row.marks) > 0)) {
        setFormError(`${label}: marks must be a number greater than 0.`);
        return;
      }
      const page = row.page.trim();
      if (!page) continue;
      const pageMatch = page.match(PAGE_REGEX);
      if (!pageMatch) {
        setFormError(`Row ${i + 1}: PDF page must be a number like 45 or a range like 45-46.`);
        return;
      }
      const start = Number(pageMatch[1]);
      const end = Number(pageMatch[2] ?? pageMatch[1]);
      if (start < 1 || start > end) {
        setFormError(`Row ${i + 1}: page range "${page}" is not valid.`);
        return;
      }
    }

    const total = totalQuestions(form.pagePlan);
    if (total > MAX_QUESTION_COUNT) {
      setFormError(`Total questions is ${total}; the maximum is ${MAX_QUESTION_COUNT}.`);
      return;
    }

    saveForm(activeExam._id, form);
    setPrompts(buildNotebookPrompts({ ...form, examName: activeExam.name }));
    setCopiedPart(null);
  };

  const handleCopy = async (part: number) => {
    const ok = await copyToClipboard(prompts[part]);
    if (ok) {
      setCopiedPart(part);
      toast.success(
        prompts.length > 1 ? `Part ${part + 1} copied — paste it into NotebookLM.` : 'Prompt copied — paste it into NotebookLM.'
      );
      setTimeout(() => setCopiedPart((current) => (current === part ? null : current)), 2500);
    } else {
      toast.error('Could not copy automatically. Please select the text and copy it manually.');
    }
  };

  const pageHeader = (
    <PageHeader title="Prompt Library" description="Generate NotebookLM prompts that return questions in Extractor-ready format" />
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

  const planQuestions = totalQuestions(form.pagePlan);
  const planMarks = totalMarks(form.pagePlan);

  const modalTitle = activeExam && (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <GraduationCap className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">{activeExam.name}</p>
        <p className="text-xs font-normal text-slate-400">
          {kind === 'daily' ? 'Daily Challenge prompt' : 'Question bank prompt'} · {prompts.length ? 'ready to copy' : 'details'}
        </p>
      </div>
    </div>
  );

  const modalFooter = prompts.length ? (
    <>
      <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setPrompts([])}>
        Edit details
      </Button>
      <Button
        variant="secondary"
        icon={<ExternalLink className="size-4" />}
        onClick={() => window.open(NOTEBOOKLM_URL, '_blank', 'noopener,noreferrer')}
      >
        Open NotebookLM
      </Button>
      {prompts.length === 1 && (
        <Button icon={copiedPart === 0 ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => handleCopy(0)}>
          {copiedPart === 0 ? 'Copied' : 'Copy prompt'}
        </Button>
      )}
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
            ['Generate', 'Pick an exam, enter the book, then add a row for each question: its PDF page, its question number on that page (e.g. 1.1), type and marks.'],
            ['Paste in NotebookLM', 'Upload the book as a source in NotebookLM and paste the copied prompt in the chat. Long plans are split into parts — paste them one by one.'],
            ['Extract', 'Copy NotebookLM’s answer into the Extractor tab — or, for a Daily Challenge prompt, into the question picker on the Daily Challenge tab.'],
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
                const saved = loadSavedForms<FormState>()[exam._id];
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
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" icon={<Trophy className="size-4" />} onClick={() => openExam(exam, 'daily')}>
                        Daily Challenge prompt
                      </Button>
                      <Button icon={<Sparkles className="size-4" />} onClick={() => openExam(exam, 'bank')}>
                        Question bank prompt
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={!!activeExam} onClose={closeModal} title={modalTitle} footer={modalFooter} size="xl">
        {prompts.length ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {(kind === 'daily'
                ? [
                    dailyForm.bookName,
                    dailyForm.chapter,
                    dailyForm.pages && `PDF pages ${dailyForm.pages}`,
                    `${dailyForm.questionCount} questions`,
                    DIFFICULTY_LABELS[dailyForm.difficulty],
                    LANGUAGE_LABELS[dailyForm.language],
                  ]
                : [
                    form.bookName,
                    form.chapter,
                    `${planQuestions} questions`,
                    `${planMarks} marks`,
                    DIFFICULTY_LABELS[form.difficulty],
                    LANGUAGE_LABELS[form.language],
                  ]
              )
                .filter(Boolean)
                .map((chip, idx) => (
                  <span
                    key={idx}
                    className={[
                      'rounded-full px-2.5 py-1 font-semibold',
                      idx === 0 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {chip}
                  </span>
                ))}
            </div>
            {prompts.length > 1 && (
              <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-medium text-brand-700">
                This plan is split into {prompts.length} parts to stay under NotebookLM’s {NOTEBOOKLM_CHAR_LIMIT.toLocaleString()}-character limit.
                Paste Part 1, wait for the answer, then paste the next part in the same chat.
              </p>
            )}
            <div className="scrollbar-thin flex max-h-[52vh] flex-col gap-3 overflow-y-auto">
              {prompts.map((text, part) => (
                <div key={part} className="rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {prompts.length > 1 ? `Part ${part + 1} of ${prompts.length}` : 'Prompt'} · {text.length.toLocaleString()} characters
                    </span>
                    {prompts.length > 1 && (
                      <Button
                        size="sm"
                        variant={copiedPart === part ? 'secondary' : 'primary'}
                        icon={copiedPart === part ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        onClick={() => handleCopy(part)}
                      >
                        {copiedPart === part ? 'Copied' : `Copy part ${part + 1}`}
                      </Button>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-slate-700">{text}</pre>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              {kind === 'daily'
                ? 'Tip: upload the book as a source in NotebookLM first, then paste the answer into the question picker on the Daily Challenge tab and click Extract.'
                : 'Tip: upload the book as a source in NotebookLM first. If NotebookLM stops midway, reply “continue” and paste the rest into the Extractor too.'}
            </p>
          </div>
        ) : kind === 'daily' ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Book name *"
                value={dailyForm.bookName}
                onChange={(e) => updateDailyForm('bookName', e.target.value)}
                placeholder="e.g. Strength of Materials"
                autoFocus
              />
              <Input
                label="Chapter / topic (optional)"
                value={dailyForm.chapter}
                onChange={(e) => updateDailyForm('chapter', e.target.value)}
                placeholder="e.g. Shear force and bending moment"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Input
                label="PDF pages (optional)"
                value={dailyForm.pages}
                onChange={(e) => updateDailyForm('pages', e.target.value)}
                placeholder="e.g. 45-52"
              />
              <Select
                label="Questions"
                value={String(dailyForm.questionCount)}
                onChange={(e) => updateDailyForm('questionCount', Number(e.target.value))}
              >
                {Array.from({ length: DAILY_CHALLENGE_MAX_QUESTIONS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <Select
                label="Difficulty"
                value={dailyForm.difficulty}
                onChange={(e) => updateDailyForm('difficulty', e.target.value as PromptDifficulty)}
              >
                {(Object.keys(DIFFICULTY_LABELS) as PromptDifficulty[]).map((key) => (
                  <option key={key} value={key}>
                    {DIFFICULTY_LABELS[key]}
                  </option>
                ))}
              </Select>
              <Select
                label="Language"
                value={dailyForm.language}
                onChange={(e) => updateDailyForm('language', e.target.value as PromptLanguage)}
              >
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
                  const active = dailyForm.types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDailyType(type)}
                      className={[
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      ].join(' ')}
                    >
                      {active && <Check className="size-3.5" />}
                      {QUESTION_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                A Daily Challenge holds up to {DAILY_CHALLENGE_MAX_QUESTIONS} questions. Pick several types to get a mix.
              </p>
            </div>

            <Textarea
              label="Additional instructions (optional)"
              value={dailyForm.extraInstructions}
              onChange={(e) => updateDailyForm('extraInstructions', e.target.value)}
              rows={3}
              placeholder="e.g. Focus on formulas students often confuse"
            />

            {formError && <p className="text-sm font-medium text-danger-600">{formError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Book name *"
                value={form.bookName}
                onChange={(e) => updateForm('bookName', e.target.value)}
                placeholder="e.g. Strength of Materials"
                autoFocus
              />
              <Input
                label="Chapter / topic (optional)"
                value={form.chapter}
                onChange={(e) => updateForm('chapter', e.target.value)}
                placeholder="Leave empty to cover the whole book"
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
                  <p className="text-sm font-semibold text-slate-800">Questions</p>
                  <p className="text-xs text-slate-400">
                    {planQuestions} questions · {planMarks} marks · one row per question · PDF page = the number in your PDF viewer · Question no. = as printed on that page (e.g. 1.1); leave empty for a new question
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={addRow}>
                  Add question
                </Button>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[30rem]">
                  <div className={`${PLAN_GRID} border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
                    <span>#</span>
                    <span>PDF page</span>
                    <span>Question no.</span>
                    <span>Type</span>
                    <span>Marks</span>
                    <span />
                  </div>
                  <div className="scrollbar-thin max-h-72 overflow-y-auto px-4 py-2">
                    {form.pagePlan.map((row, idx) => (
                      <div key={idx} className={`${PLAN_GRID} items-center py-1`}>
                        <span className="flex size-7 items-center justify-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
                          {idx + 1}
                        </span>
                        <input
                          aria-label={`Row ${idx + 1} PDF page`}
                          value={row.page}
                          onChange={(e) => updateRow(idx, 'page', e.target.value)}
                          placeholder="Any"
                          className={PLAN_CONTROL_CLASSES}
                        />
                        <input
                          aria-label={`Row ${idx + 1} question number`}
                          value={row.questionNo}
                          onChange={(e) => updateRow(idx, 'questionNo', e.target.value)}
                          placeholder="e.g. 1.1"
                          className={PLAN_CONTROL_CLASSES}
                        />
                        <select
                          aria-label={`Row ${idx + 1} type`}
                          value={row.type}
                          onChange={(e) => updateRow(idx, 'type', e.target.value as PromptQuestionType)}
                          className={[PLAN_CONTROL_CLASSES, 'cursor-pointer'].join(' ')}
                        >
                          {(Object.keys(QUESTION_TYPE_LABELS) as PromptQuestionType[]).map((type) => (
                            <option key={type} value={type}>
                              {QUESTION_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label={`Row ${idx + 1} marks`}
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={row.marks}
                          onChange={(e) => updateRow(idx, 'marks', e.target.value)}
                          className={PLAN_CONTROL_CLASSES}
                        />
                        <button
                          type="button"
                          aria-label={`Remove row ${idx + 1}`}
                          onClick={() => removeRow(idx)}
                          disabled={form.pagePlan.length === 1}
                          className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
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
