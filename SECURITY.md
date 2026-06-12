# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Email **tejas.sajith@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You will receive an acknowledgement within 48 hours and a resolution timeline within 7 days.

## Scope

In scope:
- API key exposure or leakage via the serverless function
- XSS via recipe content rendered in the UI
- Dependency vulnerabilities with a CVSS score of 7.0 or above

Out of scope:
- Vulnerabilities in Vercel infrastructure
- Groq or OpenAI API security issues (report those to the respective vendors)
- Denial-of-service against the free-tier Vercel function

## Security practices in this project

- API keys are read only from environment variables — never hardcoded
- `detect-secrets` pre-commit hook blocks credential commits
- `npm audit --audit-level=high` runs in CI on every push
- The local matcher runs entirely in the browser — no user data is sent to a server except the pantry payload for AI generation
