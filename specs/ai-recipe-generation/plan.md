# Plan: AI Recipe Generation

**Status:** completed
**Author:** @t_sajith
**Created:** 2026-06-12

---

## Objective

Serverless API route that takes pantry + candidates and returns 3 AI-generated recipe cards.

## Approach

### Prompt structure

The prompt is built inline in `route.ts`. It includes:

- Full pantry with quantities and units
- Top 6 dataset candidates (title + ingredients)
- Meal config: servings, dietary flags, cuisine, craving, prep time
- Exact JSON schema the model must return
- Instruction to never substitute structural bases

### Response validation

The route wraps `JSON.parse` in try/catch. On failure it returns `{ error: 'parse_failed', raw }` with status 422.

### Timeout

Vercel serverless functions have a 30 s wall clock. The prompt is kept compact (no few-shot examples) to stay under 20 s on Groq free tier.

## Key Files

| File                                   | Role                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `src/app/api/generate-recipe/route.ts` | POST handler, prompt builder, provider dispatch            |
| `src/lib/ai-config.ts`                 | Provider config resolution                                 |
| `src/lib/types.ts`                     | `GeneratedRecipe`, `GeneratedRecipeResponse`, `MealConfig` |
| `src/components/RecipeDisplay.tsx`     | Renders the 3 cards                                        |
