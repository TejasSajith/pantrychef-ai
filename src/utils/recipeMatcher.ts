/**
 * recipeMatcher — local in-browser recipe scoring engine
 *
 * Pipeline:
 *   1. fetch /data/cleaned_recipes.json once, cache in module scope
 *   2. pre-compute a token set for every pantry item (done once per call)
 *   3. for each recipe, check each ingredient against every pantry token set
 *   4. rank by (matchCount DESC, missingItems.length ASC) per spec.md §4
 *   5. return top N MatchResult objects
 *
 * Normalization layers applied to every token:
 *   • lowercase + strip non-alpha                       ("Garlic!" → "garlic")
 *   • stop-word removal                                 ("and", "of", …)
 *   • plural expansion  -ies → -y                      ("berries" → "berry")
 *                       -es  → strip -es + strip -e    ("tomatoes" → "tomato")
 *                       -s   → strip -s                ("eggs" → "egg")
 *
 * Matching is bidirectional at token level, so:
 *   pantry "chicken"  matches recipe "boneless chicken breast"  ✓
 *   pantry "egg"      matches recipe "eggs"                     ✓
 *   pantry "tomato"   matches recipe "tomatoes"                 ✓
 *   pantry "olive"    matches recipe "olives"                   ✓
 *   pantry "butter"   matches recipe "unsalted butter"          ✓
 */

import type { RecipeRow, MatchResult, PantryItem } from '@/lib/types';

/* ── Module-level fetch cache ──────────────────────────────── */
let _cache: RecipeRow[] | null = null;

async function loadRecipes(): Promise<RecipeRow[]> {
  if (_cache) return _cache;
  const res = await fetch('/data/cleaned_recipes.json');
  if (!res.ok) throw new Error(`recipeMatcher: failed to load dataset (${res.status})`);
  _cache = (await res.json()) as RecipeRow[];
  return _cache;
}

/* ── Token normalization ───────────────────────────────────── */

const STOP_WORDS = new Set([
  'and',
  'or',
  'the',
  'with',
  'for',
  'of',
  'in',
  'a',
  'an',
  'to',
  'at',
  'by',
  'on',
  'up',
  'as',
  'it',
  'its',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, '') // strip digits, punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns every surface form of a word that should match against it.
 * Adds the original plus de-pluralized variants so both directions work
 * without needing to expand the recipe side separately.
 */
function expandToken(word: string): string[] {
  const forms: string[] = [word];
  if (word.length <= 3) return forms;

  if (word.endsWith('ies') && word.length > 4) {
    forms.push(word.slice(0, -3) + 'y'); // berries → berry
  } else if (word.endsWith('oes') && word.length > 4) {
    forms.push(word.slice(0, -2)); // tomatoes → tomato
    forms.push(word.slice(0, -3)); // tomatoes → tomat (fallback)
  } else if (word.endsWith('es') && word.length > 4) {
    forms.push(word.slice(0, -2)); // olives → oliv ... also catches potatoes → potato
    forms.push(word.slice(0, -1)); // olives → olive ✓ (most useful)
  } else if (word.endsWith('s') && word.length > 3) {
    forms.push(word.slice(0, -1)); // eggs → egg, cloves → clove
  }

  return forms;
}

/**
 * Builds a flat Set of all normalized token forms for a phrase.
 * Pre-computing this once per pantry item (not per comparison) keeps
 * the inner loop to pure Set.has() calls — O(1) per lookup.
 */
function buildTokenSet(phrase: string): Set<string> {
  const tokens = normalize(phrase)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  const out = new Set<string>();
  for (const token of tokens) {
    for (const form of expandToken(token)) {
      out.add(form);
    }
  }
  return out;
}

/* ── Ingredient match predicate ───────────────────────────── */

/**
 * Returns true if any token from the pantry item's token set appears
 * in the recipe ingredient's token set.
 *
 * Both sets are pre-expanded with plural variants, so the check is
 * symmetric: "egg" matches "eggs" and "eggs" matches "egg".
 */
function ingredientMatches(pantryTokenSet: Set<string>, recipeIngredient: string): boolean {
  const recipeTokens = buildTokenSet(recipeIngredient);
  for (const token of pantryTokenSet) {
    if (recipeTokens.has(token)) return true;
  }
  return false;
}

/* ── Core scoring (pure — no I/O, exported for unit testing) ─ */

export function scoreRecipes(
  pantryNames: string[],
  recipes: RecipeRow[],
  topN: number
): MatchResult[] {
  if (pantryNames.length === 0 || recipes.length === 0) return [];

  // Pre-compute every pantry item's token set once
  const pantryTokenSets = pantryNames.map((name) => ({
    name,
    tokens: buildTokenSet(name),
  }));

  const scored: MatchResult[] = recipes.map((recipe) => {
    const matchedItems: string[] = [];
    const missingItems: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const hit = pantryTokenSets.some(({ tokens }) => ingredientMatches(tokens, ingredient));
      if (hit) {
        matchedItems.push(ingredient);
      } else {
        missingItems.push(ingredient);
      }
    }

    const matchCount = matchedItems.length;
    const matchRatio = recipe.ingredients.length > 0 ? matchCount / recipe.ingredients.length : 0;

    return {
      recipe,
      matchCount,
      matchRatio,
      matchedItems,
      missingItems,
    };
  });

  // Spec §4: primary sort matchCount DESC, secondary missingItems.length ASC
  scored.sort(
    (a, b) => b.matchCount - a.matchCount || a.missingItems.length - b.missingItems.length
  );

  return scored.slice(0, topN);
}

/* ── Public API ────────────────────────────────────────────── */

/**
 * Loads the recipe dataset (once, cached) then returns the top N matches
 * ranked by ingredient intersection with the user's pantry.
 *
 * @param pantryNames  Ingredient names from localStorage pantry
 * @param topN         Number of results to return (default: 5)
 */
export async function findTopMatches(
  pantry: string[] | PantryItem[],
  topN = 5
): Promise<MatchResult[]> {
  if (pantry.length === 0) return [];
  const names =
    typeof pantry[0] === 'string'
      ? (pantry as string[])
      : (pantry as PantryItem[]).map((i) => i.name);
  const recipes = await loadRecipes();
  return scoreRecipes(names, recipes, topN);
}

/* ── Debug helper (dev only) ───────────────────────────────── */

/**
 * Logs a human-readable match summary to the console.
 * Call from browser DevTools during development:
 *   import { debugMatches } from '@/utils/recipeMatcher';
 *   debugMatches(['eggs', 'butter', 'flour']);
 */
export async function debugMatches(pantryNames: string[] | PantryItem[]): Promise<void> {
  const results = await findTopMatches(pantryNames, 5);
  console.group(`recipeMatcher — top ${results.length} for [${pantryNames.join(', ')}]`);
  results.forEach((r, i) => {
    console.log(
      `#${i + 1}  ${r.recipe.recipe_name}  ` +
        `(${r.matchCount}/${r.recipe.ingredients.length} matched, ` +
        `${r.missingItems.length} missing, ` +
        `${Math.round(r.matchRatio * 100)}%)`
    );
    console.log(`     ✓ matched : ${r.matchedItems.join(', ')}`);
    if (r.missingItems.length) console.log(`     ✗ missing : ${r.missingItems.join(', ')}`);
  });
  console.groupEnd();
}
