# Spec: Multi-Provider AI (BYOK)

**Status:** implemented
**Author:** @t_sajith
**Created:** 2026-06-12
**Last updated:** 2026-06-12

---

## Summary

Users can supply their own API key for Groq or OpenAI, or point the app at a local Ollama instance. Provider config is stored in `localStorage` and sent with each generation request — no key ever touches the server's environment beyond the single request.

## Problem Statement

Locking users to a single AI provider creates a hard dependency on Groq uptime and free-tier limits. Offering BYOK lets power users use their own quota and lets local-first users run entirely offline with Ollama.

## Proposed Solution

An `AISettingsPanel` component lets users pick a provider and enter credentials. Config is persisted in `localStorage`. The serverless route reads provider config from the request body (not env vars) and dispatches to the correct SDK client.

## Acceptance Criteria

1. Given a user enters a valid Groq API key, when a recipe is generated, then the Groq SDK is used with that key.
2. Given a user enters a valid OpenAI API key, when a recipe is generated, then the OpenAI SDK is used with that key.
3. Given a user sets Ollama as the provider, when a recipe is generated, then requests go to `http://localhost:11434/v1` (or the configured endpoint).
4. Given no provider is configured, when a recipe is generated, then the server falls back to the `GROQ_API_KEY` environment variable.
5. Given a user's API key is stored, when the page reloads, then the key is restored from `localStorage`.
6. Given an invalid API key, when a recipe is generated, then the error is surfaced in the UI (not silently swallowed).

## Out of Scope

- Server-side key storage or user accounts
- Key rotation or validation before use
- Providers beyond Groq, OpenAI, and Ollama

## References

- Implementation: `src/lib/ai-config.ts`, `src/components/AISettingsPanel.tsx`
- Route dispatch: `src/app/api/generate-recipe/route.ts`
