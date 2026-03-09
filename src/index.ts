#!/usr/bin/env node

/**
 * Smart Commit CLI — AI-powered Conventional Commits generator.
 * Entry point.
 */

import 'dotenv/config';
import { platform } from 'node:os';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { generateCommitMessage, getApiKeyMissingMessage, GEMINI_SETUP_URL } from './ai/ai';
import { ensureApiKey } from './setup/setup';
import { getStagedDiff, runCommit, setupGitAlias } from './git/git';

type Choice = 'yes' | 'no' | 'regenerate' | 'edit';

/** Set EDITOR if missing so "Edit" opens the message in an editor (Windows → notepad). */
function ensureEditor(): void {
  if (process.env.EDITOR || process.env.VISUAL) return;
  if (platform() === 'win32') process.env.EDITOR = 'notepad';
}

async function main(): Promise<void> {
  const setupAlias = process.argv.includes('--setup-git-alias') || process.argv.includes('-s');
  if (setupAlias) {
    try {
      await setupGitAlias();
      console.log(chalk.green('✓ Git alias added. You can now use:'));
      console.log(chalk.cyan('  git smart-commit'));
      console.log(chalk.cyan('  git sc'));
      return;
    } catch (e) {
      console.error(chalk.red('Failed to add Git alias.'), e);
      process.exit(1);
    }
  }

  try {
    const diff = await getStagedDiff();
    await ensureApiKey();

    let message = '';
    let loop = true;
    let skipGenerate = false;

    while (loop) {
      if (!skipGenerate) {
        const spinner = ora('Generating commit message...').start();
        try {
          message = await generateCommitMessage(diff);
          spinner.succeed('Commit message generated.');
        } catch (aiErr) {
          spinner.fail('Failed to generate commit message.');
          const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          if (errMsg.includes('fetch failed') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ENOTFOUND')) {
            throw new Error(
              errMsg + '\n\nPossible causes: no internet, firewall/proxy blocking, or Gemini API unreachable. Check your connection and try again.'
            );
          }
          throw aiErr;
        }
      }
      skipGenerate = false;

      console.log();
      console.log(chalk.cyan('Suggested commit message:'), chalk.green(message));
      console.log();

      const { action } = await inquirer.prompt<{ action: Choice }>({
        type: 'list',
        name: 'action',
        message: 'Commit with this message?',
        choices: [
          { name: 'Yes', value: 'yes' },
          { name: 'Edit', value: 'edit' },
          { name: 'Regenerate', value: 'regenerate' },
          { name: 'No', value: 'no' },
        ],
      });

      if (action === 'yes') {
        await runCommit(message);
        console.log(chalk.green('✓ Commit successful.'));
        loop = false;
      } else if (action === 'no') {
        console.log(chalk.yellow('Cancelled.'));
        loop = false;
      } else if (action === 'edit') {
        ensureEditor();
        const { editedMessage } = await inquirer.prompt<{ editedMessage: string }>({
          type: 'editor',
          name: 'editedMessage',
          message: 'Edit the message in your editor (save and close to confirm):',
          default: message,
        });
        const trimmed = editedMessage?.trim();
        if (trimmed) message = trimmed;
        skipGenerate = true;
      }
      // regenerate → loop continues, skipGenerate is false so a new message is generated
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('GEMINI_API_KEY not found')) {
      console.error(chalk.yellow(getApiKeyMissingMessage()));
      console.error(chalk.cyan('\n→ ' + GEMINI_SETUP_URL));
    } else {
      console.error(chalk.red(msg));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
