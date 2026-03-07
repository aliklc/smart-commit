/**
 * İlk kullanımda API anahtarı isteyip .env'e yazar; kullanıcı manuel .env ile uğraşmaz.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { GEMINI_SETUP_URL } from './ai';

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
 * API anahtarı yoksa kullanıcıdan isteyip .env'e yazar. Sonra process.env'de key hazır olur.
 */
export async function ensureApiKey(): Promise<void> {
  if (process.env[ENV_KEY]?.trim()) return;

  console.log(chalk.cyan('Smart Commit için bir kez Gemini API anahtarı gerekiyor (ücretsiz).'));
  console.log(chalk.gray('→ ' + GEMINI_SETUP_URL));
  console.log();

  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: 'API anahtarını yapıştır:',
    validate: (v) => (v?.trim() ? true : 'Anahtar boş olamaz'),
  });

  if (!key?.trim()) {
    console.log(chalk.yellow('Çıkılıyor. İstediğin zaman tekrar dene.'));
    process.exit(0);
  }

  saveApiKeyToEnv(key.trim());
  console.log(chalk.green('✓ Anahtar .env dosyasına kaydedildi. Bir daha sormayacağım.\n'));
}
