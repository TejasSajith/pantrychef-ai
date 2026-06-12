# Tasks: Pantry Management

**Owner:** @t_sajith
**Status:** completed

---

## Goal

Fully functional unit-aware digital pantry backed by `localStorage`.

## Tasks

### Done

- [x] Define `PantryItem` and `Unit` types in `src/lib/types.ts`
- [x] Implement `getPantry`, `setPantry`, `addItem`, `removeItem`, `updateQuantity` in `src/lib/pantry.ts`
- [x] Implement `subtractIngredient` for post-cook deduction
- [x] Wire pantry state into `src/app/page.tsx` with `useState` + `useEffect` for hydration
- [x] Add ingredient add form (name input + quantity + unit selector)
- [x] Add per-item quantity editor with unit-aware step values
- [x] Add per-item remove button
- [x] Implement "I Cooked This!" deduction flow
- [x] Handle edge case: quantity goes below zero (clamp to 0)
