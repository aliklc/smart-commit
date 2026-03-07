# smart-commit

AI-powered CLI that generates **Conventional Commits** (with emoji + bullet body) from your staged `git diff` using Google Gemini.

- One-time setup: paste your API key when asked; it’s saved to `.env` in your project.
- No manual `.env` editing: first run asks for the key and creates the file.
- Works in any repo: `npx smart-commit` or install and run `smart-commit` after staging changes.

## Install

```bash
npm install -g @aliklc/smart-commit
```

Or use without installing:

```bash
npx @aliklc/smart-commit
```

## Use

1. Stage your changes: `git add .` (or specific files).
2. Run:

```bash
smart-commit
```

3. First time only: you’ll be asked for a **Gemini API key** (free at [Google AI Studio](https://aistudio.google.com/apikey)). Paste it; the tool saves it to `.env` in the current project and won’t ask again.
4. Review the suggested commit message, then choose **Yes** (commit), **No** (cancel), or **Regenerate**.

### Use as a Git command (Git Bash, etc.)

To run it as `git sc` or `git smart-commit` from any terminal (including Git Bash), add the alias once:

**From Git Bash** (recommended):

```bash
npx @aliklc/smart-commit --setup-git-alias
```

If you installed globally: `smart-commit -s` or `smart-commit --setup-git-alias`

Then in any Git repo you can use:

```bash
git smart-commit
git sc
```

Stage your files with `git add` first, then run `git sc`.

## Requirements

- Node.js **20+**
- Git repo with staged changes
- [Gemini API key](https://aistudio.google.com/apikey) (free)

## License

ISC
