import { execFile } from 'node:child_process';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface FormatOptions {
  texFmtPath?: string;
  configPath?: string;
  cwd?: string;
  lineWidth?: number;
  tabSize?: number;
  useTabs?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Offsets are UTF-16 offsets, as used by JavaScript and VS Code. */
export interface MathEdit {
  start: number;
  end: number;
  text: string;
}

const parser = unified().use(remarkParse).use(remarkMath);

function positiveInteger(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new Error(`${name} must be a positive integer`);
  }
}

async function formatLatex(
  input: string,
  inline: boolean,
  options: FormatOptions,
): Promise<string> {
  const executable = options.texFmtPath ?? 'tex-fmt';
  const args = ['--stdin', '--quiet'];
  args.push(
    ...(options.configPath ? ['--config', options.configPath] : ['--noconfig']),
  );
  if (inline) args.push('--nowrap');
  else if (options.lineWidth !== undefined)
    args.push('--wraplen', String(options.lineWidth));
  if (options.tabSize !== undefined)
    args.push('--tabsize', String(options.tabSize));
  if (options.useTabs) args.push('--usetabs');

  return new Promise((resolve, reject) => {
    const child = execFile(
      executable,
      args,
      {
        cwd: options.cwd,
        encoding: 'utf8',
        windowsHide: true,
        timeout: options.timeoutMs ?? 10_000,
        maxBuffer: 16 * 1024 * 1024,
        signal: options.signal,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Failed to run ${executable}: ${stderr.trim() || error.message}`,
              { cause: error },
            ),
          );
        } else {
          resolve(stdout.replace(/\r\n?/g, '\n').replace(/\n$/, ''));
        }
      },
    );
    // A process that exits before consuming stdin is reported by execFile's callback.
    child.stdin?.on('error', () => {});
    child.stdin?.end(input);
  });
}

/** Return formula-only edits; code spans, code fences and surrounding prose are untouched. */
export async function formatMathEdits(
  source: string,
  options: FormatOptions = {},
): Promise<MathEdit[]> {
  positiveInteger(options.lineWidth, 'lineWidth');
  positiveInteger(options.tabSize, 'tabSize');
  positiveInteger(options.timeoutMs, 'timeoutMs');
  options.signal?.throwIfAborted();
  // micromark discards an initial BOM before computing offsets.
  const offset = source.startsWith('\uFEFF') ? 1 : 0;
  const tree = parser.parse(source.slice(offset));
  const nodes: Array<{
    type: string;
    value: string;
    start: number;
    end: number;
    line: number;
  }> = [];
  visit(tree, (node) => {
    if (node.type !== 'math' && node.type !== 'inlineMath') return;
    const position = node.position;
    if (!position) return;
    const start = position.start.offset;
    const end = position.end.offset;
    if (start !== undefined && end !== undefined) {
      nodes.push({
        type: node.type,
        value: node.value,
        start: start + offset,
        end: end + offset,
        line: position.start.line,
      });
    }
  });
  const edits: MathEdit[] = [];
  for (const node of nodes) {
    options.signal?.throwIfAborted();
    const raw = source.slice(node.start, node.end);
    try {
      if (node.type === 'inlineMath') {
        // Preserve multiline inline math: joining lines can change TeX comment semantics.
        if (/[\r\n]/.test(raw)) continue;
        const delimiter = raw.match(/^\$+/)?.[0];
        if (!delimiter) continue;
        const result = await formatLatex(`$${node.value}$\n`, true, options);
        if (
          !result.startsWith('$') ||
          !result.endsWith('$') ||
          result.includes('\n')
        ) {
          throw new Error('tex-fmt returned an unexpected inline formula');
        }
        const value = result.slice(1, -1);
        // Padding prevents dollars inside a multi-dollar span from merging with its fence.
        const padding =
          value.startsWith('$') || value.endsWith('$') || /^ .* $/.test(value)
            ? ' '
            : '';
        const text = delimiter + padding + value + padding + delimiter;
        if (text !== raw)
          edits.push({ start: node.start, end: node.end, text });
      } else {
        const opening = raw.match(/^(\${2,})[^\r\n]*(\r\n|\n|\r)/);
        if (!opening) continue;
        const closing = /(?:\r\n|\n|\r)([\t >]*)(\${2,})[\t ]*$/.exec(raw);
        // remark-math accepts unclosed fences. Leave incomplete input unchanged.
        if (!closing || closing[2].length < opening[1].length) continue;
        const result = await formatLatex(
          `$$\n${node.value}\n$$\n`,
          false,
          options,
        );
        if (!result.startsWith('$$\n') || !result.endsWith('\n$$')) {
          throw new Error('tex-fmt returned an unexpected block formula');
        }
        const value = result.slice(3, -3);
        const eol = opening[2];
        const prefix = closing[1];
        const text =
          value.length === 0
            ? ''
            : value
                .split('\n')
                .map((line) => prefix + line)
                .join(eol) + eol;
        const start = node.start + opening[0].length;
        const end =
          node.start + closing.index + (closing[0].startsWith('\r\n') ? 2 : 1);
        if (start > end) continue;
        if (source.slice(start, end) !== text) edits.push({ start, end, text });
      }
    } catch (error) {
      throw new Error(
        `Math at line ${node.line}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  return edits;
}

export async function formatMarkdown(
  source: string,
  options: FormatOptions = {},
): Promise<string> {
  const edits = await formatMathEdits(source, options);
  for (const edit of edits.reverse()) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}
