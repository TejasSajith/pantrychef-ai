# Feature: Pantry Ingredient Matching

**Status:** implemented  
**Author:** @t_sajith  
**Created:** 2026-06-12  
**Last updated:** 2026-06-12  

---

## Summary

Users add ingredients to a digital pantry with quantities and units. A local, in-browser scoring engine matches those ingredients against ~13,000 recipes and returns the best candidates instantly — with no server round-trip.

## Problem Statement

Users don't know what they can cook with what they already own. Looking up recipes manually and cross-referencing a pantry is slow and error-prone. The matching must be instant (< 5 ms) and work offline to avoid server costs.

## Proposed Solution

A pure TypeScript function (`scoreRecipes`) pre-computes token sets for each pantry item, then scores every recipe by ingredient overlap using Set intersection. Results are ranked by match count (descending) then missing-item count (ascending), and the top N are returned to the UI.

Normalisation handles plurals (`eggs → egg`), stop words (`and`, `of`), and compound names (`boneless chicken breast` matches `chicken`).

## Acceptance Criteria

1. Given a pantry with at least one ingredient, when the matcher runs, then results are returned in under 5 ms for the full 13k-recipe dataset.
2. Given a pantry item `egg`, when matched against a recipe containing `eggs`, then the recipe counts as a match.
3. Given a pantry item `tomato`, when matched against a recipe containing `tomatoes`, then the recipe counts as a match.
4. Given a pantry item `chicken`, when matched against a recipe containing `boneless chicken breast`, then the recipe counts as a match.
5. Given an empty pantry, when the matcher runs, then an empty array is returned immediately.
6. Given recipes A (3 matches, 1 missing) and B (2 matches, 0 missing), when ranked, then A appears before B.
7. Given two recipes with equal match counts, when ranked, then the recipe with fewer missing items appears first.
8. Given `topN = 5`, when the matcher runs over 13k recipes, then exactly 5 results are returned (or fewer if fewer recipes match).

## Out of Scope

- Server-side matching or caching
- Fuzzy string matching beyond token normalisation
- Quantity-aware matching (matching `200g chicken` vs `500g chicken` as different)
- Real-time pantry sync across devices

## Open Questions

- None — implemented and verified.

## References

- Implementation: `src/utils/recipeMatcher.ts`
- Unit tests: `src/__tests__/recipeMatcher.test.ts`
- Algorithm spec: `spec.md §4`
