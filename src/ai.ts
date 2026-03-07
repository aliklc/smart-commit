/**
 * AI entegrasyonu - commit mesajı üretimi (Google Gemini)
 */

import { GoogleGenAI } from '@google/genai';

const COMMIT_PROMPT = `You are an expert developer. Review the code changes below and return a single git commit message that:
1. Follows Conventional Commits (feat, fix, chore, docs, refactor, style, test, perf).
2. Is written entirely in English.
3. Starts with exactly one emoji that matches the type:
   - feat → ✨
   - fix → 🐛
   - chore → 🔧
   - docs → 📝
   - refactor → ♻️
   - style → 💄
   - test → ✅
   - perf → ⚡
   - other → 📦
4. After the type and colon, the description must start with a verb in imperative mood, capitalized (e.g. Add, Fix, Update, Remove).

Example: ✨ feat: Add user login endpoint
Output only the single line commit message, no other text.

Code changes (git diff):
`;

/**
 * Staged diff'i AI'a gönderip Conventional Commits uyumlu commit mesajı üretir.
 * GEMINI_API_KEY .env dosyasında tanımlı olmalı.
 */
export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY bulunamadı. .env dosyasına ekleyin veya https://aistudio.google.com/apikey adresinden API anahtarı alın.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: COMMIT_PROMPT + diff,
  });

  const text = response.text;
  if (!text || typeof text !== 'string') {
    throw new Error('AI geçerli bir commit mesajı döndürmedi.');
  }

  let message = text.trim().replace(/^["']|["']$/g, '').split('\n')[0].trim();

  // Emoji yoksa conventional type'a göre başa ekle (fallback)
  const emojiByType: Record<string, string> = {
    feat: '✨',
    fix: '🐛',
    chore: '🔧',
    docs: '📝',
    refactor: '♻️',
    style: '💄',
    test: '✅',
    perf: '⚡',
  };
  const hasLeadingEmoji = /^[\p{Emoji}\p{Symbol}]/u.test(message);
  if (!hasLeadingEmoji) {
    const typeMatch = message.match(/^(feat|fix|chore|docs|refactor|style|test|perf)(!)?\s*:/i);
    const emoji = typeMatch ? emojiByType[typeMatch[1].toLowerCase()] : '📦';
    message = `${emoji} ${message}`;
  }

  // Açıklama kısmı (type: sonrası) fiil ile başlamalı, büyük harf (fallback)
  message = message.replace(/(:\s+)([a-z])/, (_, afterColon, firstChar) => afterColon + firstChar.toUpperCase());

  return message;
}
