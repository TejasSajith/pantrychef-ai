# PantryChef AI — Spec-Kit Constitution

## Purpose
This constitution defines the norms, constraints, and principles that govern all feature specifications in this repository. Every spec under `specs/` must conform to these rules.

## Core Principles

1. **Spec before code.** No feature work begins without a corresponding spec in `specs/`. The spec is the source of truth; the code is the implementation.
2. **User-centred language.** Specs describe observable user behaviour and outcomes, not internal implementation details.
3. **One spec per feature.** Each spec covers exactly one user-facing feature or capability. Cross-cutting concerns (auth, error handling) get their own spec.
4. **Acceptance criteria are binary.** Every acceptance criterion must be answerable with pass/fail — no ambiguous language like "fast" or "good UX".
5. **Immutable history.** Once a spec is merged, its `## Accepted` section is never edited. Amendments go in a new spec or an `## Amendment` section at the bottom.

## Spec Lifecycle

```
draft → review → accepted → implemented → deprecated
```

- **draft** — work in progress, not ready for review
- **review** — complete and open for feedback
- **accepted** — approved, ready to implement
- **implemented** — code shipped and verified
- **deprecated** — superseded or removed

## Required Sections (see templates/)

Every feature spec must contain, in order:
1. Title and status badge
2. Summary (≤ 3 sentences)
3. Problem statement
4. Proposed solution
5. Acceptance criteria (numbered, binary)
6. Out of scope
7. Open questions

## Naming Convention

`specs/<kebab-case-feature-name>.md`

Example: `specs/pantry-ingredient-matching.md`

## Ownership

| Role | Responsibility |
|---|---|
| Author | Writes and maintains the spec |
| Reviewer | Approves acceptance criteria |
| Implementer | Links PRs/MRs back to the spec |

## Enforcement

The CI pipeline checks that every branch touching `src/` has a corresponding entry in `specs/`. PRs without a spec link in the MR description are blocked from merge.
