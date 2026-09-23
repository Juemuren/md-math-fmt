import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

function loadExtension({ trusted = true, executable = 'tex-fmt' } = {}) {
  let provider;
  let disposed = false;
  const errors = [];
  const registration = { dispose() {} };
  const vscode = {
    languages: { registerDocumentFormattingEditProvider(language, value) {
      assert.equal(language, 'markdown');
      provider = value;
      return registration;
    } },
    workspace: {
      isTrusted: trusted,
      getConfiguration() { return { get(key, fallback) { return key === 'texFmtPath' ? executable : fallback; } }; },
    },
    window: { showErrorMessage(message) { errors.push(message); } },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    TextEdit: { replace(range, newText) { return { range, newText }; } },
  };
  const path = resolve('dist/extension.cjs');
  const require = createRequire(path);
  const module = { exports: {} };
  const wrapper = vm.runInThisContext(`(function(require, module, exports) {${readFileSync(path, 'utf8')}\n})`, { filename: path });
  wrapper(name => name === 'vscode' ? vscode : require(name), module, module.exports);
  const context = { subscriptions: [] };
  module.exports.activate(context);
  assert.deepEqual(context.subscriptions, [registration]);
  return {
    provider, errors,
    token: { isCancellationRequested: false, onCancellationRequested() { return { dispose() { disposed = true; } }; } },
    disposed: () => disposed,
  };
}

const document = () => ({
  version: 1,
  uri: { scheme: 'file', fsPath: resolve('example.md') },
  getText: () => 'prefix $ x $ suffix',
  positionAt: offset => offset,
});
const formatting = { insertSpaces: true, tabSize: 2 };

test('extension registers a provider and returns formula-only edits', {
  skip: spawnSync('tex-fmt', ['--version']).status !== 0 && 'Install tex-fmt to run integration tests',
}, async () => {
  const extension = loadExtension();
  const edits = await extension.provider.provideDocumentFormattingEdits(document(), formatting, extension.token);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].range.start, 7);
  assert.equal(edits[0].range.end, 12);
  assert.equal(edits[0].newText, '$x$');
  assert.deepEqual(extension.errors, []);
  assert.equal(extension.disposed(), true);
});

test('extension reports formatter failures without editing the document', async () => {
  const extension = loadExtension({ executable: 'missing-formatter' });
  assert.deepEqual(await extension.provider.provideDocumentFormattingEdits(document(), formatting, extension.token), []);
  assert.match(extension.errors[0], /Failed to run/);
  assert.equal(extension.disposed(), true);
});

test('extension skips untrusted workspaces and cancelled requests', async () => {
  const untrusted = loadExtension({ trusted: false, executable: 'missing-formatter' });
  assert.deepEqual(await untrusted.provider.provideDocumentFormattingEdits(document(), formatting, untrusted.token), []);
  assert.deepEqual(untrusted.errors, []);
  const cancelled = loadExtension({ executable: 'missing-formatter' });
  cancelled.token.isCancellationRequested = true;
  assert.deepEqual(await cancelled.provider.provideDocumentFormattingEdits(document(), formatting, cancelled.token), []);
  assert.deepEqual(cancelled.errors, []);
});
