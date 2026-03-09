/**
 * Tests for AI module — getApiKeyMissingMessage, generateCommitMessage (mocked).
 */

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

import { generateCommitMessage, getApiKeyMissingMessage, GEMINI_SETUP_URL } from './ai';

describe('GEMINI_SETUP_URL', () => {
  it('is the Google AI Studio URL', () => {
    expect(GEMINI_SETUP_URL).toBe('https://aistudio.google.com/apikey');
  });
});

describe('getApiKeyMissingMessage', () => {
  it('includes setup instructions and URL', () => {
    const msg = getApiKeyMissingMessage();
    expect(msg).toContain('GEMINI_API_KEY not found');
    expect(msg).toContain(GEMINI_SETUP_URL);
    expect(msg).toContain('.env');
    expect(msg).toContain('One-time setup');
  });
});

describe('generateCommitMessage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGenerateContent.mockResolvedValue({
      text: '✨ Add new feature\n\n- Implement core logic.',
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateCommitMessage('diff')).rejects.toThrow('GEMINI_API_KEY not found');
  });

  it('throws when GEMINI_API_KEY is empty string', async () => {
    process.env.GEMINI_API_KEY = '   ';
    await expect(generateCommitMessage('diff')).rejects.toThrow('GEMINI_API_KEY not found');
  });

  it('returns processed message when API key is set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const result = await generateCommitMessage('some diff');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('some diff'),
      })
    );
  });

  it('capitalizes first letter after emoji when AI returns lowercase', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValueOnce({ text: '✨ add new feature' });
    const result = await generateCommitMessage('diff');
    expect(result).toMatch(/✨ Add/);
  });

  it('strips markdown code blocks from AI response', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValueOnce({
      text: '```\n✨ Add feature\n```',
    });
    const result = await generateCommitMessage('diff');
    expect(result).not.toContain('```');
    expect(result.trim()).toBe('✨ Add feature');
  });
});
