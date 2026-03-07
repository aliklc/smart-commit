/**
 * Git entegrasyonu - staged diff okuma
 */

import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Verilen mesajla git commit çalıştırır. Mesaj shell'e geçirilmez, güvenli.
 */
export async function runCommit(message: string): Promise<void> {
  await execFileAsync('git', ['commit', '-m', message], { encoding: 'utf-8' });
}

const SMART_COMMIT_CMD = 'npx --yes @aliklc/smart-commit';

/**
 * Git alias ekler: git smart-commit ve git sc (Git Bash dahil).
 * npx kullanır ki PATH'te global bin olmasa da çalışsın.
 */
export async function setupGitAlias(): Promise<void> {
  await execFileAsync('git', ['config', '--global', 'alias.smart-commit', `!${SMART_COMMIT_CMD}`], { encoding: 'utf-8' });
  await execFileAsync('git', ['config', '--global', 'alias.sc', `!${SMART_COMMIT_CMD}`], { encoding: 'utf-8' });
}

const NO_STAGED_FILES_MESSAGE =
  'Lütfen önce dosyalarınızı "git add" ile ekleyin.';

/**
 * Stage edilmiş dosyaların diff çıktısını döndürür.
 * Staged dosya yoksa hata fırlatır.
 */
export async function getStagedDiff(): Promise<string> {
  try {
    const { stdout } = await execAsync('git diff --staged', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error(NO_STAGED_FILES_MESSAGE);
    }

    return trimmed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not a git repository')) {
      throw new Error('Bu dizin bir Git deposu değil. Önce "git init" çalıştırın.');
    }
    if (message === NO_STAGED_FILES_MESSAGE) {
      throw new Error(NO_STAGED_FILES_MESSAGE);
    }
    throw err;
  }
}
