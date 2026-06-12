# Tasks: AI Recipe Generation

**Owner:** @t_sajith
**Status:** completed

---

## Goal

Working `POST /api/generate-recipe` that returns 3 AI-generated recipe cards for any provider.

## Tasks

### Done

- [x] Define `GeneratedRecipe` and `GeneratedRecipeResponse` types
- [x] Define `MealConfig` type (servings, dietary flags, cuisine, craving, prepTime)
- [x] Build structured prompt with pantry quantities, candidates, and JSON schema
- [x] Implement Groq dispatch path
- [x] Implement OpenAI dispatch path
- [x] Implement Ollama dispatch path
- [x] Add JSON parse error handling (422 fallback)
- [x] Add 20 s timeout guard
- [x] Implement `RecipeDisplay.tsx` — tabbed 3-card view with pantry impact preview
- [x] Wire "I Cooked This!" button to pantry deduction
