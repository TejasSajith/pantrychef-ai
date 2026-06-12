# Spec: AI Recipe Generation

**Status:** implemented
**Author:** @t_sajith
**Created:** 2026-06-12
**Last updated:** 2026-06-12

---

## Summary

The top recipe candidates from the local matcher are sent to an LLM via `POST /api/generate-recipe`. The model returns three fully tailored recipe cards with instructions, smart substitutions, and exact pantry deduction amounts.

## Problem Statement

Raw recipe dataset entries lack step-by-step instructions adapted to the user's actual pantry, serving size, dietary needs, and cuisine preference. An LLM bridges this gap.

## Proposed Solution

A Next.js serverless route (`src/app/api/generate-recipe/route.ts`) receives the pantry, top candidates, meal config, and AI provider config. It builds a structured prompt and calls the chosen provider (Groq, OpenAI, or Ollama). The response is validated against `GeneratedRecipeResponse` and returned as JSON.

## Acceptance Criteria

1. Given valid pantry and candidates, when `POST /api/generate-recipe` is called, then exactly 3 recipe objects are returned.
2. Given a dietary filter is set, when recipes are generated, then all 3 recipes respect that filter.
3. Given a cuisine is selected, when recipes are generated, then all 3 recipes adapt to that regional profile.
4. Given a serving count, when recipes are generated, then ingredient quantities scale proportionally.
5. Given an ingredient is missing from the pantry, when the AI generates substitutions, then structural bases (eggs, rice, pasta) are never substituted.
6. Given the AI response is invalid JSON, when parsed, then the API returns a 422 with the raw text for debugging.
7. Given the request exceeds 20 s, when it times out, then the API returns a 504.

## Out of Scope

- Streaming responses
- Caching AI responses
- Fine-tuning the model

## References

- Implementation: `src/app/api/generate-recipe/route.ts`
- AI config: `src/lib/ai-config.ts`
- Types: `src/lib/types.ts` (`GeneratedRecipe`, `GeneratedRecipeResponse`)
