#!/usr/bin/env node

/**
 * Smart Commit CLI - AI destekli Conventional Commits jeneratörü
 * Entry point
 */

import 'dotenv/config';
import ora from 'ora';
import { generateCommitMessage } from './ai';
import { getStagedDiff } from './git';

async function main(): Promise<void> {
  try {
    const diff = await getStagedDiff();

    const spinner = ora('AI mesajı düşünüyor...').start();
    let message: string;
    try {
      message = await generateCommitMessage(diff);
      spinner.succeed('Commit mesajı üretildi.');
    } catch (aiErr) {
      spinner.fail('AI mesajı üretilemedi.');
      throw aiErr;
    }

    console.log('\nÖnerilen commit mesajı:', message);
    // Faz 4: Evet/Hayır/Yeniden Üret ve git commit
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
