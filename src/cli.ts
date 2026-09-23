#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Command, InvalidArgumentError, Option } from 'commander';
import metadata from '../package.json' with { type: 'json' };
import { type FormatOptions, formatMarkdown } from './index.js';

interface CliOptions {
  write?: boolean;
  check?: boolean;
  texFmt: string;
  config?: string;
  lineWidth?: number;
}

function parseLineWidth(value: string): number {
  const width = Number(value);
  if (!Number.isSafeInteger(width) || width < 1)
    throw new InvalidArgumentError('must be a positive integer');
  return width;
}

async function main(): Promise<void> {
  const program = new Command()
    .name('md-math-fmt')
    .description(
      'Format Markdown formulas using tex-fmt (must be installed separately).\nWithout a file, or with -, read stdin. Default output is stdout.',
    )
    .argument('[files...]', 'Markdown files; use - for stdin')
    .addOption(
      new Option('-w, --write', 'Update files in place').conflicts('check'),
    )
    .option(
      '-c, --check',
      'Check formatting without writing (exit 2 if changed)',
    )
    .option('--tex-fmt <path>', 'tex-fmt executable', 'tex-fmt')
    .option('--config <path>', 'Explicit tex-fmt TOML configuration')
    .option('--line-width <n>', 'Block formula wrap width', parseLineWidth)
    .helpOption('-h, --help', 'Show this help')
    .version(metadata.version, '-v, --version', 'Show version')
    .addHelpText(
      'after',
      '\nMultiple files require --write or --check. Errors exit with code 1.\nWithout --config, tex-fmt configuration discovery is disabled.',
    )
    .parse();
  const values = program.opts<CliOptions>();
  const positionals = program.args;
  const files = positionals.length ? positionals : ['-'];
  if (files.includes('-') && files.length > 1)
    throw new Error('stdin cannot be combined with other files');
  if (values.write && files.includes('-'))
    throw new Error('--write requires a file');
  if (files.length > 1 && !values.write && !values.check)
    throw new Error('Multiple files require --write or --check');
  const texFmtPath = values.texFmt;
  const options: FormatOptions = {
    texFmtPath:
      texFmtPath && /[\\/]/.test(texFmtPath) ? resolve(texFmtPath) : texFmtPath,
    configPath: values.config ? resolve(values.config) : undefined,
    lineWidth: values.lineWidth,
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
        process.exitCode = 2;
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
  process.exitCode = 1;
});
