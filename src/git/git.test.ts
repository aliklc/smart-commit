/**
 * Tests for git module — getStagedDiff, runCommit, setupGitAlias.
 */

let execResolve: { stdout: string; stderr: string } | null = null;
let execReject: Error | null = null;

jest.mock('node:util', () => ({
  ...jest.requireActual('node:util'),
  promisify: () => (..._args: unknown[]) =>
    execReject ? Promise.reject(execReject) : Promise.resolve(execResolve ?? { stdout: '', stderr: '' }),
}));

jest.mock('node:child_process', () => ({
  exec: jest.fn(),
  execFile: jest.fn(),
}));

import { getStagedDiff, runCommit, setupGitAlias } from './git';

describe('getStagedDiff', () => {
  beforeEach(() => {
    execResolve = null;
    execReject = null;
  });

  it('returns trimmed stdout when git diff --staged has content', async () => {
    execResolve = { stdout: '  diff content here  \n', stderr: '' };
    const result = await getStagedDiff();
    expect(result).toBe('diff content here');
  });

  it('throws when staged diff is empty (no staged files)', async () => {
    execResolve = { stdout: '', stderr: '' };
    await expect(getStagedDiff()).rejects.toThrow('No staged files');
    await expect(getStagedDiff()).rejects.toThrow('git add');
  });

  it('throws when not a git repository', async () => {
    execReject = new Error('fatal: not a git repository');

    await expect(getStagedDiff()).rejects.toThrow('not a Git repository');
    await expect(getStagedDiff()).rejects.toThrow('git init');
  });
});

describe('runCommit', () => {
  beforeEach(() => {
    execResolve = { stdout: '', stderr: '' };
    execReject = null;
  });

  it('resolves when git commit succeeds', async () => {
    await expect(runCommit('✨ Add feature')).resolves.not.toThrow();
  });

  it('passes multi-line message without throwing', async () => {
    const msg = '📝 Update README\n\n- Add table';
    await expect(runCommit(msg)).resolves.not.toThrow();
  });
});

describe('setupGitAlias', () => {
  beforeEach(() => {
    execResolve = { stdout: '', stderr: '' };
    execReject = null;
  });

  it('resolves when alias config succeeds', async () => {
    await expect(setupGitAlias()).resolves.not.toThrow();
  });
});
