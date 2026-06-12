# Spec: Multi-Language UI

**Status:** implemented
**Author:** @t_sajith
**Created:** 2026-06-12
**Last updated:** 2026-06-12

---

## Summary

The entire UI is available in English, Hindi, and Malayalam. The selected language is persisted in `localStorage` and applied on load with no page refresh required.

## Problem Statement

The target audience includes non-English-speaking users in India. A hard-coded English UI excludes them from using the app comfortably.

## Proposed Solution

A `translations.ts` file exports a keyed dictionary for each locale. A top-bar language selector writes the chosen locale to `localStorage`. All UI strings are looked up via a `t(key)` helper that reads the active locale.

## Acceptance Criteria

1. Given the app first loads, when no locale is stored, then English is used by default.
2. Given a user selects Hindi, when the language changes, then all visible UI strings switch to Hindi without a page reload.
3. Given a user selects Malayalam, when the language changes, then all visible UI strings switch to Malayalam without a page reload.
4. Given a locale is selected, when the page reloads, then the same locale is restored from `localStorage`.
5. Given a translation key is missing for a locale, when that string is requested, then the English fallback is returned (no blank labels).

## Out of Scope

- RTL support
- Translated recipe content (only UI chrome is translated)
- Browser `Accept-Language` auto-detection

## References

- Implementation: `src/lib/translations.ts`, `src/app/page.tsx`
