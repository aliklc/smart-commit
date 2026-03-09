/**
 * AI integration — commit message generation (Google Gemini).
 */

import { GoogleGenAI } from '@google/genai';

const COMMIT_PROMPT = `You are an expert developer. Review the code changes below and return a SHORT git commit message.

LENGTH (strict):
- SMALL (typo, 1–2 files, config, README/docs): SUBJECT only. No body. Example: "📝 Improve README with tables and diagram"
- MEDIUM (one feature/fix, a few files): SUBJECT + 1–2 bullets max. Each bullet = few words, not a sentence.
- LARGE (many files, multiple areas): SUBJECT + 2–4 bullets. Still short phrases only.

RULES:
- SUBJECT: One emoji + capitalized verb + short summary. No "feat:" prefix. Emoji: feature ✨, fix 🐛, chore 🔧, docs 📝, refactor ♻️, style 💄, test ✅, perf ⚡, other 📦.
- BODY: Do NOT list every change. Do NOT explain each line. Summarize in 1–2 short bullets (e.g. "Add tables and Mermaid diagram" not "Restructure the README into distinct sections... Add a Mermaid flowchart..."). For README/docs/config/chore, prefer subject only.
- Bullets = short phrases (3–8 words), never full sentences.

Bad (too long): "📝 Enhance README\n\n- Restructure the README into distinct sections for features, quick start...\n- Add a Mermaid flowchart to visually explain..."
Good: "📝 Improve README with tables and diagram" or "📝 Improve README\n\n- Add structure, tables, and Mermaid diagram."

Output only the commit message. No code blocks.

Code changes (git diff):
`;

/**
 * Sends staged diff to AI and returns a Conventional Commits–style message.
 * GEMINI_API_KEY must be set (e.g. in .env).
 */
export const GEMINI_SETUP_URL = 'https://aistudio.google.com/apikey';

export function getApiKeyMissingMessage(): string {
  return [
    'GEMINI_API_KEY not found. One-time setup (free):',
    '',
    '  1. ' + GEMINI_SETUP_URL,
    '  2. Create an API key',
    '  3. Add to your project root .env:',
    '     GEMINI_API_KEY=your_key_here',
    '',
    'Or run: GEMINI_API_KEY=your_key smart-commit',
    'Then run smart-commit again.',
  ].join('\n');
}

export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(getApiKeyMissingMessage());
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: COMMIT_PROMPT + diff,
  });

  const text = response.text;
  if (!text || typeof text !== 'string') {
    throw new Error('AI did not return a valid commit message.');
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
  // Capitalize first letter after emoji on subject line (fallback)
  subjectLine = subjectLine.replace(/^([\p{Emoji}\p{Symbol}]\s+)([a-z])/u, (_, prefix, c) => prefix + c.toUpperCase());

  const message = body ? `${subjectLine}\n\n${body}` : subjectLine;
  return message;
}
