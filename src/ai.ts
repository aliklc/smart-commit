/**
 * AI integration — commit message generation (Google Gemini).
 */

import { GoogleGenAI } from '@google/genai';

const COMMIT_PROMPT = `You are an expert developer. Review the code changes below and return a git commit message. Adapt the LENGTH to the scope of the change:

- SMALL change (e.g. typo, single line, config tweak): SUBJECT only. One emoji + one capitalized verb + short summary. No body.
- MEDIUM change (a few files or one clear feature/fix): SUBJECT + 1–3 bullet points. Be concise.
- LARGE change (many files or multiple logical changes): SUBJECT + up to 4–6 bullets. Still keep each bullet to one clear sentence.

RULES:
- SUBJECT: One emoji + capitalized verb + short summary. No "feat:" or "fix:" prefix. Emoji by type: new feature ✨, bug fix 🐛, chore 🔧, docs 📝, refactor ♻️, style 💄, test ✅, performance ⚡, other 📦.
- BODY (only when needed): Each line starts with "- " (hyphen + space). English only. Do not pad; only describe what actually changed.

Examples:
Small: "🔧 Fix typo in README"
Medium: "✨ Add login form\n\n- Add email and password fields.\n- Validate on submit and show errors."
Large: use more bullets only if the diff justifies it.

Output only the commit message. No code blocks or extra text.

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
    model: 'gemini-2.5-flash',
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
