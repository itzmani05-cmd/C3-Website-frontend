import { Fragment, useMemo } from 'react';
import { reflowText, renderMath, tokenizeMath, useKatex } from '../../lib/latex';

interface MathTextProps {
  children?: string | null;
  className?: string;
}

/** Renders plain text containing $…$ / $$…$$ LaTeX (and **bold**) using KaTeX. Inline element; keeps line breaks. */
export default function MathText({ children, className = '' }: MathTextProps) {
  const raw = children ?? '';
  const text = useMemo(() => reflowText(raw), [raw]);
  const parts = useMemo(() => tokenizeMath(text), [text]);

  const hasMath = !!parts?.some((p) => p.kind === 'inline' || p.kind === 'display');
  const katex = useKatex(hasMath);

  if (!parts) return <span className={['whitespace-pre-wrap', className].join(' ')}>{text}</span>;

  return (
    <span className={['whitespace-pre-wrap', className].join(' ')}>
      {parts.map((p, i) => {
        if (p.kind === 'text') return <Fragment key={i}>{p.value}</Fragment>;
        if (p.kind === 'bold') return <strong key={i}><MathText>{p.value}</MathText></strong>;
        // Until KaTeX has loaded, show the formula source rather than nothing.
        if (!katex) return <Fragment key={i}>{p.kind === 'display' ? `$$${p.value}$$` : `$${p.value}$`}</Fragment>;
        return <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(katex, p.value, p.kind === 'display') }} />;
      })}
    </span>
  );
}
