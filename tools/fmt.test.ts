import { parseReport, parseInline, htmlToText } from '../expo/lib/reportFormat.ts';

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`}`);
};

// Real lines from the stored reports
const sample = [
  '**Planetary Line Map Report**  <br />',
  '*For a Leo Sun soul with Taurus Moon.*<br />',
  '<br />',
  '---<br />',
  '<br />',
  '### ☀️ **Sun (Leo) — The Stage for Your Radiant Self**<br />',
  '- **Taipei &amp; Shanghai (Sun IC)** — Your Sun IC line<br />',
  '&gt; *Note:* With your tight aspect<br />',
  '| Theme               | Influence |<br />',
  '|---------------------|-----------|<br />',
  '| **Creative Expansion** | Jupiter-Sun conjunction |<br />',
  '1. **Vancouver, Canada**  <br />',
  '---  <br />',
  '—  <br />',
].join('\n');

const blocks = parseReport(sample);
const kinds = blocks.map((b) => b.kind);
eq('block sequence', kinds, ['paragraph','paragraph','rule','heading','bullet','quote','bullet','bullet','paragraph']);
eq('no raw ** or ### or | survives anywhere',
   JSON.stringify(blocks).match(/\*\*|###|\\\|/g), null);
eq('heading level + bold stripped', blocks[3], { kind: 'heading', level: 3, inlines: [{ text: '☀️ ' }, { text: 'Sun (Leo) — The Stage for Your Radiant Self', bold: true }] });
eq('entity decoded in bullet', (blocks[4] as any).inlines[0], { text: 'Taipei & Shanghai (Sun IC)', bold: true });
eq('quote italic label', (blocks[5] as any).inlines[0], { text: 'Note:', italic: true });
eq('table header row -> joined line', (blocks[6] as any).inlines, [{ text: 'Theme — Influence' }]);
eq('table divider dropped, data row kept bold', (blocks[7] as any).inlines[0], { text: 'Creative Expansion', bold: true });
eq('numbered list kept as text', (blocks[8] as any).inlines[0], { text: '1. ' });
eq('trailing rules trimmed', kinds[kinds.length - 1] !== 'rule', true);

// Edge cases
eq('unbalanced ** stays literal', parseInline('5 ** 2 is odd'), [{ text: '5 ** 2 is odd' }]);
eq('lone * not italic', parseInline('rated 4* hotel'), [{ text: 'rated 4* hotel' }]);
eq('plain text untouched', parseInline('Rome offers grounding.'), [{ text: 'Rome offers grounding.' }]);
eq('&amp;lt; decodes once, not twice', htmlToText('a &amp;lt; b'), 'a &lt; b');
eq('empty report -> no blocks', parseReport(''), []);
eq('leading rule dropped', parseReport('---<br />\nHello').map(b => b.kind), ['paragraph']);
eq('double rule collapsed', parseReport('A<br />\n---<br />\n---<br />\nB').map(b => b.kind), ['paragraph','rule','paragraph']);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
