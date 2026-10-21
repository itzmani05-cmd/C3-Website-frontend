import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, FileWarning, Image as ImageIcon, Plus, Search } from 'lucide-react';
import api from '../api';
import { QUESTION_SOURCES, errorMessage } from '../lib/bank';
import type { BankQuestion, BankQuestionSummary, QuestionPage, QuestionSource } from '../lib/bank';
import QuestionPreview from './bank/QuestionPreview';
import { UsageDots } from './bank/UsageDots';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { Input, Select } from './ui/Field';
import MathText from './ui/MathText';
import Pagination from './ui/Pagination';
import { LoadingState } from './ui/Spinner';
import type { CurriculumTree } from '../types/models';

const PAGE_SIZE = 8;
const TYPE_LABEL: Record<string, string> = { single: 'MCQ', multiple: 'MSQ', numerical: 'NAT' };
const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold';

interface BankQuestionBrowserProps {
  examId: string;
  curriculum: CurriculumTree;
  /** Question Bank ids that are already in this challenge. */
  addedBankIds: Set<string>;
  isFull: boolean;
  addingId: string | null;
  onAdd: (question: BankQuestionSummary) => void;
  /** Shown when `isFull` is set, e.g. why nothing more can be added. */
  fullMessage?: string;
  /** Which collection to browse. Defaults to the Question Bank. */
  source?: QuestionSource;
}

/** Browse and search the Question Bank or the Practice Questions (by topic, or across the whole exam) and add questions to a Daily Challenge or a test. */
export default function BankQuestionBrowser({ examId, curriculum, addedBankIds, isFull, addingId, onAdd, fullMessage, source = 'bank' }: BankQuestionBrowserProps) {
  const { label: sourceLabel, endpoint } = QUESTION_SOURCES[source];
  const [topicId, setTopicId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<QuestionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // Search waits for a pause in typing; any new search starts from page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setPreviewId(null);
  }, [topicId, examId]);

  useEffect(() => {
    if (!examId) return;
    const requestId = ++latestRequest.current;
    setLoading(true);
    const scope = topicId ? { topicId } : { examId };
    api
      .get<QuestionPage>(endpoint, { params: { ...scope, ...(query ? { q: query } : {}), page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        if (requestId !== latestRequest.current) return;
        setResult(data);
        setError('');
        if (data.page !== page) setPage(data.page);
      })
      .catch((e) => requestId === latestRequest.current && setError(errorMessage(e)))
      .finally(() => requestId === latestRequest.current && setLoading(false));
  }, [examId, topicId, query, page, endpoint]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Select aria-label="Topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">All topics in this exam</option>
          {curriculum.map((unit) => (
            <optgroup key={unit._id} label={unit.name}>
              {unit.topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Input aria-label={`Search the ${sourceLabel}`} placeholder="Search here anything.." value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="size-4" />} />
      </div>

      {result && (
        <p className="text-xs text-slate-500">
          {result.total} {result.total === 1 ? 'question' : 'questions'} in the {sourceLabel}
        </p>
      )}

      {!result && loading ? (
        <LoadingState message={`Loading the ${sourceLabel}...`} rows={4} />
      ) : error && !result ? (
        <EmptyState title={`Could not load the ${sourceLabel}`} description={error} />
      ) : result && result.items.length === 0 ? (
        <EmptyState title="No questions found." description={query ? 'Try a different search or topic.' : `This topic has no questions in the ${sourceLabel} yet.`} />
      ) : (
        <div aria-busy={loading} className={['flex flex-col gap-2 transition-opacity', loading ? 'opacity-60' : ''].join(' ')}>
          {result?.items.map((q) => {
            const added = addedBankIds.has(q._id);
            const open = previewId === q._id;
            const hasImage = !!(q.hasQuestionImage || q.hasOptionImages || q.hasExplanationImage);
            const noExplanation = q.hasExplanation === false && !q.hasExplanationImage;
            return (
              <div
                key={q._id}
                className={['relative overflow-hidden rounded-lg border bg-white', added ? 'border-success-500/50' : 'border-slate-200'].join(' ')}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-3 break-words text-sm text-slate-800">
                      <MathText>{q.question || ''}</MathText>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {q.answerType && <span className={[pill, 'bg-slate-200/70 text-slate-600'].join(' ')}>{TYPE_LABEL[q.answerType] ?? q.answerType}</span>}
                      {q.year ? <span className={[pill, 'bg-slate-100 text-slate-500'].join(' ')}>{q.year}</span> : null}
                      {q.source ? <span className={[pill, 'max-w-48 truncate bg-slate-100 text-slate-500'].join(' ')}>{q.source}</span> : null}
                      <UsageDots usedInTest={q.usedInTest} usedInChallenge={q.usedInChallenge} />
{hasImage && <ImageIcon className="size-3.5 text-slate-400" aria-label="Has images" />}
                      {noExplanation && (
                        <span className={[pill, 'bg-warning-soft text-warning-text'].join(' ')} title="A challenge can't be published until every question has an explanation">
                          <FileWarning className="size-3" /> No explanation
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewId(open ? null : q._id)}
                        aria-expanded={open}
                        className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />} {open ? 'Hide' : 'Preview'}
                      </button>
                    </div>
                  </div>
                  {added ? (
                    <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-success-soft px-2.5 text-[13px] font-semibold text-success-600">
                      <Check className="size-3.5" /> Added
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      icon={<Plus className="size-3.5" />}
                      loading={addingId === q._id}
                      disabled={isFull || (addingId !== null && addingId !== q._id)}
                      onClick={() => onAdd(q)}
                    >
                      Add
                    </Button>
                  )}
                </div>
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <QuestionPreview question={q as unknown as BankQuestion} />
                  </div>
                )}
              </div>
            );
          })}
          {result && <Pagination page={result.page} totalPages={result.totalPages} totalItems={result.total} pageSize={PAGE_SIZE} onPageChange={setPage} />}
        </div>
      )}
      {isFull && fullMessage && <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">{fullMessage}</p>}
    </div>
  );
}
