/**
 * AI entegrasyonu - commit mesajı üretimi (Google Gemini)
 */

import { GoogleGenAI } from '@google/genai';

const COMMIT_PROMPT = `Sen uzman bir yazılımcısın. Aşağıdaki kod değişikliklerini incele ve bana sadece Conventional Commits standartlarına uygun, tek cümlelik bir git commit mesajı dön.
Örnek format: feat: add user login endpoint
Sadece tek satır commit mesajını yaz, başka açıklama ekleme.

Kod değişiklikleri (git diff):
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
    model: 'gemini-2.0-flash',
    contents: COMMIT_PROMPT + diff,
  });

  const text = response.text;
  if (!text || typeof text !== 'string') {
    throw new Error('AI geçerli bir commit mesajı döndürmedi.');
  }

  return text.trim().replace(/^["']|["']$/g, '').split('\n')[0].trim();
}
