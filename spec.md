# PantryChef AI — Technical Specification

**Hackathon Duration:** 2 days  
**Stack:** Next.js 14+ (App Router) · TypeScript · Vercel  
**Core Concept:** User inputs pantry contents → local algorithm scores Kaggle recipe dataset → best matches sent to Claude for enriched recipe cards with steps and substitutions.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [File & Directory Structure](#2-file--directory-structure)
3. [Data Schemas](#3-data-schemas)
4. [Local Matcher Algorithm](#4-local-matcher-algorithm)
5. [AI API Routing Schema](#5-ai-api-routing-schema)
6. [Frontend Component Map](#6-frontend-component-map)
7. [Environment & Deployment](#7-environment--deployment)
8. [Build Order / Day Plan](#8-build-order--day-plan)

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Browser
        A[PantryInput UI] -->|writes| B[(localStorage: PantryItem[])]
        B -->|reads| C[LocalMatcher]
        C -->|top 3 matches + missing[]| D[RecipeCard UI]
        D -->|POST /api/recipe| E
    end

    subgraph Vercel Serverless
        E[/api/recipe/route.ts/] -->|structured prompt| F[Claude API]
        F -->|JSON recipe payload| E
        E -->|streamed JSON| D
    end

    subgraph Static Assets
        G[recipes.json pre-built from CSV] -->|imported at build time| C
    end
```

**Key constraints:**

- The CSV → JSON conversion happens **at build time** (script run once, output committed).
- The LocalMatcher runs **entirely in the browser** — zero server cost, near-instant.
- The Vercel Function only handles the Claude call, keeping it well under the 10 s free-tier limit.

---

## 2. File & Directory Structure

```
pantrychefai/
├── app/
│   ├── layout.tsx                  # Root layout, metadata, global styles
│   ├── page.tsx                    # Home: PantryInput + RecipeResults
│   └── api/
│       └── recipe/
│           └── route.ts            # POST handler → Claude API
├── components/
│   ├── PantryInput.tsx             # Ingredient tag input + localStorage sync
│   ├── RecipeCard.tsx              # Renders a single enriched recipe
│   └── MatchBadge.tsx              # Shows match % and missing items
├── lib/
│   ├── matcher.ts                  # Local scoring algorithm (pure function)
│   ├── pantry.ts                   # localStorage read/write helpers
│   ├── prompt.ts                   # Prompt builder for Claude
│   └── types.ts                    # All shared TypeScript interfaces
├── data/
│   └── recipes.json                # Pre-built from Kaggle CSV (scripts/build-data.ts)
├── scripts/
│   └── build-data.ts               # One-time CSV → JSON conversion
├── public/
├── .env.local                      # ANTHROPIC_API_KEY
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Data Schemas

### 3.1 PantryItem — stored in `localStorage`

```typescript
// lib/types.ts

export interface PantryItem {
  id: string; // nanoid() — stable key for React lists
  name: string; // normalized to lowercase, e.g. "chicken breast"
  addedAt: number; // Date.now() timestamp
}

// The localStorage key is "pantry_items"
// Value is JSON.stringify(PantryItem[])
```

**localStorage helper contract (`lib/pantry.ts`):**

```typescript
export function getPantry(): PantryItem[];
export function setPantry(items: PantryItem[]): void;
export function addItem(name: string): PantryItem[]; // deduplicates by normalized name
export function removeItem(id: string): PantryItem[];
export function clearPantry(): void;
```

---

### 3.2 Raw Kaggle Recipe CSV Columns

Expected source: `Food Ingredients and Recipes Dataset` (Kaggle, ~13k rows).

| Column name           | Type     | Notes                                           |
| --------------------- | -------- | ----------------------------------------------- |
| `Title`               | `string` | Recipe display name                             |
| `Ingredients`         | `string` | Raw text, comma-separated or `['item', 'item']` |
| `Instructions`        | `string` | Full multi-step cooking text                    |
| `Image_Name`          | `string` | Filename stub (optional, used for placeholder)  |
| `Cleaned_Ingredients` | `string` | Pre-parsed ingredient list (preferred over raw) |

**Normalized internal shape after CSV → JSON conversion:**

```typescript
// lib/types.ts

export interface RecipeRow {
  id: string; // slugified Title used as stable key
  title: string;
  ingredients: string[]; // lowercased, trimmed individual tokens
  instructions: string; // kept verbatim for the AI prompt
  imageStub?: string;
}
```

**CSV → JSON script notes (`scripts/build-data.ts`):**

- Use `papaparse` for CSV parsing.
- Parse `Cleaned_Ingredients` first; fall back to `Ingredients`.
- Strip quantity/unit tokens (regex: remove leading numbers, fractions, and unit words like `cup`, `tbsp`, `oz`).
- Output: `data/recipes.json` as `RecipeRow[]`. Commit this file — do not regenerate at runtime.

---

## 4. Local Matcher Algorithm

**Location:** `lib/matcher.ts`  
**Input:** `pantry: string[]`, `recipes: RecipeRow[]`, `topN = 3`  
**Output:** `MatchResult[]`

```typescript
// lib/types.ts

export interface MatchResult {
  recipe: RecipeRow;
  matchCount: number; // number of pantry items found in recipe.ingredients
  matchRatio: number; // matchCount / recipe.ingredients.length  (0–1)
  matchedItems: string[]; // which pantry items matched
  missingItems: string[]; // recipe.ingredients not in pantry
}
```

### Algorithm (pseudocode)

```
function findMatches(pantry, recipes, topN):

  pantrySet = new Set(pantry.map(normalize))

  scored = recipes.map(recipe =>
    recipeSet   = new Set(recipe.ingredients.map(normalize))
    matched     = [...recipeSet].filter(i => pantrySet.has(i))
    missing     = [...recipeSet].filter(i => !pantrySet.has(i))

    return {
      recipe,
      matchCount:   matched.length,
      matchRatio:   matched.length / recipeSet.size,   // 0 if empty
      matchedItems: matched,
      missingItems: missing,
    }
  )

  // Primary sort: matchCount DESC (maximize use of pantry)
  // Secondary sort: missingItems.length ASC (fewest extra items needed)
  scored.sort((a, b) =>
    b.matchCount - a.matchCount || a.missingItems.length - b.missingItems.length
  )

  return scored.slice(0, topN)
```

**Normalization helper:**

```typescript
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Performance note:** With ~13k recipes and a pantry of ~20 items, this runs in <5 ms in the browser. No indexing needed at hackathon scale.

---

## 5. AI API Routing Schema

### 5.1 Route: `POST /api/recipe`

**File:** `app/api/recipe/route.ts`

#### Request body (sent from browser)

```typescript
interface RecipeRequest {
  match: MatchResult; // single top match to enrich (one call per card)
}
```

#### Response body (streamed JSON, `text/event-stream`)

```typescript
interface RecipeResponse {
  title: string;
  description: string; // 1–2 sentence hook
  servings: number;
  prepTime: string; // e.g. "15 min"
  cookTime: string; // e.g. "30 min"
  steps: string[]; // 4–7 numbered instructions
  substitutions: {
    // only for missingItems
    ingredient: string;
    substitute: string;
  }[];
  tips: string; // one practical tip
}
```

---

### 5.2 Prompt Engineering (optimized for <8 s response)

**Location:** `lib/prompt.ts`

```typescript
export function buildRecipePrompt(match: MatchResult): string {
  const missing = match.missingItems.slice(0, 5); // cap to keep tokens low

  return `You are a concise recipe assistant. Respond ONLY with a single valid JSON object — no markdown, no explanation.

Recipe: "${match.recipe.title}"
Available ingredients: ${match.matchedItems.join(', ')}
Missing ingredients: ${missing.join(', ') || 'none'}

Return this exact JSON shape:
{
  "title": string,
  "description": string (1-2 sentences),
  "servings": number,
  "prepTime": string,
  "cookTime": string,
  "steps": string[] (4-7 steps, concise),
  "substitutions": [{ "ingredient": string, "substitute": string }] (only for missing items),
  "tips": string (one sentence)
}`;
}
```

**Timeout mitigation strategies:**

| Strategy           | Implementation                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| Hard token cap     | `max_tokens: 600` — prevents runaway generation                          |
| Minimal prompt     | No examples (few-shot), no chain-of-thought instruction                  |
| Single JSON object | No markdown wrapper forces direct output                                 |
| Cap missing items  | Only top 5 missing items sent to prompt                                  |
| Model selection    | Use `claude-haiku-4-5` — fastest Claude model, ideal for structured JSON |

---

### 5.3 Route Handler Implementation

```typescript
// app/api/recipe/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { buildRecipePrompt } from '@/lib/prompt';
import { RecipeRequest } from '@/lib/types';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function POST(req: Request) {
  const body: RecipeRequest = await req.json();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: buildRecipePrompt(body.match) }],
  });

  const raw = (message.content[0] as { type: 'text'; text: string }).text;

  // Guard: ensure valid JSON before returning
  const parsed = JSON.parse(raw);

  return Response.json(parsed);
}
```

**Error handling:** Wrap `JSON.parse` in try/catch; return `{ error: 'parse_failed', raw }` with status 422 so the UI can fall back to displaying the raw match without AI enrichment.

---

## 6. Frontend Component Map

### `app/page.tsx` — orchestrator

```
<PantryInput />        → manages PantryItem[] via lib/pantry.ts
     ↓ onChange
<RecipeResults />      → runs findMatches(), maps to <RecipeCard />
     ↓ per match
<RecipeCard />         → calls POST /api/recipe, renders RecipeResponse
     └── <MatchBadge /> → shows match%, missing items list
```

### State flow

```
localStorage
    │
    ▼
[pantryItems: PantryItem[]]   ← React state, hydrated on mount
    │
    ▼  (useMemo, re-runs on change)
[matches: MatchResult[]]      ← derived, never stored
    │
    ▼  (per-card useEffect, fires once on mount)
[enriched: RecipeResponse]    ← per-card state, from /api/recipe
```

---

## 7. Environment & Deployment

### `.env.local`

```
ANTHROPIC_API_KEY=sk-ant-...
```

### `next.config.ts`

```typescript
const config = {
  // recipes.json is large — exclude from edge runtime checks
  serverExternalPackages: [],
};
export default config;
```

### Vercel deployment checklist

- [ ] Set `ANTHROPIC_API_KEY` in Vercel project environment variables.
- [ ] `data/recipes.json` committed to repo (build script run locally once).
- [ ] Verify function region set to `iad1` (US East) for lowest Claude API latency.
- [ ] Confirm `app/api/recipe/route.ts` does **not** use `export const runtime = 'edge'` — Node.js runtime needed for Anthropic SDK.
- [ ] Free tier function timeout is 10 s; target <8 s end-to-end with `max_tokens: 600` + Haiku.

### Required packages

```bash
npm install @anthropic-ai/sdk papaparse nanoid
npm install -D @types/papaparse tsx
```

---

## 8. Build Order / Day Plan

### Day 1 — Data + Core Logic

| #   | Task                                                      | File(s)                                       |
| --- | --------------------------------------------------------- | --------------------------------------------- |
| 1   | Scaffold Next.js 14 project with TypeScript               | `npx create-next-app@latest`                  |
| 2   | Define all TypeScript interfaces                          | `lib/types.ts`                                |
| 3   | Download Kaggle CSV, run conversion script                | `scripts/build-data.ts` → `data/recipes.json` |
| 4   | Implement `lib/matcher.ts` + unit test in browser console | `lib/matcher.ts`                              |
| 5   | Build `lib/pantry.ts` localStorage helpers                | `lib/pantry.ts`                               |
| 6   | Build `PantryInput` component (add/remove tags)           | `components/PantryInput.tsx`                  |
| 7   | Wire `page.tsx` — input → matches rendered as raw cards   | `app/page.tsx`                                |

### Day 2 — AI Integration + Polish

| #   | Task                                                 | File(s)                     |
| --- | ---------------------------------------------------- | --------------------------- |
| 8   | Build `lib/prompt.ts` and test prompt in Claude.ai   | `lib/prompt.ts`             |
| 9   | Implement `/api/recipe` route with error handling    | `app/api/recipe/route.ts`   |
| 10  | Enrich `RecipeCard` with AI response (loading state) | `components/RecipeCard.tsx` |
| 11  | Add `MatchBadge` with match % and missing items      | `components/MatchBadge.tsx` |
| 12  | Basic Tailwind styling — mobile-first, clean cards   | all components              |
| 13  | Deploy to Vercel, set env var, smoke test            | Vercel dashboard            |
| 14  | Buffer: fix edge cases, improve prompt if needed     | —                           |

---

_This spec is the single source of truth during the build. Update it if architecture decisions change._
