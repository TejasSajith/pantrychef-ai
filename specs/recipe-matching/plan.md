# Plan: Recipe Matching

**Status:** completed
**Author:** @t_sajith
**Created:** 2026-06-12

---

## Objective

In-browser recipe scoring that runs in < 5 ms over the full 13k-recipe dataset.

## Approach

### Normalisation pipeline (per token)

1. Lowercase + strip non-alpha characters
2. Remove stop words (`and`, `of`, `the`, …)
3. Plural expansion: `-ies → -y`, `-oes → -o`, `-es → -e`, `-s → strip`

### Matching (per recipe)

Pre-compute one `Set<string>` per pantry item. For each recipe ingredient, tokenise + expand, then check `Set.has()` against every pantry set. O(P × I) where P = pantry size, I = avg ingredients — fast enough at hackathon scale.

### Ranking

Primary: `matchCount DESC`  
Secondary: `missingItems.length ASC`

### Dataset

CSV → JSON conversion runs once via `scripts/mergeData.ts`. Output `public/data/cleaned_recipes.json` is committed and fetched once on first load, then cached in module scope.

## Key Files

| File                                  | Role                                            |
| ------------------------------------- | ----------------------------------------------- |
| `src/utils/recipeMatcher.ts`          | `scoreRecipes`, `findTopMatches`, `loadRecipes` |
| `src/__tests__/recipeMatcher.test.ts` | Unit tests (8 cases)                            |
| `public/data/cleaned_recipes.json`    | Pre-built recipe dataset                        |
| `scripts/mergeData.ts`                | One-time CSV → JSON conversion                  |
