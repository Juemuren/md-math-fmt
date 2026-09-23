import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const cli = resolve('dist/cli.js');
const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input: input ?? '', encoding: 'utf8' });
const available = spawnSync('tex-fmt', ['--version']).status === 0;
const integration = { skip: !available && 'Install tex-fmt to run integration tests' };

test('CLI help, version, stdin and argument errors', () => {
  assert.match(run(['--help']).stdout, /Usage:/);
  assert.equal(run(['--version']).stdout, '0.1.0\n');
  assert.equal(run([], '# plain\r\n').stdout, '# plain\r\n');
  for (const args of [['--wat'], ['--write', '--check'], ['--write'], ['a.md', 'b.md'], ['-', 'a.md'], ['--line-width', '0']]) {
    assert.equal(run(args).status, 2, args.join(' '));
  }
  assert.equal(run(['does-not-exist.md']).status, 2);
});

test('CLI formats stdout, checks and writes multiple files', integration, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'math cli '));
  try {
    const files = [join(dir, 'one.md'), join(dir, 'two with spaces.md')];
    for (const file of files) await writeFile(file, 'before $ x $ after\r\n');
    const stdout = run([files[0]]);
    assert.equal(stdout.status, 0, stdout.stderr);
    assert.equal(stdout.stdout, 'before $x$ after\r\n');
    assert.equal(await readFile(files[0], 'utf8'), 'before $ x $ after\r\n');
    assert.equal(run(['--check', ...files]).status, 1);
    assert.equal(run(['--write', ...files]).status, 0);
    assert.equal(run(['--check', ...files]).status, 0);
    for (const file of files) assert.equal(await readFile(file, 'utf8'), 'before $x$ after\r\n');
    assert.equal(run(['--check'], '$ x $').status, 1);
    assert.equal(run(['-'], '$ x $').stdout, '$x$');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI does not write any files when formatting a batch fails', integration, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'math failure '));
  try {
    const file = join(dir, 'one.md');
    await writeFile(file, '$ x $');
    assert.equal(run(['--write', file, join(dir, 'missing.md')]).status, 2);
    assert.equal(await readFile(file, 'utf8'), '$ x $');
    const failure = run(['--write', '--tex-fmt', join(dir, 'missing.exe'), file]);
    assert.equal(failure.status, 2);
    assert.match(failure.stderr, /Failed to run/);
    assert.equal(await readFile(file, 'utf8'), '$ x $');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
