import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ScientificCalculatorProps {
  open: boolean;
  onToggle: () => void;
}

type AngleMode = 'deg' | 'rad';

function factorial(n: number): number {
  if (n < 0 || !Number.isFinite(n) || Math.floor(n) !== n) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return n === Infinity ? 'Infinity' : Number.isNaN(n) ? 'Error' : '-Infinity';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  let s = n.toPrecision(15);
  if (s.indexOf('e') === -1 && s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

const BINARY_SYMBOLS: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '/',
  mod: 'mod',
  '^': '^',
  yroot: 'yroot',
  logy: 'logy',
};

export default function ScientificCalculator({ open, onToggle }: ScientificCalculatorProps) {
  // `current` is the operand actively being edited; `expression` is everything typed
  // before it (e.g. "12 +"). The top line is derived from both, live. `result` only
  // ever changes when a calculation actually completes, so it never gets overwritten
  // by keystrokes that are still building the next expression.
  const [current, setCurrent] = useState('0');
  const [expression, setExpression] = useState('');
  const [typingCurrent, setTypingCurrent] = useState(false);
  const [result, setResult] = useState('0');
  const [memory, setMemory] = useState(0);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [pendingVal, setPendingVal] = useState<number | null>(null);

  const toRad = (x: number) => (angleMode === 'deg' ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angleMode === 'deg' ? (x * 180) / Math.PI : x);

  const topLine = justEvaluated ? expression : expression ? (typingCurrent ? `${expression} ${current}` : expression) : current;

  const clearAll = () => {
    setCurrent('0');
    setExpression('');
    setTypingCurrent(false);
    setResult('0');
    setPendingOp(null);
    setPendingVal(null);
    setJustEvaluated(false);
  };

  const backspace = () => {
    if (justEvaluated) return;
    setCurrent((c) => (c.length > 1 ? c.slice(0, -1) : '0'));
  };

  const appendDigit = (d: string) => {
    let base = current;
    let expr = expression;
    if (justEvaluated) {
      base = '0';
      expr = '';
      setExpression('');
      setJustEvaluated(false);
    }
    if (d === '.') {
      if (base.includes('.')) return;
      base = base === '0' ? '0.' : base + '.';
    } else {
      base = base === '0' ? d : base + d;
    }
    setCurrent(base);
    if (expr !== expression) setExpression(expr);
    setTypingCurrent(true);
  };

  const applyConst = (value: number) => {
    if (justEvaluated) {
      setExpression('');
      setJustEvaluated(false);
    }
    setCurrent(fmt(value));
    setTypingCurrent(true);
  };

  const performOp = (op: string, a: number, b: number): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      case 'mod':
        return a % b;
      case '^':
        return Math.pow(a, b);
      case 'yroot':
        return Math.pow(b, 1 / a);
      case 'logy':
        return Math.log(b) / Math.log(a);
      default:
        return b;
    }
  };

  const compute = () => {
    if (pendingOp === null || pendingVal === null) return;
    const b = parseFloat(current);
    const out = performOp(pendingOp, pendingVal, b);
    setExpression((expr) => `${expr} ${current} =`);
    setResult(fmt(out));
    setCurrent(fmt(out));
    setTypingCurrent(false);
    setPendingOp(null);
    setPendingVal(null);
    setJustEvaluated(true);
  };

  const startBinary = (op: string) => {
    const val = parseFloat(current);
    if (Number.isNaN(val)) return;
    let base = val;
    if (pendingOp && !justEvaluated) {
      base = performOp(pendingOp, pendingVal as number, val);
      setResult(fmt(base));
    }
    setPendingVal(base);
    setPendingOp(op);
    setExpression(`${fmt(base)} ${BINARY_SYMBOLS[op] || op}`);
    setJustEvaluated(false);
    setCurrent('0');
    setTypingCurrent(false);
  };

  const applyUnary = (fn: string) => {
    const val = parseFloat(current);
    if (Number.isNaN(val)) return;
    let out: number;
    let label = '';
    switch (fn) {
      case 'sin':
        out = Math.sin(toRad(val));
        label = `sin(${current})`;
        break;
      case 'cos':
        out = Math.cos(toRad(val));
        label = `cos(${current})`;
        break;
      case 'tan':
        out = Math.tan(toRad(val));
        label = `tan(${current})`;
        break;
      case 'asin':
        out = fromRad(Math.asin(val));
        label = `sin⁻¹(${current})`;
        break;
      case 'acos':
        out = fromRad(Math.acos(val));
        label = `cos⁻¹(${current})`;
        break;
      case 'atan':
        out = fromRad(Math.atan(val));
        label = `tan⁻¹(${current})`;
        break;
      case 'sinh':
        out = Math.sinh(val);
        label = `sinh(${current})`;
        break;
      case 'cosh':
        out = Math.cosh(val);
        label = `cosh(${current})`;
        break;
      case 'tanh':
        out = Math.tanh(val);
        label = `tanh(${current})`;
        break;
      case 'asinh':
        out = Math.asinh(val);
        label = `sinh⁻¹(${current})`;
        break;
      case 'acosh':
        out = Math.acosh(val);
        label = `cosh⁻¹(${current})`;
        break;
      case 'atanh':
        out = Math.atanh(val);
        label = `tanh⁻¹(${current})`;
        break;
      case 'ln':
        out = Math.log(val);
        label = `ln(${current})`;
        break;
      case 'log10':
        out = Math.log10(val);
        label = `log(${current})`;
        break;
      case 'log2':
        out = Math.log2(val);
        label = `log2(${current})`;
        break;
      case 'exp':
        out = Math.exp(val);
        label = `e^(${current})`;
        break;
      case 'pow10':
        out = Math.pow(10, val);
        label = `10^(${current})`;
        break;
      case 'sqrt':
        out = Math.sqrt(val);
        label = `√(${current})`;
        break;
      case 'cbrt':
        out = Math.cbrt(val);
        label = `∛(${current})`;
        break;
      case 'square':
        out = val * val;
        label = `(${current})^2`;
        break;
      case 'cube':
        out = val * val * val;
        label = `(${current})^3`;
        break;
      case 'inv':
        out = 1 / val;
        label = `1/(${current})`;
        break;
      case 'abs':
        out = Math.abs(val);
        label = `|${current}|`;
        break;
      case 'fact':
        out = factorial(val);
        label = `(${current})!`;
        break;
      case 'negate':
        setCurrent(fmt(-val));
        return;
      default:
        return;
    }
    setExpression(label + ' =');
    setResult(fmt(out));
    setCurrent(fmt(out));
    setTypingCurrent(false);
    setJustEvaluated(true);
  };

  const memAction = (a: string) => {
    const val = parseFloat(current);
    switch (a) {
      case 'MC':
        setMemory(0);
        break;
      case 'MR':
        setExpression('MR =');
        setResult(fmt(memory));
        setCurrent(fmt(memory));
        setTypingCurrent(false);
        setJustEvaluated(true);
        break;
      case 'MS':
        setMemory(val);
        break;
      case 'M+':
        setMemory((m) => m + val);
        break;
      case 'M-':
        setMemory((m) => m - val);
        break;
    }
  };

  const numKey = (label: string, onClick: () => void, key?: string) => (
    <button
      key={key ?? label}
      type="button"
      onClick={onClick}
      className="rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 active:scale-[0.97]"
    >
      {label}
    </button>
  );

  const fnKey = (label: React.ReactNode, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white py-2 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 active:scale-[0.97]"
    >
      {label}
    </button>
  );

  const opKey = (label: React.ReactNode, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="rounded-lg bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100 active:scale-[0.97]"
    >
      {label}
    </button>
  );

  const memKey = (label: string, action: string) => (
    <button
      key={action}
      type="button"
      onClick={() => memAction(action)}
      className="rounded-md bg-slate-800 py-1.5 text-[10px] font-bold tracking-wide text-slate-200 transition-colors hover:bg-slate-700 active:scale-[0.97]"
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Scientific calculator"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-5 top-16 z-40 w-[300px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft-lg lg:right-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Calculator</span>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md ring-1 ring-inset ring-slate-200">
                <button
                  type="button"
                  onClick={() => setAngleMode('deg')}
                  className={[
                    'px-2 py-1 text-[10px] font-bold transition-colors',
                    angleMode === 'deg' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100',
                  ].join(' ')}
                >
                  DEG
                </button>
                <button
                  type="button"
                  onClick={() => setAngleMode('rad')}
                  className={[
                    'px-2 py-1 text-[10px] font-bold transition-colors',
                    angleMode === 'rad' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100',
                  ].join(' ')}
                >
                  RAD
                </button>
              </div>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Close calculator"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 overflow-hidden border-b border-slate-100 bg-slate-900 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <div className="min-h-[14px] flex-1 overflow-x-auto whitespace-nowrap text-right font-mono text-[11px] text-slate-400">{topLine || ' '}</div>
                {memory !== 0 && <span className="shrink-0 rounded border border-slate-600 px-1 text-[10px] font-bold text-brand-300">M</span>}
              </div>
              <div className="overflow-x-auto whitespace-nowrap text-right font-mono text-2xl font-bold tabular-nums text-white">{result}</div>
            </div>

            <div className="grid grid-cols-5 gap-1 px-3 pt-2.5">
              {memKey('MC', 'MC')}
              {memKey('MR', 'MR')}
              {memKey('MS', 'MS')}
              {memKey('M+', 'M+')}
              {memKey('M-', 'M-')}
            </div>

            <div className="grid grid-cols-5 gap-1.5 p-3">
              {fnKey('sin', () => applyUnary('sin'), 'sin')}
              {fnKey('cos', () => applyUnary('cos'), 'cos')}
              {fnKey('tan', () => applyUnary('tan'), 'tan')}
              {fnKey(
                <>
                  x<sup>2</sup>
                </>,
                () => applyUnary('square'),
                'square'
              )}
              {fnKey(<>&radic;</>, () => applyUnary('sqrt'), 'sqrt')}

              {fnKey(
                <>
                  sin<sup>-1</sup>
                </>,
                () => applyUnary('asin'),
                'asin'
              )}
              {fnKey(
                <>
                  cos<sup>-1</sup>
                </>,
                () => applyUnary('acos'),
                'acos'
              )}
              {fnKey(
                <>
                  tan<sup>-1</sup>
                </>,
                () => applyUnary('atan'),
                'atan'
              )}
              {fnKey(
                <>
                  x<sup>3</sup>
                </>,
                () => applyUnary('cube'),
                'cube'
              )}
              {fnKey(
                <>
                  x<sup>y</sup>
                </>,
                () => startBinary('^'),
                'pow'
              )}

              {fnKey('ln', () => applyUnary('ln'), 'ln')}
              {fnKey('log', () => applyUnary('log10'), 'log10')}
              {fnKey('n!', () => applyUnary('fact'), 'fact')}
              {fnKey(
                <>
                  e<sup>x</sup>
                </>,
                () => applyUnary('exp'),
                'exp'
              )}
              {fnKey('1/x', () => applyUnary('inv'), 'inv')}

              {fnKey(<>&pi;</>, () => applyConst(Math.PI), 'pi')}
              {fnKey('e', () => applyConst(Math.E), 'euler')}
              {fnKey('mod', () => startBinary('mod'), 'mod')}
              {fnKey(<>&#8731;</>, () => applyUnary('cbrt'), 'cbrt')}
              {fnKey('|x|', () => applyUnary('abs'), 'abs')}

              {numKey('7', () => appendDigit('7'))}
              {numKey('8', () => appendDigit('8'))}
              {numKey('9', () => appendDigit('9'))}
              {opKey(<>&divide;</>, () => startBinary('/'), 'div')}
              {opKey('C', clearAll, 'clear')}

              {numKey('4', () => appendDigit('4'))}
              {numKey('5', () => appendDigit('5'))}
              {numKey('6', () => appendDigit('6'))}
              {opKey(<>&times;</>, () => startBinary('*'), 'mul')}
              {opKey('←', backspace, 'back')}

              {numKey('1', () => appendDigit('1'))}
              {numKey('2', () => appendDigit('2'))}
              {numKey('3', () => appendDigit('3'))}
              {opKey('−', () => startBinary('-'), 'sub')}
              {fnKey('+/-', () => applyUnary('negate'), 'negate')}

              {numKey('0', () => appendDigit('0'))}
              {numKey('.', () => appendDigit('.'))}
              {opKey('+', () => startBinary('+'), 'add')}
              <button
                type="button"
                onClick={() => compute()}
                className="col-span-2 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 active:scale-[0.97]"
              >
                =
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
