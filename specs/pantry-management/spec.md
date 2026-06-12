# Spec: Pantry Management

**Status:** implemented
**Author:** @t_sajith
**Created:** 2026-06-12
**Last updated:** 2026-06-12

---

## Summary

Users maintain a digital pantry that tracks ingredients with exact quantities and units. All state persists in `localStorage` — no account or server required.

## Problem Statement

Users need to tell the app what they own before recipe matching can work. The pantry must survive page refreshes, support real-world units, and be quick to edit.

## Proposed Solution

A `PantryItem[]` array stored in `localStorage` under the key `pantry_items`. Each item carries a name, quantity, unit, and stable `id`. Helper functions in `src/lib/pantry.ts` handle all reads/writes. The UI renders the list with inline quantity editors and per-item remove buttons.

## Acceptance Criteria

1. Given the app loads, when `localStorage` contains pantry data, then the pantry is hydrated without a network request.
2. Given a user adds an ingredient, when the name is non-empty, then a `PantryItem` with the correct name, quantity, and unit is appended and persisted.
3. Given a user edits a quantity, when they change the value, then `localStorage` is updated immediately.
4. Given a user clicks remove, when confirmed, then the item is deleted from both state and `localStorage`.
5. Given units are `g`, `kg`, `ml`, `L`, `pcs`, `cups`, when a unit is selected, then the quantity step increments sensibly for that unit.
6. Given "I Cooked This!" is tapped, when a recipe is selected, then each matched ingredient's quantity is decremented by the AI-specified amount.

## Out of Scope

- Cloud sync or multi-device support
- Barcode scanning
- Expiry date tracking

## References

- Implementation: `src/lib/pantry.ts`, `src/app/page.tsx`
- Types: `src/lib/types.ts` (`PantryItem`, `Unit`)
