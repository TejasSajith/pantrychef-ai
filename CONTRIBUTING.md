# Contributing to PantryChef AI

## Getting started

```bash
git clone https://code.swecha.org/t_sajith/pantrychefai.git
cd pantrychefai
npm install
cp .env.example .env.local   # add your GROQ_API_KEY
npm run dev
```

## Branch workflow

1. Branch from `main`: `git checkout -b feature/my-change`
2. Write or update the spec in `specs/` before touching `src/`
3. Keep commits in [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `docs:`, etc.)
4. Open a Merge Request into `main` — link the spec in the MR description

## Rules

- **Local matcher must stay pure** — `src/utils/recipeMatcher.ts` must have zero network calls or side effects
- **AI prompt changes** must stay within the 20 s Groq timeout on Vercel's free tier
- **Tests required** — new utility functions need a corresponding test in `src/__tests__/`
- **No secrets in code** — use `.env.local` for keys; the pre-commit hook will block anything that looks like a credential

## Running checks locally

```bash
npm run lint          # ESLint
npm run knip          # dead code check
npm run test          # Jest
npm run test:coverage # Jest + coverage report
npm audit             # dependency vulnerability scan
```

## Code style

- TypeScript strict mode — no `any` without a comment explaining why
- Tailwind CSS for all styling — no inline styles
- Functional React components only

## Reporting bugs

Open an issue on the [GitLab project](https://code.swecha.org/t_sajith/pantrychefai/-/issues) using the bug template in `.specify/templates/bug.md`.
