import { useMemo } from 'react';
import type { ExamQuestion } from '../../types/models';

interface SectionTabsProps {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  activeIndex: number;
  onNavigate: (index: number) => void;
}

interface Group {
  name: string;
  indexes: number[];
}

/** Questions grouped by a field, in the order they first appear in the test. */
function groupBy(questions: ExamQuestion[], indexes: number[], key: 'part' | 'section'): Group[] {
  const groups: Group[] = [];
  for (const idx of indexes) {
    const name = (questions[idx][key] ?? '').trim();
    const last = groups.find((g) => g.name === name);
    if (last) last.indexes.push(idx);
    else groups.push({ name, indexes: [idx] });
  }
  return groups;
}

/** A tab bar of the test's parts. Picking one jumps to its first question. */
export default function SectionTabs({ questions, answers, activeIndex, onNavigate }: SectionTabsProps) {
  const all = useMemo(() => questions.map((_, i) => i), [questions]);
  const parts = useMemo(() => groupBy(questions, all, 'part').filter((g) => g.name), [questions, all]);

  const active = questions[activeIndex];
  const activePart = parts.find((p) => p.name === (active?.part ?? '').trim());

  if (parts.length === 0) return null;

  const answeredIn = (indexes: number[]) => indexes.filter((i) => !!answers[questions[i]._id]).length;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div role="tablist" aria-label="Test parts" className="no-scrollbar flex gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {parts.map((part) => {
          const isActive = part === activePart;
          return (
            <button
              key={part.name}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => !isActive && onNavigate(part.indexes[0])}
              className={[
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              {part.name}
              <span
                className={[
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {answeredIn(part.indexes)}/{part.indexes.length}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
