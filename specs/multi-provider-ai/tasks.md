# Tasks: Multi-Provider AI (BYOK)

**Owner:** @t_sajith
**Status:** completed

---

## Goal

Users can switch between Groq, OpenAI, and Ollama without touching environment variables.

## Tasks

### Done

- [x] Define `AIConfig` type and `provider` union in `src/lib/ai-config.ts`
- [x] Implement `getAIConfig` and `setAIConfig` localStorage helpers
- [x] Build `AISettingsPanel.tsx` with provider selector, API key field, Ollama endpoint + model fields
- [x] Pass `AIConfig` from browser to `POST /api/generate-recipe` request body
- [x] Implement Groq dispatch in route (falls back to `GROQ_API_KEY` env var)
- [x] Implement OpenAI dispatch in route
- [x] Implement Ollama dispatch in route (OpenAI-compatible `/v1` endpoint)
- [x] Surface provider errors in the UI
- [x] Hydrate `AISettingsPanel` from `localStorage` on mount
