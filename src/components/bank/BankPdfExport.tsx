import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api';
import { errorMessage, filtersToParams } from '../../lib/bank';
import type { BankFilters, BankQuestion, BankQuestionSummary, QuestionPage, Scope } from '../../lib/bank';
import { formatCorrectAnswerLabel, getImagePreview } from '../../lib/helpers';
import { loadKatex } from '../../lib/latex';
import QuestionRenderer from '../QuestionRenderer';
import Button from '../ui/Button';
import MathText from '../ui/MathText';
import Modal from '../ui/Modal';

type AnswerMode = 'none' | 'key' | 'explanations';
type PdfQuestion = BankQuestionSummary & BankQuestion;

interface BankPdfExportProps {
  open: boolean;
  onClose: () => void;
  /** Where to load questions from (Question Bank). Not needed when `questions` is given. */
  scope?: Scope;
  filters?: BankFilters;
  /** Questions that are already loaded, with their images (Question Fixer). Skips the Question Bank requests. */
  questions?: PdfQuestion[];
  topicName: string;
  examName: string;
}

const PAGE_LIMIT = 100; // the server's maximum page size
const IMAGE_FETCH_CONCURRENCY = 6;
const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const;
const KEY_COLUMN_SIZE = 40;

const ANSWER_MODES: { value: AnswerMode; label: string; hint: string }[] = [
  { value: 'none', label: 'Questions only', hint: 'A clean question paper with no answers.' },
  { value: 'key', label: 'With answer key', hint: 'Adds an answer key on a new page at the end.' },
  { value: 'explanations', label: 'With answers & explanations', hint: 'Adds each correct answer with its explanation at the end.' },
];

const answerLabel = (q: PdfQuestion): string => {
  if (q.answerType === 'numerical') {
    const { answerMin: min, answerMax: max } = q;
    if (min == null && max == null) return formatCorrectAnswerLabel(q.correct_answer as string);
    return max == null || min === max ? String(min) : `${min} to ${max}`;
  }
  return formatCorrectAnswerLabel(q.correct_answer as string | string[]);
};

const hasImage = (q: BankQuestionSummary) => q.hasQuestionImage || q.hasOptionImages || q.hasExplanationImage;

/** Runs `task` over `items` with a few requests in flight at a time. */
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await task(items[i]);
      }
    })
  );
  return results;
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// ---------- PDF building ----------

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_H = PAGE_H - MARGIN * 2 - 6; // leaves room for the page-number footer
const LOGO_ASPECT = 332 / 348;

const toDataUrl = async (url: string): Promise<string> => {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/** Draws each `[data-pdf-block]` of `root` onto A4 pages (never splitting a block across pages), adds the logo watermark and page numbers, and saves the file. */
async function buildPdf(root: HTMLElement, topicName: string, onProgress: (done: number, total: number) => void) {
  // Loaded on demand: these libraries are large and only needed when exporting.
  const [{ jsPDF }, { default: html2canvas }, logo] = await Promise.all([import('jspdf'), import('html2canvas-pro'), toDataUrl('/C3AppLogo.png')]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-block]'));

  let y = MARGIN;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const canvas = await html2canvas(block, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    let w = CONTENT_W;
    let h = (canvas.height / canvas.width) * w;
    if (h > CONTENT_H) {
      // A block taller than a page (rare) is shrunk to fit rather than cut.
      w = (CONTENT_H / h) * w;
      h = CONTENT_H;
    }
    const forcePage = block.hasAttribute('data-pdf-newpage');
    if ((forcePage && y > MARGIN) || y + h > MARGIN + CONTENT_H) {
      pdf.addPage();
      y = MARGIN;
    }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', MARGIN, y, w, h, undefined, 'FAST');
    y += h + 1.5;
    onProgress(i + 1, blocks.length);
  }

  const pages = pdf.getNumberOfPages();
  const wm = Math.min(120, CONTENT_W * 0.65);
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.saveGraphicsState();
    pdf.setGState(new (pdf as unknown as { GState: new (o: { opacity: number }) => object }).GState({ opacity: 0.08 }) as never);
    pdf.addImage(logo, 'PNG', (PAGE_W - wm) / 2, (PAGE_H - wm * LOGO_ASPECT) / 2, wm, wm * LOGO_ASPECT);
    pdf.restoreGraphicsState();
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`C3 - ${topicName}`, MARGIN, PAGE_H - 8);
    pdf.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
  const fileName = topicName.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'question-bank';
  pdf.save(`C3-${fileName}.pdf`);
}

