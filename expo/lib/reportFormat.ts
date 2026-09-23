/**
 * Turns a generated report into display blocks.
 *
 * Reports arrive as Markdown with <br /> line breaks and HTML entities, written by
 * the web pipeline. Stripping the tags alone left the Markdown on screen verbatim —
 * `### ☀️ **Sun (Leo)**`, `---`, raw `| table | rows |` — in every report a paying
 * customer opened. This parses just the subset the pipeline emits. Anything it does
 * not recognise falls through as a plain paragraph, so an unexpected shape degrades
 * to readable text rather than disappearing.
 *
 * Kept free of React Native imports so it can be tested on its own.
 */

export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type ReportBlock =
  | { kind: 'heading'; level: number; inlines: Inline[] }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'bullet'; inlines: Inline[] }
  | { kind: 'quote'; inlines: Inline[] }
  | { kind: 'rule' };

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Last, so an escaped entity such as "&amp;lt;" reads as "&lt;" rather than "<".
    .replace(/&amp;/g, '&');
}

/**
 * **bold** and *italic*. Unbalanced markers are left as literal text rather than
 * swallowing the rest of the line.
 */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) out.push({ text: line.slice(last, match.index) });
    if (match[1] !== undefined) out.push({ text: match[1], bold: true });
    else out.push({ text: match[2], italic: true });
    last = pattern.lastIndex;
  }
  if (last < line.length) out.push({ text: line.slice(last) });

  return out.filter((part) => part.text.length > 0);
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,}|—)$/;
const BULLET = /^[-•]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const TABLE_ROW = /^\|(.*)\|$/;
const TABLE_DIVIDER = /^\|[\s:|-]+\|$/;

export function parseReport(html: string): ReportBlock[] {
  const blocks: ReportBlock[] = [];

  for (const raw of htmlToText(html).split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(HEADING))) {
      blocks.push({ kind: 'heading', level: m[1].length, inlines: parseInline(m[2]) });
    } else if (RULE.test(line)) {
      // A rule is only a separator; two in a row, or one leading the report, is noise.
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== 'rule') {
        blocks.push({ kind: 'rule' });
      }
    } else if (TABLE_DIVIDER.test(line)) {
      continue;
    } else if ((m = line.match(TABLE_ROW))) {
      // A phone is too narrow for a real table, so each row reads as one line.
      const cells = m[1].split('|').map((cell) => cell.trim()).filter(Boolean);
      if (cells.length > 0) {
        blocks.push({ kind: 'bullet', inlines: parseInline(cells.join(' — ')) });
      }
    } else if ((m = line.match(BULLET))) {
      blocks.push({ kind: 'bullet', inlines: parseInline(m[1]) });
    } else if ((m = line.match(QUOTE))) {
      blocks.push({ kind: 'quote', inlines: parseInline(m[1]) });
    } else {
      blocks.push({ kind: 'paragraph', inlines: parseInline(line) });
    }
  }

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === 'rule') blocks.pop();
  return blocks;
}
