# Tasks: Recipe Matching

**Owner:** @t_sajith
**Status:** completed

---

## Goal

Pure in-browser recipe scorer with plural-aware token matching and < 5 ms performance.

## Tasks

### Done

- [x] Define `RecipeRow` and `MatchResult` types in `src/lib/types.ts`
- [x] Implement `normalize()` — lowercase, strip non-alpha, trim
- [x] Implement `expandToken()` — plural expansion (`-ies`, `-oes`, `-es`, `-s`)
- [x] Implement `buildTokenSet()` — pre-compute all forms for a phrase
- [x] Implement `ingredientMatches()` — bidirectional token set intersection
- [x] Implement `scoreRecipes()` — rank by matchCount DESC, missingItems.length ASC
- [x] Implement `loadRecipes()` — fetch + module-level cache
- [x] Implement `findTopMatches()` — public API accepting `PantryItem[]` or `string[]`
- [x] Write 8 unit tests covering: empty inputs, plural matching, ranking, topN limit, matchRatio bounds
- [x] Run `scripts/mergeData.ts` to produce `public/data/cleaned_recipes.json`