/** Dialog that builds a PDF of every question matching the current topic and filters, with the C3 logo watermark, and downloads it. */
export type { PdfQuestion };
export default function BankPdfExport({ open, onClose, scope = {}, filters, questions: preloaded, topicName, examName }: BankPdfExportProps) {
  const [mode, setMode] = useState<AnswerMode>('none');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [questions, setQuestions] = useState<PdfQuestion[] | null>(null);

  // Once the paper is mounted off-screen: wait for formulas and images, draw it into a PDF block by block, and download it.
  useEffect(() => {
    if (!questions) return;
    let cancelled = false;
    (async () => {
      try {
        await nextPaint();
        const root = document.querySelector<HTMLElement>('.bank-pdf');
        if (!root) throw new Error('document not ready');
        const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
        await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
        await document.fonts?.ready;
        await nextPaint();
        await buildPdf(root, topicName, (done, total) => !cancelled && setProgress(`Creating PDF… ${done} of ${total}`));
        if (!cancelled) {
          toast.success('PDF downloaded.');
          onClose();
        }
      } catch (e) {
        if (!cancelled) toast.error('Could not create the PDF: ' + errorMessage(e));
      } finally {
        if (!cancelled) {
          setQuestions(null);
          setBusy(false);
          setProgress('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  const handleExport = async () => {
    setBusy(true);
    try {
      if (preloaded) {
        if (preloaded.length === 0) {
          toast.info('There are no questions to export.');
          setBusy(false);
          return;
        }
        setProgress('Preparing document…');
        await loadKatex();
        setQuestions(preloaded);
        return;
      }
      setProgress('Loading questions…');
      const params = filters ? filtersToParams(filters) : {};
      const first = (await api.get<QuestionPage>('/api/question-bank', { params: { ...scope, ...params, page: 1, limit: PAGE_LIMIT } })).data;
      const items = [...first.items];
      for (let page = 2; page <= first.totalPages; page++) {
        setProgress(`Loading questions… ${items.length} of ${first.total}`);
        items.push(...(await api.get<QuestionPage>('/api/question-bank', { params: { ...scope, ...params, page, limit: PAGE_LIMIT } })).data.items);
      }
      if (items.length === 0) {
        toast.info('There are no questions to export.');
        setBusy(false);
        setProgress('');
        return;
      }

      // The list leaves images out; fetch the full question only where it has one.
      const withImages = items.filter(hasImage);
      let done = 0;
      const full = await mapLimit(items, IMAGE_FETCH_CONCURRENCY, async (item): Promise<PdfQuestion> => {
        if (!hasImage(item)) return item;
        const { data } = await api.get<PdfQuestion>(`/api/question-bank/${item._id}`);
        setProgress(`Loading images… ${++done} of ${withImages.length}`);
        return { ...item, ...data };
      });

      setProgress('Preparing document…');
      await loadKatex();
      setQuestions(full);
    } catch (e) {
      toast.error('Could not prepare the PDF: ' + errorMessage(e));
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={busy ? () => undefined : onClose}
        title="Download as PDF"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleExport} loading={busy} icon={<FileDown className="size-4" />}>
              {busy ? progress || 'Preparing…' : 'Download PDF'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Downloads a PDF of every question in <strong>{topicName}</strong> that matches the current search and filters, with the C3 logo as a watermark on each
          page.
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">What to include</legend>
          {ANSWER_MODES.map((m) => (
            <label
              key={m.value}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors',
                mode === m.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <input type="radio" name="pdf-answer-mode" className="mt-1" checked={mode === m.value} disabled={busy} onChange={() => setMode(m.value)} />
              <span>
                <span className="block font-semibold text-slate-800">{m.label}</span>
                <span className="block text-xs text-slate-500">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Modal>

      {questions &&
        createPortal(
          <div
            className="bank-pdf"
            aria-hidden="true"
            style={{ position: 'fixed', left: -10000, top: 0, width: 720, background: '#fff', color: '#000', fontFamily: "'Times New Roman', Times, serif", fontSize: 14, lineHeight: 1.45 }}
          >
            <div data-pdf-block className="pb-2 pt-1 text-center">
              <p className="text-[26px] font-extrabold uppercase leading-tight tracking-[0.06em] text-brand-700">C³ Educational Platform</p>
              <p className="mt-1 text-xs tracking-wide text-slate-600">Lawley Rd, Signal, R.S. Puram, Coimbatore, Tamil Nadu 641003</p>
              <div className="mt-3 border-t-[3px] border-brand-700" />
              <div className="mt-px border-t border-brand-700" />
              <h1 className="mt-4 text-[22px] font-bold leading-snug text-slate-900">{topicName}</h1>
              <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600">
                {examName && <span>{examName}</span>}
                {examName && <span aria-hidden="true">•</span>}
                <span>
                  {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
                </span>
                <span aria-hidden="true">•</span>
                <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="mt-4 border-t border-slate-300" />
            </div>

            {questions.map((q, index) => (
              <div key={q._id} data-pdf-block className="pb-3 pt-3">
                <div className="flex gap-2">
                  <span className="font-bold">Q{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <QuestionRenderer question={q} />
                    {q.questionImage && <img src={getImagePreview(q.questionImage) ?? undefined} alt="" className="mt-2 max-h-56 object-contain" />}
                  </div>
                </div>
                <div className="ml-7 mt-2 flex flex-col gap-1">
                  {OPTION_KEYS.map((k) => {
                    const text = q.options?.[k];
                    const image = q.optionImages?.[k];
                    if (!text && !image) return null;
                    return (
                      <div key={k} className="text-sm">
                        <span className="font-bold">({k.toUpperCase()})</span> {text && <MathText>{text}</MathText>}
                        {image && <img src={getImagePreview(image) ?? undefined} alt="" className="mt-1 max-h-32" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {mode === 'key' && (
              <>
                <h2 data-pdf-block data-pdf-newpage className="pb-3 text-center text-lg font-bold uppercase">
                  Answer Key
                </h2>
                {Array.from({ length: Math.ceil(questions.length / KEY_COLUMN_SIZE) }, (_, c) => (
                  <div key={c} data-pdf-block className="grid grid-cols-4 gap-x-4 gap-y-1.5 pb-2 text-sm">
                    {questions.slice(c * KEY_COLUMN_SIZE, (c + 1) * KEY_COLUMN_SIZE).map((q, j) => (
                      <div key={q._id}>
                        <strong>Q{c * KEY_COLUMN_SIZE + j + 1}.</strong> {answerLabel(q)}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {mode === 'explanations' && (
              <>
                <h2 data-pdf-block data-pdf-newpage className="pb-3 text-center text-lg font-bold uppercase">
                  Answers &amp; Explanations
                </h2>
                {questions.map((q, index) => (
                  <div key={q._id} data-pdf-block className="border-b border-dashed border-slate-300 pb-2 pt-2 text-sm">
                    <p className="font-bold">
                      Q{index + 1}. Correct answer: {answerLabel(q)}
                    </p>
                    {q.explanation ? (
                      <p className="mt-1">
                        <strong>Explanation:</strong> <MathText>{q.explanation}</MathText>
                      </p>
                    ) : (
                      <p className="mt-1 italic text-slate-400">No explanation provided.</p>
                    )}
                    {q.explanationImage && <img src={getImagePreview(q.explanationImage) ?? undefined} alt="" className="mt-1 max-h-40" />}
                  </div>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
