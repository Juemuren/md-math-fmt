#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import metadata from '../package.json' with { type: 'json' };
import { type FormatOptions, formatMarkdown } from './index.js';

const help = `Usage: md-math-fmt [options] [file ...]

Format Markdown formulas using tex-fmt (must be installed separately).
Without a file, or with -, read stdin. Default output is stdout.

Options:
  -w, --write             Update files in place
  -c, --check             Check formatting without writing (exit 1 if changed)
      --tex-fmt <path>    tex-fmt executable (default: tex-fmt)
      --config <path>     Explicit tex-fmt TOML configuration
      --line-width <n>    Block formula wrap width
  -h, --help              Show this help
  -v, --version           Show version

Multiple files require --write or --check. Exit 2 indicates an error.
Without --config, tex-fmt configuration discovery is disabled.
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      write: { type: 'boolean', short: 'w' },
      check: { type: 'boolean', short: 'c' },
      'tex-fmt': { type: 'string' },
      config: { type: 'string' },
      'line-width': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  if (values.help) {
    process.stdout.write(help);
    return;
  }
  if (values.version) {
    process.stdout.write(`${metadata.version}\n`);
    return;
  }
  if (values.write && values.check)
    throw new Error('--write and --check cannot be combined');
  const files = positionals.length ? positionals : ['-'];
  if (files.includes('-') && files.length > 1)
    throw new Error('stdin cannot be combined with other files');
  if (values.write && files.includes('-'))
    throw new Error('--write requires a file');
  if (files.length > 1 && !values.write && !values.check)
    throw new Error('Multiple files require --write or --check');
  const lineWidth =
    values['line-width'] === undefined
      ? undefined
      : Number(values['line-width']);
  if (
    lineWidth !== undefined &&
    (!Number.isSafeInteger(lineWidth) || lineWidth < 1)
  ) {
    throw new Error('--line-width must be a positive integer');
  }
  const texFmtPath = values['tex-fmt'];
  const options: FormatOptions = {
    texFmtPath:
      texFmtPath && /[\\/]/.test(texFmtPath) ? resolve(texFmtPath) : texFmtPath,
    configPath: values.config ? resolve(values.config) : undefined,
    lineWidth,
  };
  // Finish formatting every input before writing, so a formatter failure cannot partially update a batch.
  const results: Array<{ file: string; input: string; output: string }> = [];
  for (const file of [...new Set(files)]) {
    let input: string;
    if (file === '-') {
      if (process.stdin.isTTY)
        throw new Error('Provide a Markdown file or pipe input on stdin');
      process.stdin.setEncoding('utf8');
      input = '';
      for await (const chunk of process.stdin) input += chunk;
    } else {
      input = await readFile(file, 'utf8');
    }
    const output = await formatMarkdown(input, {
      ...options,
      cwd: file === '-' ? process.cwd() : dirname(resolve(file)),
    });
    results.push({ file, input, output });
  }
  for (const { file, input, output } of results) {
    if (values.check) {
      if (input !== output) {
        process.stderr.write(`${file}: needs formatting\n`);
        process.exitCode = 1;
      }
    } else if (values.write) {
      if (input !== output) await writeFile(file, output, 'utf8');
    } else {
      process.stdout.write(output);
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `md-math-fmt: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
});
