import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { formatMarkdown, formatMathEdits } from '../dist/index.js';

let available = true;
try { execFileSync('tex-fmt', ['--version'], { stdio: 'ignore' }); } catch { available = false; }
const integration = { skip: !available && 'Install tex-fmt to run integration tests' };
const formula = '$$\n\\begin{aligned}\nx &= 1 \\\\\ny &= 2\n\\end{aligned}\n$$';
const formatted = '$$\n\\begin{aligned}\n  x &= 1 \\\\\n  y &= 2\n\\end{aligned}\n$$';

test('preserves ordinary Markdown and code without invoking tex-fmt', async () => {
  const source = '# 标题\r\n\r\n`$ x $` and \\$5\r\n\r\n```math\r\n$$\r\nx\r\n$$\r\n```\r\n\r\n    $ code $\r\n';
  assert.equal(await formatMarkdown(source, { texFmtPath: 'missing-formatter' }), source);
});

test('formats real block math and leaves surrounding text byte-for-byte intact', integration, async () => {
  const input = '\uFEFF# 数学 🧮  \n\n' + formula + '\n\n[link](./file.md)  \n';
  const expected = input.replace(formula, () => formatted);
  assert.equal(await formatMarkdown(input), expected);
  assert.equal(await formatMarkdown(expected), expected);
  const edits = await formatMathEdits(input);
  assert.equal(edits.length, 1);
  assert.equal(input.slice(0, edits[0].start), '\uFEFF# 数学 🧮  \n\n$$\n');
});

test('formats inline math with preserved delimiters and padding where required', integration, async () => {
  const input = 'a $ x $ b $$ y $$ c $\\omega_X=\\star X^\\flat$';
  assert.equal(await formatMarkdown(input), 'a $x$ b $$y$$ c $\\omega_X=\\star X^\\flat$');
  const dollar = 'a $$ $x$ $$ b';
  assert.equal(await formatMarkdown(dollar), dollar);
});

test('preserves multiline inline math and unclosed block math', async () => {
  for (const input of ['text $a% comment\nb$ end', '$$\na + b\n', '> $$\n> a']) {
    assert.equal(await formatMarkdown(input, { texFmtPath: 'missing-formatter' }), input);
  }
});

test('preserves CRLF and formats formulas in nested Markdown containers', integration, async () => {
  for (const [first, rest] of [['', ''], ['> ', '> '], ['- ', '  '], ['> - ', '>   '], ['  ', '  ']]) {
    const wrap = value => first + value.split('\n').join('\r\n' + rest);
    const input = wrap(formula) + '\r\n';
    const expected = wrap(formatted) + '\r\n';
    assert.equal(await formatMarkdown(input), expected);
    assert.equal(await formatMarkdown(expected), expected);
  }
});

test('preserves longer fences and metadata, and handles empty blocks', integration, async () => {
  const input = formula.replace(/^\$\$/, () => '$$$$ label').replace(/\$\$$/, () => '$$$$');
  const output = await formatMarkdown(input);
  assert.ok(output.startsWith('$$$$ label\n'));
  assert.ok(output.endsWith('\n$$$$'));
  assert.equal(await formatMarkdown(output), output);
  for (const empty of ['$$\n$$', '$$\n\n$$\n', '> $$\n> $$']) {
    const result = await formatMarkdown(empty);
    assert.equal(await formatMarkdown(result), result);
  }
});

test('accepts an explicit tex-fmt configuration path containing spaces', integration, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'math fmt '));
  try {
    const configPath = join(dir, 'custom config.toml');
    await writeFile(configPath, 'tabsize = 4\n');
    assert.equal(await formatMarkdown(formula, { configPath }), formatted.replace(/^  /gm, '    '));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reports process failures with formula locations', async () => {
  await assert.rejects(formatMarkdown('text\n\n$x$', { texFmtPath: 'missing-formatter' }), /Math at line 3: Failed to run/);
});

test('validates options and respects cancellation', async () => {
  await assert.rejects(formatMarkdown('', { lineWidth: 0 }), /positive integer/);
  await assert.rejects(formatMarkdown('', { tabSize: 1.5 }), /positive integer/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(formatMarkdown('$x$', { signal: controller.signal }), /abort/i);
});
