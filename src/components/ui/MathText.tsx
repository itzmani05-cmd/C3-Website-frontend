import { Fragment, useMemo } from 'react';
import katex from 'katex';

// $$display$$, $inline$ (no space just inside the delimiters and not followed by a digit, so "$5 and $10" stays plain
// unless the formula starts with a \command, e.g. a$\gt$0), **bold**
const TOKEN_RE = /\$\$([\s\S]+?)\$\$|\$(?!\s)((?:\\[\s\S]|[^$\\])+?)(?<!\s)\$(?!\d)|\*\*([\s\S]+?)\*\*|\$(?=\\)((?:\\[\s\S]|[^$\\])+?)(?<!\s)\$/g;

const renderMath = (tex: string, displayMode: boolean): string =>
  katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore' });

interface MathTextProps {
  children?: string | null;
  className?: string;
}

/** Renders plain text containing $…$ / $$…$$ LaTeX (and **bold**) using KaTeX. Inline element; keeps line breaks. */
export default function MathText({ children, className = '' }: MathTextProps) {
  const text = children ?? '';
  const parts = useMemo(() => {
    if (!text.includes('$') && !text.includes('**')) return null;
    const out: Array<{ kind: 'text' | 'inline' | 'display' | 'bold'; value: string }> = [];
    let last = 0;
    for (const m of text.matchAll(TOKEN_RE)) {
      const start = m.index ?? 0;
      if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
      if (m[1] !== undefined) out.push({ kind: 'display', value: m[1] });
      else if (m[2] !== undefined || m[4] !== undefined) out.push({ kind: 'inline', value: (m[2] ?? m[4]) as string });
      else out.push({ kind: 'bold', value: m[3] });
      last = start + m[0].length;
    }
    if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
    return out;
  }, [text]);

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
