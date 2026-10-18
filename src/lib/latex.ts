import katex from 'katex';

// $$display$$, $inline$ (no space just inside the delimiters and not followed by a digit, so "$5 and $10" stays plain
// unless the formula starts with a \command, e.g. a$\gt$0), **bold**
const TOKEN_RE = /\$\$([\s\S]+?)\$\$|\$(?!\s)((?:\\[\s\S]|[^$\\])+?)(?<!\s)\$(?!\d)|\*\*([\s\S]+?)\*\*|\$(?=\\)((?:\\[\s\S]|[^$\\])+?)(?<!\s)\$/g;

const LIST_MARKER_RE = /^(\(?[A-Za-z0-9]{1,4}[.)]|\([A-Za-z0-9]{1,4}\)|[-•*–]|\d+\s*[.)])\s/;
const ENDS_SENTENCE_RE = /[.:;?!)\]]\s*$/;
const ENDS_IN_MATH_RE = /\$\s*$/;

/**
 * Scraped questions keep the line breaks of the PDF they came from, so a sentence is cut in the middle ("…using a
 * complete set⏎of standard IS sieves…") and wraps raggedly at any other width. This joins a single line break with a
 * space when it looks like that kind of hard wrap. Blank lines (paragraphs), list items such as "(P)" or "1.", lines that
 * end a sentence and short step-by-step lines (equations, headings) are left as they are.
 */
export function reflowText(text: string): string {
  if (!text.includes('\n')) return text;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    const prev = out[out.length - 1];
    const next = lines[i];
    const nextText = next.trim();
    const prevText = prev.trim();
    const continues =
      prevText !== '' &&
      nextText !== '' &&
      !ENDS_SENTENCE_RE.test(prevText) &&
      !LIST_MARKER_RE.test(nextText) &&
      (/^[a-z]/.test(nextText) || (prevText.length >= 50 && !ENDS_IN_MATH_RE.test(prevText)));
    if (continues) out[out.length - 1] = `${prev.replace(/\s+$/, '')} ${nextText}`;
    else out.push(next);
  }
  return out.join('\n');
}

export type MathPart ={ kind: 'text' | 'inline' | 'display' | 'bold'; value: string };

/** Splits text into plain runs, $inline$ / $$display$$ formulas and **bold** runs. Returns null if there is nothing special. */
export function tokenizeMath(text: string): MathPart[] | null {
  if (!text.includes('$') && !text.includes('**')) return null;
  const out: MathPart[] = [];
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
}

export const renderMath = (tex: string, displayMode: boolean): string =>
  katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore' });

/** Messages for every formula in `text` that KaTeX cannot parse, plus a note for any `$` left unpaired. */
export function findLatexErrors(text: string | null | undefined): string[] {
  if (!text || !text.includes('$')) return [];
  const problems: string[] = [];
  const rest = text.replace(TOKEN_RE, (_m, display, inline, _bold, leading) => {
    const tex = display ?? inline ?? leading;
    if (tex !== undefined) {
      try {
        katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
      } catch (e) {
        const message = e instanceof Error ? e.message.replace(/^KaTeX parse error: /, '') : 'parse error';
        problems.push(`${message} (in "${tex.length > 40 ? `${tex.slice(0, 40)}…` : tex}")`);
      }
    }
    return '';
  });
  if (rest.includes('$')) problems.push('Unpaired $ — a formula is missing its closing $');
  return problems;
}
