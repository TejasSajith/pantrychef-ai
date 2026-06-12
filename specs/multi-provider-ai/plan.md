# Plan: Multi-Provider AI (BYOK)

**Status:** completed
**Author:** @t_sajith
**Created:** 2026-06-12

---

## Objective

Let users plug in their own Groq, OpenAI, or Ollama credentials without any server-side key management.

## Approach

### Config shape

```ts
interface AIConfig {
  provider: 'groq' | 'openai' | 'ollama';
  apiKey?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
}
```

Stored in `localStorage` under `ai_config`. Sent as part of the `POST /api/generate-recipe` request body.

### Server dispatch

```
if provider === 'groq'    → new Groq({ apiKey: cfg.apiKey ?? env.GROQ_API_KEY })
if provider === 'openai'  → new OpenAI({ apiKey: cfg.apiKey })
if provider === 'ollama'  → new OpenAI({ apiKey: 'ollama', baseURL: cfg.ollamaEndpoint + '/v1' })
```

### UI

`AISettingsPanel.tsx` renders a provider selector and conditional key/endpoint fields. Changes are saved to `localStorage` immediately on input.

## Key Files

| File                                   | Role                              |
| -------------------------------------- | --------------------------------- |
| `src/lib/ai-config.ts`                 | Config type, localStorage helpers |
| `src/components/AISettingsPanel.tsx`   | Settings UI                       |
| `src/app/api/generate-recipe/route.ts` | Provider dispatch logic           |
