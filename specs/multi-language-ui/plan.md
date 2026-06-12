# Plan: Multi-Language UI

**Status:** completed
**Author:** @t_sajith
**Created:** 2026-06-12

---

## Objective

Full English / Hindi / Malayalam UI with `localStorage`-persisted locale selection.

## Approach

### Translation dictionary shape

```ts
type Locale = 'en' | 'hi' | 'ml';
type TranslationKey = 'addIngredient' | 'findRecipes' | ...;
type Translations = Record<Locale, Record<TranslationKey, string>>;
```

### `t(key)` helper

Reads active locale from module state (set on language change). Falls back to English if key missing.

### Language selector

A `<select>` in the top bar calls `setLocale(locale)`, updates module state, persists to `localStorage`, and triggers a React re-render via state.

## Key Files

| File                      | Role                                         |
| ------------------------- | -------------------------------------------- |
| `src/lib/translations.ts` | Full translation dictionaries for en/hi/ml   |
| `src/app/page.tsx`        | Language selector, locale state, `t()` usage |
