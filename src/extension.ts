import { dirname } from 'node:path';
import * as vscode from 'vscode';
import { formatMathEdits } from './index.js';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('markdown', {
      async provideDocumentFormattingEdits(document, formatting, token) {
        if (!vscode.workspace.isTrusted || token.isCancellationRequested)
          return [];
        const config = vscode.workspace.getConfiguration(
          'md-math-fmt',
          document.uri,
        );
        const controller = new AbortController();
        const cancellation = token.onCancellationRequested(() =>
          controller.abort(),
        );
        const version = document.version;
        try {
          const edits = await formatMathEdits(document.getText(), {
            texFmtPath: config.get<string>('texFmtPath', 'tex-fmt'),
            configPath: config.get<string>('configPath') || undefined,
            lineWidth: config.get<number>('lineWidth', 80),
            tabSize: formatting.tabSize,
            useTabs: !formatting.insertSpaces,
            cwd:
              document.uri.scheme === 'file'
                ? dirname(document.uri.fsPath)
                : vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
            signal: controller.signal,
          });
          if (token.isCancellationRequested || document.version !== version)
            return [];
          return edits.map((edit) =>
            vscode.TextEdit.replace(
              new vscode.Range(
                document.positionAt(edit.start),
                document.positionAt(edit.end),
              ),
              edit.text,
            ),
          );
        } catch (error) {
          if (!token.isCancellationRequested) {
            void vscode.window.showErrorMessage(
              `Markdown Math Formatter: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          return [];
        } finally {
          cancellation.dispose();
        }
      },
    }),
  );
}
