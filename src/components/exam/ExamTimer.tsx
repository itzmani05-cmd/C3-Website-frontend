import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatTime } from '../../lib/examSession';

interface ExamTimerProps {
  /** Epoch ms when the exam ends, from the server's remaining time. */
  deadline: number | null;
  active: boolean;
  onExpire: () => void;
}

const WARNINGS: { at: number; message: string }[] = [
  { at: 300, message: '5 minutes left. Review any questions marked for review.' },
  { at: 60, message: '1 minute left — your test will be submitted automatically.' },
];

const secondsLeft = (deadline: number | null) => (deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

/** Owns the once-a-second tick so only this badge re-renders, not the whole exam page. */
export default function ExamTimer({ deadline, active, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadline));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const warnedRef = useRef<Set<number>>(new Set());
  const expiredRef = useRef(false);

  // A fresh deadline means a new exam (or a server re-sync): re-arm warnings and expiry.
  useEffect(() => {
    warnedRef.current = new Set(WARNINGS.filter((w) => secondsLeft(deadline) <= w.at).map((w) => w.at));
    expiredRef.current = false;
    setRemaining(secondsLeft(deadline));
  }, [deadline]);

  useEffect(() => {
    if (!active || deadline === null) return;
    const tick = () => {
      const left = secondsLeft(deadline);
      setRemaining(left);
      const warning = WARNINGS.find((w) => left > 0 && left <= w.at && !warnedRef.current.has(w.at));
      if (warning) {
        warnedRef.current.add(warning.at);
        toast.warning(warning.message, { autoClose: 8000 });
      }
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, deadline]);

  const isTimeCritical = remaining < 600;
  return (
    <div
      role="timer"
      aria-label={`Time remaining ${formatTime(remaining)}`}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums ring-1 ring-inset',
        isTimeCritical ? 'bg-danger-50 text-danger-700 ring-danger-600/20' : 'bg-slate-50 text-slate-800 ring-slate-300',
      ].join(' ')}
    >
      <Clock className="size-3.5" />
      <span aria-hidden="true">{formatTime(remaining)}</span>
    </div>
  );
}
