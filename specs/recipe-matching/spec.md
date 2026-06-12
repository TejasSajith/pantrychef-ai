# Spec: Recipe Matching

**Status:** implemented
**Author:** @t_sajith
**Created:** 2026-06-12
**Last updated:** 2026-06-12

---

## Summary

A pure, in-browser scoring engine matches the user's pantry against ~13,000 recipes and returns the top N candidates ranked by ingredient overlap — with no server call and in under 5 ms.

## Problem Statement

Sending every pantry change to a server for matching would be slow, costly, and require auth. The match must be instant and available offline.

## Proposed Solution

`scoreRecipes()` in `src/utils/recipeMatcher.ts` builds a token set per pantry item (once), then for each recipe checks ingredient overlap via `Set.has()`. Tokens are normalised (lowercase, stop words removed) and plural-expanded so `egg` matches `eggs`, `tomato` matches `tomatoes`, `chicken` matches `boneless chicken breast`.

## Acceptance Criteria

1. Given a non-empty pantry, when `scoreRecipes` runs over 13k recipes, then it returns in under 5 ms.
2. Given pantry item `egg`, when matched, then recipes containing `eggs` count as a match.
3. Given pantry item `tomato`, when matched, then recipes containing `tomatoes` count as a match.
4. Given pantry item `chicken`, when matched, then recipes containing `boneless chicken breast` count as a match.
5. Given an empty pantry, when matched, then an empty array is returned immediately.
6. Given two recipes with equal match counts, when ranked, then the one with fewer missing items appears first.
7. Given `topN = 5`, when matched, then at most 5 results are returned.

## Out of Scope

- Fuzzy / phonetic matching
- Quantity-aware matching
- Server-side or cached matching

## References

- Implementation: `src/utils/recipeMatcher.ts`
- Tests: `src/__tests__/recipeMatcher.test.ts`
- Dataset: `public/data/cleaned_recipes.json`
