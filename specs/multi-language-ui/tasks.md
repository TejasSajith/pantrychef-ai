# Tasks: Multi-Language UI

**Owner:** @t_sajith
**Status:** completed

---

## Goal

English, Hindi, and Malayalam UI with persistent locale selection.

## Tasks

### Done

- [x] Define `Locale` union type (`'en' | 'hi' | 'ml'`)
- [x] Define `TranslationKey` union for all UI string identifiers
- [x] Write full English translation dictionary
- [x] Write full Hindi translation dictionary
- [x] Write full Malayalam translation dictionary
- [x] Implement `t(key)` helper with English fallback
- [x] Add language selector `<select>` to top bar
- [x] Persist selected locale to `localStorage` on change
- [x] Hydrate locale from `localStorage` on app load
- [x] Verify all UI strings use `t()` (no hardcoded English)
