/**
 * Tests for setup module — ensureApiKey (mocked fs and inquirer).
 */

jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}));

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import inquirer from 'inquirer';
import { ensureApiKey } from './setup';

const mockPrompt = (inquirer as unknown as { prompt: jest.Mock }).prompt;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

describe('ensureApiKey', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockPrompt.mockResolvedValue({ key: 'test-api-key-123' });
    mockExistsSync.mockReturnValue(false);
    mockWriteFileSync.mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns immediately when GEMINI_API_KEY is already set', async () => {
    process.env.GEMINI_API_KEY = 'existing-key';
    await ensureApiKey();
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('returns immediately when GEMINI_API_KEY is set but had whitespace', async () => {
    process.env.GEMINI_API_KEY = '  key  ';
    await ensureApiKey();
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('prompts and writes .env when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    mockExistsSync.mockReturnValue(false);

    await ensureApiKey();

    expect(mockPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'input',
        name: 'key',
        message: 'Paste your API key:',
      })
    );
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      'GEMINI_API_KEY=test-api-key-123\n',
      'utf-8'
    );
    expect(process.env.GEMINI_API_KEY).toBe('test-api-key-123');
  });

  it('updates existing .env when key already exists in file', async () => {
    delete process.env.GEMINI_API_KEY;
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('OTHER_VAR=value\nGEMINI_API_KEY=old-key\n');

    await ensureApiKey();

    expect(mockWriteFileSync).toHaveBeenCalled();
    const written = mockWriteFileSync.mock.calls[0][1] as string;
    expect(written).toContain('GEMINI_API_KEY=test-api-key-123');
    expect(written).toContain('OTHER_VAR=value');
  });

  it('appends GEMINI_API_KEY to .env when key not in file', async () => {
    delete process.env.GEMINI_API_KEY;
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('OTHER_VAR=value\n');

    await ensureApiKey();

    expect(mockWriteFileSync).toHaveBeenCalled();
    const written = mockWriteFileSync.mock.calls[0][1] as string;
    expect(written).toContain('GEMINI_API_KEY=test-api-key-123');
    expect(written).toContain('OTHER_VAR=value');
  });
});
