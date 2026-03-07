#!/usr/bin/env node

/**
 * Smart Commit CLI - AI destekli Conventional Commits jeneratörü
 * Entry point
 */

import 'dotenv/config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { generateCommitMessage, getApiKeyMissingMessage, GEMINI_SETUP_URL } from './ai';
import { ensureApiKey } from './setup';
import { getStagedDiff, runCommit } from './git';

type Choice = 'evet' | 'hayir' | 'yeniden';

async function main(): Promise<void> {
  try {
    const diff = await getStagedDiff();
    await ensureApiKey();

    let message: string;
    let loop = true;

    while (loop) {
      const spinner = ora('AI mesajı düşünüyor...').start();
      try {
        message = await generateCommitMessage(diff);
        spinner.succeed('Commit mesajı üretildi.');
      } catch (aiErr) {
        spinner.fail('AI mesajı üretilemedi.');
        throw aiErr;
      }

      console.log();
      console.log(chalk.cyan('Önerilen commit mesajı:'), chalk.green(message));
      console.log();

      const { action } = await inquirer.prompt<{ action: Choice }>({
        type: 'list',
        name: 'action',
        message: 'Bu mesajla commit atmak ister misin?',
        choices: [
          { name: 'Evet', value: 'evet' },
          { name: 'Hayır', value: 'hayir' },
          { name: 'Yeniden Üret', value: 'yeniden' },
        ],
      });

      if (action === 'evet') {
        await runCommit(message);
        console.log(chalk.green('✓ Commit başarıyla atıldı.'));
        loop = false;
      } else if (action === 'hayir') {
        console.log(chalk.yellow('İşlem iptal edildi.'));
        loop = false;
      }
      // yeniden → loop devam eder, yeni mesaj üretilir
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('GEMINI_API_KEY bulunamadı')) {
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
