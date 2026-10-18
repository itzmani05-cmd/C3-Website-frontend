import { Fragment, useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { reflowText, renderMath, tokenizeMath } from '../../lib/latex';

interface MathTextProps {
  children?: string | null;
  className?: string;
}

/** Renders plain text containing $…$ / $$…$$ LaTeX (and **bold**) using KaTeX. Inline element; keeps line breaks. */
export default function MathText({ children, className = '' }: MathTextProps) {
  const raw = children ?? '';
  const text = useMemo(() => reflowText(raw), [raw]);
  const parts = useMemo(() => tokenizeMath(text), [text]);

  if (!parts) return <span className={['whitespace-pre-wrap', className].join(' ')}>{text}</span>;

  return (
    <span className={['whitespace-pre-wrap', className].join(' ')}>
      {parts.map((p, i) => {
        if (p.kind === 'text') return <Fragment key={i}>{p.value}</Fragment>;
        if (p.kind === 'bold') return <strong key={i}><MathText>{p.value}</MathText></strong>;
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(p.value, p.kind === 'display') }} />;
      })}
    </span>
  );
}
