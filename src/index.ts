#!/usr/bin/env node

/**
 * Smart Commit CLI — AI-powered Conventional Commits generator.
 * Entry point.
 */

import 'dotenv/config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { generateCommitMessage, getApiKeyMissingMessage, GEMINI_SETUP_URL } from './ai';
import { ensureApiKey } from './setup';
import { getStagedDiff, runCommit, setupGitAlias } from './git';

type Choice = 'yes' | 'no' | 'regenerate';

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

    let message: string;
    let loop = true;

    while (loop) {
      const spinner = ora('Generating commit message...').start();
      try {
        message = await generateCommitMessage(diff);
        spinner.succeed('Commit message generated.');
      } catch (aiErr) {
        spinner.fail('Failed to generate commit message.');
        throw aiErr;
      }

      console.log();
      console.log(chalk.cyan('Suggested commit message:'), chalk.green(message));
      console.log();

      const { action } = await inquirer.prompt<{ action: Choice }>({
        type: 'list',
        name: 'action',
        message: 'Commit with this message?',
        choices: [
          { name: 'Yes', value: 'yes' },
          { name: 'No', value: 'no' },
          { name: 'Regenerate', value: 'regenerate' },
        ],
      });

      if (action === 'yes') {
        await runCommit(message);
        console.log(chalk.green('✓ Commit successful.'));
        loop = false;
      } else if (action === 'no') {
        console.log(chalk.yellow('Cancelled.'));
        loop = false;
      }
      // regenerate → loop continues, new message is generated
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
