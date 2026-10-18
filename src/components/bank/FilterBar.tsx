import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../ui/Field';
import { ANSWER_TYPE_LABEL, activeFilterChips, EMPTY_FILTERS } from '../../lib/bank';
import type { BankFilters } from '../../lib/bank';

interface FilterBarProps {
  filters: BankFilters;
  onChange: (next: BankFilters) => void;
  /** Number of questions matching, shown next to the chips. */
  total?: number;
  loading?: boolean;
  /** Shown at the start of the row, before the search box (e.g. the topic name). */
  leading?: ReactNode;
  /** Extra controls shown to the right of the Filters button (e.g. an actions menu). */
  actions?: ReactNode;
}

const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

const CHECK = 'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors';

export default function FilterBar({ filters, onChange, total, loading, leading, actions }: FilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [text, setText] = useState(filters.q);
  const latest = useRef(filters);
  latest.current = filters;

  // Typing updates the box immediately but only queries the server once typing pauses.
  useEffect(() => {
    if (text === latest.current.q) return;
    const timer = setTimeout(() => onChange({ ...latest.current, q: text }), 350);
    return () => clearTimeout(timer);
  }, [text, onChange]);

  // Keep the box in sync when filters change from elsewhere (chip removed, "Clear all", URL navigation).
  useEffect(() => {
    setText(filters.q);
  }, [filters.q]);

  const chips = activeFilterChips(filters);
  const advancedCount = chips.filter((c) => c.key !== 'q').length;

  const checkClass = (on: boolean) => [CHECK, on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'].join(' ');

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        <div className="min-w-[180px] flex-1">
          <Input
            aria-label="Search questions"
            placeholder="Search here anything.."
            value={text}
            onChange={(e) => setText(e.target.value)}
            leadingIcon={<Search className="size-4" />}
          />
        </div>
        {/* Filters and the actions menu stay together: they never wrap onto separate lines. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Filters"
            title="Filters"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
            className={[
              'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors',
              panelOpen || advancedCount ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            <SlidersHorizontal className="size-4" />
            {advancedCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{advancedCount}</span>}
          </button>
          {actions}
        </div>
      </div>

      {panelOpen && (
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft-sm sm:grid-cols-2 xl:grid-cols-3">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Year asked</legend>
            <div className="flex items-center gap-2">
              <Input aria-label="From year" type="number" inputMode="numeric" placeholder="From" min={1990} max={2100} value={filters.yearFrom} onChange={(e) => onChange({ ...filters, yearFrom: e.target.value })} />
              <span className="text-slate-400">–</span>
              <Input aria-label="To year" type="number" inputMode="numeric" placeholder="To" min={1990} max={2100} value={filters.yearTo} onChange={(e) => onChange({ ...filters, yearTo: e.target.value })} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Answer type</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ANSWER_TYPE_LABEL).map(([value, label]) => (
                <label key={value} className={checkClass(filters.answerType.includes(value))}>
                  <input type="checkbox" className="sr-only" checked={filters.answerType.includes(value)} onChange={() => onChange({ ...filters, answerType: toggleIn(filters.answerType, value) })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Marks</legend>
            <div className="flex flex-wrap gap-2">
              {['1', '2'].map((m) => (
                <label key={m} className={checkClass(filters.marks.includes(m))}>
                  <input type="checkbox" className="sr-only" checked={filters.marks.includes(m)} onChange={() => onChange({ ...filters, marks: toggleIn(filters.marks, m) })} />
                  {m} mark{m === '1' ? '' : 's'}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
            <label className={checkClass(filters.hasImage)}>
              <input type="checkbox" className="sr-only" checked={filters.hasImage} onChange={() => onChange({ ...filters, hasImage: !filters.hasImage })} />
              Has image
            </label>
            <label className={checkClass(filters.missingExplanation)}>
              <input type="checkbox" className="sr-only" checked={filters.missingExplanation} onChange={() => onChange({ ...filters, missingExplanation: !filters.missingExplanation })} />
              Missing explanation
            </label>
            <label className={checkClass(filters.rangeAnswer)}>
              <input type="checkbox" className="sr-only" checked={filters.rangeAnswer} onChange={() => onChange({ ...filters, rangeAnswer: !filters.rangeAnswer })} />
              Numerical range answer
            </label>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-700">
              {chip.label}
              <button type="button" aria-label={`Remove filter: ${chip.label}`} onClick={() => onChange(chip.clear(filters))} className="rounded-full p-0.5 hover:bg-brand-200">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
            Clear all
          </button>
          {total !== undefined && (
            <span className={['ml-auto text-xs text-slate-500', loading ? 'opacity-60' : ''].join(' ')}>
              <span className="font-semibold text-slate-700">{total}</span> matching
            </span>
          )}
        </div>
      )}
    </div>
  );
}
