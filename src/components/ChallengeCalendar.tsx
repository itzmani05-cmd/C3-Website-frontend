import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyChallenge, DailyChallengeStatus } from '../types/models';

interface ChallengeCalendarProps {
  challenges: DailyChallenge[];
  onSelect: (challenge: DailyChallenge) => void;
  /** Called when an empty day that is today or later is clicked. */
  onCreate?: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// A day with a challenge is filled with its status colour; the date is all that is shown.
const STATUS_CELL: Record<DailyChallengeStatus, string> = {
  draft: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  scheduled: 'bg-warning-500 text-white hover:brightness-95',
  published: 'bg-success-500 text-white hover:brightness-95',
  expired: 'bg-danger-500 text-white hover:brightness-95',
};

const STATUS_DOT: Record<DailyChallengeStatus, string> = {
  draft: 'bg-slate-300',
  scheduled: 'bg-warning-500',
  published: 'bg-success-500',
  expired: 'bg-danger-500',
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** A month grid of daily challenges: each challenge sits on the day it starts, coloured by status. */
export default function ChallengeCalendar({ challenges, onSelect, onCreate }: ChallengeCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDay = useMemo(() => {
    const map = new Map<string, DailyChallenge[]>();
    for (const c of challenges) {
      const key = dayKey(new Date(c.startAt));
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return map;
  }, [challenges]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthCount = cells.reduce((sum, d) => sum + (d ? byDay.get(dayKey(d))?.length ?? 0 : 0), 0);
  const todayKey = dayKey(today);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shift = (by: number) => setCursor(new Date(year, month + by, 1));

  const navButton = 'inline-flex size-8 items-center justify-center rounded-md bg-white text-slate-600 shadow-soft-sm transition-colors hover:bg-slate-100 hover:text-slate-900';

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Row 1: what this is and how busy the month is. Row 2: month navigation. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Challenge Calendar</h3>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {monthCount} {monthCount === 1 ? 'challenge' : 'challenges'} this month
        </span>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center justify-between rounded-lg bg-slate-50 p-1">
          <button type="button" className={navButton} onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </button>
          <h4 className="font-heading text-base font-bold text-slate-900">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4>
          <button type="button" className={navButton} onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const items = byDay.get(dayKey(date)) ?? [];
          const isToday = dayKey(date) === todayKey;
          const base = 'flex h-9 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors';
          const ring = isToday ? ' ring-2 ring-brand-600 ring-offset-1' : '';

          if (items.length > 0) {
            const first = items[0];
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(first)}
                title={items.map((c) => `${c.title} (${c.status})`).join('\n')}
                className={[base, STATUS_CELL[first.status], ring].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          }
          if (onCreate && date >= startOfToday) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCreate(date)}
                title="Create a challenge on this day"
                className={[base, 'text-slate-600 hover:bg-brand-50 hover:text-brand-700', ring].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          }
          return (
            <div key={i} className={[base, 'text-slate-300', ring].join(' ')}>
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {(Object.keys(STATUS_DOT) as DailyChallengeStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5 capitalize">
            <span className={['size-2 rounded-full', STATUS_DOT[status]].join(' ')} aria-hidden="true" />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}
