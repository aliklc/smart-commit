/**
 * Git integration — read staged diff and run commit.
 */

import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Runs git commit with the given message. Message is not passed through shell (safe).
 */
export async function runCommit(message: string): Promise<void> {
  await execFileAsync('git', ['commit', '-m', message], { encoding: 'utf-8' });
}

const SMART_COMMIT_CMD = 'npx --yes @aliklc/smart-commit';

/**
 * Adds Git aliases: git smart-commit and git sc (works in Git Bash).
 * Uses npx so it works even when global bin is not in PATH.
 */
export async function setupGitAlias(): Promise<void> {
  await execFileAsync('git', ['config', '--global', 'alias.smart-commit', `!${SMART_COMMIT_CMD}`], { encoding: 'utf-8' });
  await execFileAsync('git', ['config', '--global', 'alias.sc', `!${SMART_COMMIT_CMD}`], { encoding: 'utf-8' });
}

const NO_STAGED_FILES_MESSAGE =
  'No staged files. Please run "git add" first.';

/**
 * Returns the diff of staged files. Throws if nothing is staged.
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
      throw new Error('This directory is not a Git repository. Run "git init" first.');
    }
    if (message === NO_STAGED_FILES_MESSAGE) {
      throw new Error(NO_STAGED_FILES_MESSAGE);
    }
    throw err;
  }
}
