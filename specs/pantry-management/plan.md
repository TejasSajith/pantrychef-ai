# Plan: Pantry Management

**Status:** completed
**Author:** @t_sajith
**Created:** 2026-06-12

---

## Objective

Provide a reliable, unit-aware pantry that persists across sessions using `localStorage`.

## Approach

All pantry logic lives in `src/lib/pantry.ts` as pure functions that accept and return `PantryItem[]`. The React page component holds pantry state and calls these helpers; it never reads `localStorage` directly.

## Key Files

| File                | Role                                    |
| ------------------- | --------------------------------------- |
| `src/lib/pantry.ts` | Read/write helpers, quantity arithmetic |
| `src/lib/types.ts`  | `PantryItem`, `Unit` interfaces         |
| `src/app/page.tsx`  | UI — add/edit/remove, "I Cooked This!"  |

## Data Shape

```ts
interface PantryItem {
  id: string; // nanoid — stable React key
  name: string; // lowercase, trimmed
  quantity: number;
  unit: Unit; // 'g' | 'kg' | 'ml' | 'L' | 'pcs' | 'cups'
  addedAt: number; // Date.now()
}
```

## Quantity Deduction (post-cook)

The AI returns `exactPantryQuantitiesToSubtract: Record<string, number>`. The UI matches keys to pantry item names (case-insensitive) and calls `subtractIngredient()` for each.

## Risks

- Unit mismatch between AI output and pantry units — mitigated by prompt instructing AI to use the user's units.
- `localStorage` quota exceeded with very large pantries — not a real risk at typical pantry sizes (<200 items).
