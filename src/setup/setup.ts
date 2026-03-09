/**
 * On first run, prompts for API key and writes to .env so the user does not edit it manually.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { GEMINI_SETUP_URL } from '../ai/ai';

const ENV_KEY = 'GEMINI_API_KEY';
const ENV_FILE = join(process.cwd(), '.env');

function saveApiKeyToEnv(key: string): void {
  const value = key.trim();
  if (existsSync(ENV_FILE)) {
    const content = readFileSync(ENV_FILE, 'utf-8');
    const newContent = content.includes(ENV_KEY + '=')
      ? content.replace(new RegExp(`^${ENV_KEY}=.*$`, 'm'), `${ENV_KEY}=${value}`)
      : content.trimEnd() + (content.endsWith('\n') ? '' : '\n') + `\n${ENV_KEY}=${value}\n`;
    writeFileSync(ENV_FILE, newContent, 'utf-8');
  } else {
    writeFileSync(ENV_FILE, `${ENV_KEY}=${value}\n`, 'utf-8');
  }
  process.env[ENV_KEY] = value;
}

/**
 * If API key is missing, prompts the user and writes to .env, then sets process.env.
 */
export async function ensureApiKey(): Promise<void> {
  if (process.env[ENV_KEY]?.trim()) return;

  console.log(chalk.cyan('Smart Commit needs a Gemini API key once (free).'));
  console.log(chalk.gray('→ ' + GEMINI_SETUP_URL));
  console.log();

  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: 'Paste your API key:',
    validate: (v) => (v?.trim() ? true : 'Key cannot be empty'),
  });

  if (!key?.trim()) {
    console.log(chalk.yellow('Exiting. Run again when ready.'));
    process.exit(0);
  }

  saveApiKeyToEnv(key.trim());
  console.log(chalk.green('✓ Key saved to .env. You won’t be asked again.\n'));
}
