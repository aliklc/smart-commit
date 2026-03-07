/**
 * AI entegrasyonu - commit mesajı üretimi (Google Gemini)
 */

import { GoogleGenAI } from '@google/genai';

const COMMIT_PROMPT = `You are an expert developer. Review the code changes below and return a git commit message in this exact format:

1. SUBJECT (first line): One emoji + one capitalized verb + short summary. No "feat:" or "fix:" prefix. Emoji by change type:
   - new feature → ✨
   - bug fix → 🐛
   - chore/tooling → 🔧
   - docs → 📝
   - refactor → ♻️
   - style → 💄
   - test → ✅
   - performance → ⚡
   - other → 📦

2. BODY (after a blank line): List the concrete changes as bullet points. Each line must start with "- " (hyphen + space). Use 2-6 bullets. Full sentences, English only.

Example:
♻️ Refactor phone input handling and date formatting

- Introduced a new PhoneInput component to encapsulate phone number input logic, including country selection and local number formatting.
- Replaced inline phone input logic in AddressFormScreen and EditProfileScreen with the new PhoneInput component.
- Added utility functions for date formatting: formatDateDot and formatDateSlash for consistent date display across the application.
- Updated GreenCardQuotationScreen, InsuranceSuccessScreen, and TravelQuotationScreen to use the new date formatting utilities.
- Refactored phone number parsing logic into a separate phoneUtils module for better code organization and reusability.

Output only the commit message (subject, blank line, bullet list). No code blocks or extra text.

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

  let raw = text.trim().replace(/^["']|["']$/g, '');
  raw = raw.replace(/^```\w*\n?|```\s*$/g, '').trim();
  const lines = raw.split('\n').map((l) => l.trimEnd());
  const subject = lines[0] ?? '';
  const bodyLines = lines.slice(1);
  const body = bodyLines.join('\n').trim();

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

  let subjectLine = subject;
  const hasLeadingEmoji = /^[\p{Emoji}\p{Symbol}]\s/u.test(subjectLine);
  if (!hasLeadingEmoji) {
    const verbMatch = subjectLine.match(/^(refactor|add|fix|update|remove|introduce|chore|docs|style|test|perf)\s+/i);
    const verbToType: Record<string, keyof typeof emojiByType> = {
      add: 'feat',
      introduce: 'feat',
      update: 'chore',
      remove: 'chore',
    };
    const type = verbMatch ? (verbToType[verbMatch[1].toLowerCase()] ?? verbMatch[1].toLowerCase()) : undefined;
    const emoji = type && type in emojiByType ? emojiByType[type] : '📦';
    subjectLine = `${emoji} ${subjectLine}`;
  }
  // Konu satırında emojiden sonraki ilk harfi büyüt (fallback)
  subjectLine = subjectLine.replace(/^([\p{Emoji}\p{Symbol}]\s+)([a-z])/u, (_, prefix, c) => prefix + c.toUpperCase());

  const message = body ? `${subjectLine}\n\n${body}` : subjectLine;
  return message;
}
