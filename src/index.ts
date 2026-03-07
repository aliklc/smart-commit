#!/usr/bin/env node

/**
 * Smart Commit CLI - AI destekli Conventional Commits jeneratörü
 * Entry point
 */

import { getStagedDiff } from './git';

async function main(): Promise<void> {
  try {
    const diff = await getStagedDiff();
    console.log('Staged diff alındı, uzunluk:', diff.length, 'karakter');
    // Faz 3'te AI'a gönderilecek
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
