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
  const [parenStack, setParenStack] = useState<{ pendingOp: string | null; pendingVal: number | null }[]>([]);

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
    setParenStack([]);
    setJustEvaluated(false);
  };

  // Opens a group: the outer pending operator/operand are parked on a stack so a fresh
  // sub-expression can be built inside the parens, then unwound by closeParen.
  const openParen = () => {
    setParenStack((st) => [...st, { pendingOp, pendingVal }]);
    setPendingOp(null);
    setPendingVal(null);
    setExpression('(');
    setCurrent('0');
    setTypingCurrent(false);
    setJustEvaluated(false);
  };

  // Resolves the innermost open group to a single value, then restores whatever operator/operand
  // was pending before its "(" was pressed — repeat presses unwind nested parens one level at a time.
  const closeParen = () => {
    if (parenStack.length === 0) return;
    const val = parseFloat(current);
    if (Number.isNaN(val)) return;
    const innerResult = pendingOp !== null && pendingVal !== null ? performOp(pendingOp, pendingVal, val) : val;
    const frame = parenStack[parenStack.length - 1];
    setParenStack((st) => st.slice(0, -1));
    setPendingOp(frame.pendingOp);
    setPendingVal(frame.pendingVal);
    setCurrent(fmt(innerResult));
    setExpression(`( ${fmt(innerResult)} )`);
    setTypingCurrent(true);
    setJustEvaluated(false);
  };

  // Scientific-notation entry: subsequent digits are appended to the exponent by the existing
  // appendDigit (it just concatenates onto a non-"0" `current`, so "5" + Exp + "3" -> "5e+3").
  const enterExp = () => {
    if (justEvaluated) {
      setCurrent('0');
      setExpression('');
      setJustEvaluated(false);
    }
    setCurrent((c) => (c.includes('e') ? c : `${c}e+`));
    setTypingCurrent(true);
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
      case 'percent':
        out = val / 100;
        label = `${current}%`;
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

  // Plain white keys — every scientific function, digit, and memory slot share this look in the
  // reference design; only backspace/clear/sign (red) and equals (green) stand apart.
  const btn = (label: React.ReactNode, onClick: () => void, keyId: string, extraClass = '') => (
    <button
      key={keyId}
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.97]',
        extraClass,
      ].join(' ')}
    >
      {label}
    </button>
  );

  const redBtn = (label: React.ReactNode, onClick: () => void, keyId: string, extraClass = '') => (
    <button
      key={keyId}
      type="button"
      onClick={onClick}
      className={[
        'rounded-md bg-[#d9534f] py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c9302c] active:scale-[0.97]',
        extraClass,
      ].join(' ')}
    >
      {label}
    </button>
  );

  // Compact keys for phones — the 11-column reference grid squeezes each key under 30px there,
  // so mobile gets its own tighter-but-legible 5-column layout instead of a shrunk version of it.
  const mbtn = (label: React.ReactNode, onClick: () => void, extraClass = '') => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border border-slate-300 bg-white py-2.5 text-[11px] font-medium leading-tight text-slate-800 shadow-sm transition-colors active:scale-[0.97] active:bg-slate-50',
        extraClass,
      ].join(' ')}
    >
      {label}
    </button>
  );

  const mRedBtn = (label: React.ReactNode, onClick: () => void, extraClass = '') => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md bg-[#d9534f] py-2.5 text-[11px] font-bold leading-tight text-white shadow-sm transition-colors active:scale-[0.97]',
        extraClass,
      ].join(' ')}
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
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-2 top-3 z-40 mx-auto flex max-h-[94vh] w-auto max-w-[640px] flex-col overflow-hidden rounded-lg border border-slate-400 bg-[#d4d4d4] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:top-14 sm:w-[640px] sm:max-w-[95vw] sm:-translate-x-1/2"
        >
          <div className="flex shrink-0 items-center justify-between bg-blue-500 px-4 py-2.5">
            <span className="text-base font-medium text-white sm:text-lg">Scientific Calculator</span>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Close calculator"
              className="flex size-8 items-center justify-center rounded-md bg-blue-400 text-white transition-colors hover:bg-blue-300"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="overflow-y-auto">
          <div className="flex flex-col gap-1.5 p-3">
            <div className="flex h-9 items-center justify-end gap-2 rounded border border-slate-500 bg-white px-2.5">
              {memory !== 0 && <span className="rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-600">M</span>}
              <span className="overflow-x-auto whitespace-nowrap font-mono text-sm text-slate-500">{topLine || ' '}</span>
            </div>
            <div className="flex h-11 items-center justify-end rounded border border-slate-500 bg-white px-2.5">
              <span className="overflow-x-auto whitespace-nowrap font-mono text-2xl font-semibold tabular-nums text-slate-900">{result}</span>
            </div>
          </div>

          {/* Mobile: compact 5-column layout, all keys in the same reading order as the desktop grid */}
          <div className="flex flex-col gap-1.5 px-3 pb-3 sm:hidden">
            <div className="flex items-center justify-center gap-6 rounded-md border border-slate-300 bg-white py-2">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="angleModeMobile" checked={angleMode === 'deg'} onChange={() => setAngleMode('deg')} className="size-4 accent-blue-600" />
                <span className={angleMode === 'deg' ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-500'}>Deg</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="angleModeMobile" checked={angleMode === 'rad'} onChange={() => setAngleMode('rad')} className="size-4 accent-blue-600" />
                <span className={angleMode === 'rad' ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-500'}>Rad</span>
              </label>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {mbtn('mod', () => startBinary('mod'))}
              {mbtn('MC', () => memAction('MC'))}
              {mbtn('MR', () => memAction('MR'))}
              {mbtn('MS', () => memAction('MS'))}
              {mbtn('M+', () => memAction('M+'))}
              {mbtn('M-', () => memAction('M-'))}
              {mbtn('sinh', () => applyUnary('sinh'))}
              {mbtn('cosh', () => applyUnary('cosh'))}
              {mbtn('tanh', () => applyUnary('tanh'))}
              {mbtn('Exp', enterExp)}
              {mbtn('(', openParen)}
              {mbtn(')', closeParen)}
              {mRedBtn('←', backspace, 'col-span-2')}
              {mRedBtn('C', clearAll)}
              {mRedBtn('+/-', () => applyUnary('negate'))}
              {mbtn(<>&radic;</>, () => applyUnary('sqrt'))}
              {mbtn(<>sinh<sup>-1</sup></>, () => applyUnary('asinh'))}
              {mbtn(<>cosh<sup>-1</sup></>, () => applyUnary('acosh'))}
              {mbtn(<>tanh<sup>-1</sup></>, () => applyUnary('atanh'))}
              {mbtn(<>log<sub>2</sub>x</>, () => applyUnary('log2'))}
              {mbtn('ln', () => applyUnary('ln'))}
              {mbtn('log', () => applyUnary('log10'))}
              {mbtn('7', () => appendDigit('7'))}
              {mbtn('8', () => appendDigit('8'))}
              {mbtn('9', () => appendDigit('9'))}
              {mbtn('/', () => startBinary('/'))}
              {mbtn('%', () => applyUnary('percent'))}
              {mbtn(<>&pi;</>, () => applyConst(Math.PI))}
              {mbtn('e', () => applyConst(Math.E))}
              {mbtn('n!', () => applyUnary('fact'))}
              {mbtn(<>log<sub>x</sub>y</>, () => startBinary('logy'))}
              {mbtn(<>e<sup>x</sup></>, () => applyUnary('exp'))}
              {mbtn(<>10<sup>x</sup></>, () => applyUnary('pow10'))}
              {mbtn('4', () => appendDigit('4'))}
              {mbtn('5', () => appendDigit('5'))}
              {mbtn('6', () => appendDigit('6'))}
              {mbtn('*', () => startBinary('*'))}
              {mbtn('1/x', () => applyUnary('inv'))}
              {mbtn('sin', () => applyUnary('sin'))}
              {mbtn('cos', () => applyUnary('cos'))}
              {mbtn('tan', () => applyUnary('tan'))}
              {mbtn(<>x<sup>y</sup></>, () => startBinary('^'))}
              {mbtn(<>x<sup>3</sup></>, () => applyUnary('cube'))}
              {mbtn(<>x<sup>2</sup></>, () => applyUnary('square'))}
              {mbtn('1', () => appendDigit('1'))}
              {mbtn('2', () => appendDigit('2'))}
              {mbtn('3', () => appendDigit('3'))}
              {mbtn('-', () => startBinary('-'))}
              <button
                type="button"
                onClick={compute}
                className="rounded-md bg-[#3fbf7f] text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#35a86e] active:scale-[0.97]"
              >
                =
              </button>
              {mbtn(<>sin<sup>-1</sup></>, () => applyUnary('asin'))}
              {mbtn(<>cos<sup>-1</sup></>, () => applyUnary('acos'))}
              {mbtn(<>tan<sup>-1</sup></>, () => applyUnary('atan'))}
              {mbtn(<><sup>y</sup>&radic;x</>, () => startBinary('yroot'))}
              {mbtn(<>&#8731;</>, () => applyUnary('cbrt'))}
              {mbtn('|x|', () => applyUnary('abs'))}
              {mbtn('0', () => appendDigit('0'), 'col-span-2')}
              {mbtn('.', () => appendDigit('.'))}
              {mbtn('+', () => startBinary('+'))}
            </div>
          </div>

          <div className="hidden grid-cols-[repeat(11,minmax(0,1fr))] gap-1.5 px-3 pb-3 sm:grid">
            {/* Row 1 */}
            {btn('mod', () => startBinary('mod'), 'mod')}
            <div className="col-span-5 flex items-center gap-6 px-2">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="angleMode" checked={angleMode === 'deg'} onChange={() => setAngleMode('deg')} className="size-4 accent-blue-600" />
                <span className={angleMode === 'deg' ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-500'}>Deg</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="angleMode" checked={angleMode === 'rad'} onChange={() => setAngleMode('rad')} className="size-4 accent-blue-600" />
                <span className={angleMode === 'rad' ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-500'}>Rad</span>
              </label>
            </div>
            {btn('MC', () => memAction('MC'), 'MC')}
            {btn('MR', () => memAction('MR'), 'MR')}
            {btn('MS', () => memAction('MS'), 'MS')}
            {btn('M+', () => memAction('M+'), 'M+')}
            {btn('M-', () => memAction('M-'), 'M-')}

            {/* Row 2 */}
            {btn('sinh', () => applyUnary('sinh'), 'sinh')}
            {btn('cosh', () => applyUnary('cosh'), 'cosh')}
            {btn('tanh', () => applyUnary('tanh'), 'tanh')}
            {btn('Exp', enterExp, 'Exp')}
            {btn('(', openParen, 'lparen')}
            {btn(')', closeParen, 'rparen')}
            {redBtn('←', backspace, 'back', 'col-span-2')}
            {redBtn('C', clearAll, 'clear')}
            {redBtn('+/-', () => applyUnary('negate'), 'negate')}
            {btn(<>&radic;</>, () => applyUnary('sqrt'), 'sqrt')}

            {/* Row 3 */}
            {btn(
              <>
                sinh<sup>-1</sup>
              </>,
              () => applyUnary('asinh'),
              'asinh'
            )}
            {btn(
              <>
                cosh<sup>-1</sup>
              </>,
              () => applyUnary('acosh'),
              'acosh'
            )}
            {btn(
              <>
                tanh<sup>-1</sup>
              </>,
              () => applyUnary('atanh'),
              'atanh'
            )}
            {btn(
              <>
                log<sub>2</sub>x
              </>,
              () => applyUnary('log2'),
              'log2'
            )}
            {btn('ln', () => applyUnary('ln'), 'ln')}
            {btn('log', () => applyUnary('log10'), 'log10')}
            {btn('7', () => appendDigit('7'), '7')}
            {btn('8', () => appendDigit('8'), '8')}
            {btn('9', () => appendDigit('9'), '9')}
            {btn('/', () => startBinary('/'), 'div')}
            {btn('%', () => applyUnary('percent'), 'percent')}

            {/* Row 4 */}
            {btn(<>&pi;</>, () => applyConst(Math.PI), 'pi')}
            {btn('e', () => applyConst(Math.E), 'euler')}
            {btn('n!', () => applyUnary('fact'), 'fact')}
            {btn(
              <>
                log<sub>x</sub>y
              </>,
              () => startBinary('logy'),
              'logy'
            )}
            {btn(
              <>
                e<sup>x</sup>
              </>,
              () => applyUnary('exp'),
              'exp'
            )}
            {btn(
              <>
                10<sup>x</sup>
              </>,
              () => applyUnary('pow10'),
              'pow10'
            )}
            {btn('4', () => appendDigit('4'), '4')}
            {btn('5', () => appendDigit('5'), '5')}
            {btn('6', () => appendDigit('6'), '6')}
            {btn('*', () => startBinary('*'), 'mul')}
            {btn('1/x', () => applyUnary('inv'), 'inv')}

            {/* Row 5 */}
            {btn('sin', () => applyUnary('sin'), 'sin')}
            {btn('cos', () => applyUnary('cos'), 'cos')}
            {btn('tan', () => applyUnary('tan'), 'tan')}
            {btn(
              <>
                x<sup>y</sup>
              </>,
              () => startBinary('^'),
              'pow'
            )}
            {btn(
              <>
                x<sup>3</sup>
              </>,
              () => applyUnary('cube'),
              'cube'
            )}
            {btn(
              <>
                x<sup>2</sup>
              </>,
              () => applyUnary('square'),
              'square'
            )}
            {btn('1', () => appendDigit('1'), '1')}
            {btn('2', () => appendDigit('2'), '2')}
            {btn('3', () => appendDigit('3'), '3')}
            {btn('-', () => startBinary('-'), 'sub')}
            <button
              type="button"
              onClick={compute}
              className="row-span-2 rounded-md bg-[#3fbf7f] text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#35a86e] active:scale-[0.97]"
            >
              =
            </button>

            {/* Row 6 */}
            {btn(
              <>
                sin<sup>-1</sup>
              </>,
              () => applyUnary('asin'),
              'asin'
            )}
            {btn(
              <>
                cos<sup>-1</sup>
              </>,
              () => applyUnary('acos'),
              'acos'
            )}
            {btn(
              <>
                tan<sup>-1</sup>
              </>,
              () => applyUnary('atan'),
              'atan'
            )}
            {btn(
              <>
                <sup>y</sup>&radic;x
              </>,
              () => startBinary('yroot'),
              'yroot'
            )}
            {btn(<>&#8731;</>, () => applyUnary('cbrt'), 'cbrt')}
            {btn('|x|', () => applyUnary('abs'), 'abs')}
            {btn('0', () => appendDigit('0'), '0', 'col-span-2')}
            {btn('.', () => appendDigit('.'), 'dot')}
            {btn('+', () => startBinary('+'), 'add')}
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
