import { NextRequest, NextResponse } from 'next/server';
import { readFileSync }               from 'fs';
import { join }                       from 'path';
import Groq                           from 'groq-sdk';
import { scoreRecipes }               from '@/utils/recipeMatcher';
import type {
  RecipeRow, MatchResult,
  GeneratedRecipe, GeneratedRecipeResponse,
} from '@/lib/types';

/* ─────────────────────────────────────────────────────────────
   Groq client — instantiated once at module load.
───────────────────────────────────────────────────────────── */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

/* ─────────────────────────────────────────────────────────────
   Boot-time key validation
───────────────────────────────────────────────────────────── */
(function validateEnv() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error(
      '\n╔══════════════════════════════════════════════════════╗\n' +
      '║  [generate-recipe]  GROQ_API_KEY is NOT set          ║\n' +
      '║  Add it to .env.local:  GROQ_API_KEY=gsk_...         ║\n' +
      '║  Get a free key at: https://console.groq.com/keys    ║\n' +
      '╚══════════════════════════════════════════════════════╝\n',
    );
    return;
  }
  if (!key.startsWith('gsk_')) {
    console.warn(`\n⚠  [generate-recipe]  GROQ_API_KEY looks wrong ("${key.slice(0, 10)}...")\n`);
  } else {
    console.log(`\n✓  [generate-recipe]  GROQ_API_KEY loaded — ${key.slice(0, 12)}... (${key.length} chars)\n`);
  }
}());

/* ─────────────────────────────────────────────────────────────
   Dataset — read + sanitize once per cold-start.
───────────────────────────────────────────────────────────── */
let _recipes: RecipeRow[] | null = null;

function getRecipes(): RecipeRow[] {
  if (_recipes) return _recipes;
  const filePath = join(process.cwd(), 'public/data/cleaned_recipes.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as RecipeRow[];
  _recipes = raw.map(r => ({
    ...r,
    ingredients:  (r.ingredients  ?? []).filter((s): s is string => typeof s === 'string' && s.trim().length > 0),
    instructions: (r.instructions ?? []).filter((s): s is string => typeof s === 'string' && s.trim().length > 0),
  }));
  return _recipes;
}

/* ─────────────────────────────────────────────────────────────
   Request / response shapes
───────────────────────────────────────────────────────────── */
interface PantryItemPayload {
  name:     string;
  quantity: number;
  unit:     string;
}

interface RequestBody {
  pantryItems:         PantryItemPayload[];
  maxTime:             number;
  craving:             string;
  dietaryRestrictions: string[];
  servingsCount:       number;
  preferredCuisine:    string;
  language?:           string;
}

/* ─────────────────────────────────────────────────────────────
   System instruction
───────────────────────────────────────────────────────────── */
const SYSTEM_INSTRUCTION =
  'You are a highly resource-mindful chef. ' +
  'You specialise in building delicious meals from whatever ingredients a user already owns, ' +
  'never suggesting a trip to the shops when a smart substitute exists. ' +

  // ── STRUCTURAL SANITY LAW ─────────────────────────────────────────────
  'CRITICAL DATA LAW — CULINARY PHYSICS: You must respect the laws of culinary physics. ' +
  'Every dish has a core structural base ingredient that defines what the dish fundamentally IS. ' +
  'Examples of structural bases: eggs for an omelette/frittata/scramble/quiche, ' +
  'rice for fried rice/risotto/congee, pasta/noodles for pasta dishes, ' +
  'flour or bread dough for breads/pancakes/waffles/pizza, ' +
  'chicken for chicken dishes, beef for burgers/meatballs/steak, ' +
  'fish/seafood for fish dishes. ' +
  'If the user does NOT have the structural base in their pantry, you CANNOT suggest that dish. ' +
  'A cheesy omelette without eggs is physically impossible and must never be suggested. ' +
  'Fried rice without rice is impossible. Pasta carbonara without pasta is impossible. ' +
  'Check the PANTRY JSON ARRAY carefully before selecting any recipe. ' +
  'If a dataset-matched recipe is fundamentally unmakeable because its structural base is absent from the pantry, ' +
  'SKIP that recipe entirely and choose from the other high-scoring candidates provided. ' +
  'You are given 6 candidate recipes — always use the candidates whose structural bases are present. ' +

  // ── SUBSTITUTION RESTRICTION ──────────────────────────────────────────
  'SUBSTITUTION LAW: You may ONLY suggest smart substitutions for accent or secondary ingredients. ' +
  'Acceptable substitutions: sour cream ↔ Greek yogurt, cheddar ↔ mozzarella, ' +
  'fresh herb ↔ dried herb (⅓ quantity), white wine ↔ chicken broth + vinegar, ' +
  'cream cheese ↔ thick yogurt, breadcrumbs ↔ crushed crackers. ' +
  'NEVER substitute a fundamental structural base. ' +
  'If the structural base is absent, skip the dish — do not attempt to replace it. ' +

  // ── QUANTITY AWARENESS ────────────────────────────────────────────────
  'The user provides exact quantities and units for each ingredient. ' +
  'Use these amounts to judge whether there is enough for the required number of servings. ' +
  'DO NOT consume the entire available weight of the pantry if it exceeds normal consumption boundaries. ' +
  'Limit ingredient utilisation per individual portion to a standard human stomach capacity: ' +
  '150 g–200 g meat or protein per person, 50 g–100 g grains per person, ' +
  '80 g–150 g vegetables per person, 0.1 L–0.2 L liquids per person. ' +
  'Multiply these per-person caps by the servingsCount parameter to get the total recipe quantity. ' +
  'Record the exact amounts used in exactPantryQuantitiesToSubtract (in the same units as the pantry). ' +

  // ── DIETARY MODIFIERS ─────────────────────────────────────────────────
  'When "high-protein" is required: make a protein source (meat, poultry, fish, eggs, legumes, tofu, or dairy) ' +
  'the centrepiece; include an estimated protein content per serving in whyItMatchesCraving. ' +
  'When "low-carb" is required: keep net carbohydrates below 20 g per serving; ' +
  'replace starchy ingredients with cauliflower, courgette, or extra vegetables. ' +

  // ── CUISINE ADAPTATION ───────────────────────────────────────────────
  'CRITICAL INSTRUCTION — CUISINE ADAPTATION: Analyze the preferredCuisine field in the user prompt. ' +
  'When it is anything other than "any", you must creatively adapt ALL 3 generated recipes to reflect ' +
  'that specific regional flavor profile by utilizing the spices, aromatics, and styling typical of that cuisine. ' +
  'Specific guidance per cuisine: ' +
  'Indian → layer warm spices such as cumin, turmeric, coriander, garam masala, mustard seeds, or curry leaves; ' +
  'Italian → lean into garlic, extra-virgin olive oil, fresh or dried herbs (basil, oregano, rosemary), ' +
  'and classic Italian cooking methods such as sautéing in olive oil or finishing with parmesan; ' +
  'Mexican → introduce chilli, lime, cumin, smoked paprika, coriander leaf, and bold umami layers; ' +
  'East Asian → use soy sauce, sesame oil, ginger, garlic, rice vinegar, or five-spice profiles; ' +
  'Mediterranean → olive oil, lemon, capers, sun-dried tomatoes, fresh herbs, and light grain or legume bases. ' +
  'REGIONAL INDIAN CUISINE GUIDANCE: When preferredCuisine is "north-indian", emphasise garam masala, cream, ' +
  'tomatoes, onions, ghee, and rich Mughal-influenced gravies. ' +
  'When preferredCuisine is "south-indian", emphasise mustard seeds, curry leaves, coconut oil, ' +
  'tamarind, urad dal, and rice-based preparations. ' +
  'When preferredCuisine is "mughlai", emphasise slow-cooked gravies, whole spices (cardamom, cloves, bay leaf), ' +
  'saffron, cream, and nut-based sauces. ' +
  'When preferredCuisine is "kerala", emphasise coconut oil, coconut milk, curry leaves, mustard seeds, ' +
  'black pepper, and coastal spice profiles typical of Kerala cuisine. ' +
  'You must still strictly adhere to the available pantry inventory and all portion limitations. ' +
  'Adapt the flavour profile only — do not invent ingredients that are not in the pantry. ' +

  // ── LOCALIZATION LAW ──────────────────────────────────────────────────
  'CRITICAL LOCALIZATION LAW: Check the "language" parameter in the user prompt. ' +
  'If language is "hi" (Hindi), you MUST translate your complete recipe output — ' +
  'the recipeName, whyItMatchesCraving, all substitutedIngredients keys and values, ' +
  'and all instructions strings — entirely into Hindi using Devanagari script. ' +
  'If language is "ml" (Malayalam), you MUST translate those same fields entirely into ' +
  'Malayalam using Malayalam script. ' +
  'If language is "en" or absent, respond in English as normal. ' +
  'The JSON structure and all key names (recipeName, cookingTime, etc.) must remain in English ' +
  'regardless of language — only the string VALUES of the listed fields are translated. ' +
  'cookingTime and exactPantryQuantitiesToSubtract values remain in English/numerals always. ' +

  // ── OUTPUT FORMAT ─────────────────────────────────────────────────────
  'You respond with ONLY a raw JSON object — no markdown fences, no prose, ' +
  'no key names other than those specified. ' +
  'The root object must have a single key "recipes" containing an array of exactly 3 items.';

/* ─────────────────────────────────────────────────────────────
   Prompt builder
───────────────────────────────────────────────────────────── */
function buildPrompt(
  pantryItems:      PantryItemPayload[],
  maxTime:          number,
  craving:          string,
  dietary:          string[],
  matches:          MatchResult[],
  servingsCount:    number,
  preferredCuisine: string,
  language:         string,
): string {
  const dietaryLine = dietary.length ? dietary.join(', ') : 'none';
  const cravingLine = craving || 'a satisfying, well-rounded meal';

  const DIETARY_GUIDANCE: Record<string, string> = {
    'high-protein': '💪 HIGH-PROTEIN — protein source must be the centrepiece. Note approx. protein/serving in whyItMatchesCraving.',
    'low-carb':     '🥩 LOW-CARB — keep net carbs < 20 g/serving. Replace pasta/rice/bread with vegetable alternatives.',
    'vegan':        '🌱 VEGAN — no meat, fish, dairy, or eggs.',
    'vegetarian':   '🥗 VEGETARIAN — no meat or fish.',
    'gluten-free':  '🌾 GLUTEN-FREE — no wheat, barley, or rye.',
  };
  const specialGuidance = dietary.map(d => DIETARY_GUIDANCE[d]).filter(Boolean).join('\n');

  const pantryLines = pantryItems
    .map(({ name, quantity, unit }) => {
      const qty = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2));
      return `- ${name}: ${qty} ${unit}`;
    })
    .join('\n');

  // Known structural base ingredient tokens — used to annotate candidates with warnings.
  const STRUCTURAL_BASES = [
    'egg', 'eggs', 'rice', 'pasta', 'noodle', 'noodles', 'flour', 'bread',
    'chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp',
    'tofu', 'lentil', 'lentils', 'chickpea', 'chickpeas',
  ];

  // Build a lowercase set of pantry ingredient names for fast structural-base lookup
  const pantryNameSet = new Set(pantryItems.map(p => p.name.toLowerCase()));

  function detectMissingBases(missingItems: string[]): string[] {
    const absent: string[] = [];
    for (const ingredient of missingItems) {
      const lower = ingredient.toLowerCase();
      for (const base of STRUCTURAL_BASES) {
        if (lower.includes(base) && !pantryNameSet.has(base)) {
          absent.push(ingredient);
          break;
        }
      }
    }
    return absent;
  }

  const matchBlocks = matches.map((m, i) => {
    const have    = m.matchedItems.length ? m.matchedItems.join(', ') : 'none';
    // Pass ALL missing items — no truncation so AI can see every absent ingredient
    const missing = m.missingItems.length ? m.missingItems.join(', ') : 'none';
    const absentBases = detectMissingBases(m.missingItems);
    const warning = absentBases.length
      ? `  ⚠ STRUCTURAL BASE MISSING (SKIP THIS DISH): ${absentBases.join(', ')}\n`
      : '';
    return (
      `#${i + 1} — ${m.recipe.recipe_name} (${m.recipe.cooking_time} min)\n` +
      warning +
      `  Have    : ${have}\n` +
      `  Missing : ${missing}`
    );
  }).join('\n\n');

  // Per-person portion caps scaled to the number of diners
  const proteinCap = servingsCount * 200;
  const grainCap   = servingsCount * 100;

  // Exact pantry inventory as a JSON array — prevents any truncation in the prompt
  const pantryJson = JSON.stringify(
    pantryItems.map(({ name, quantity, unit }) => ({
      name,
      quantity: Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2)),
      unit,
    }))
  );

  return `## User's Pantry — EXACT INVENTORY (authoritative; check this before every recipe decision)
${pantryLines}

PANTRY JSON (machine-readable, same data as above):
${pantryJson}

## Serving Requirements
- Number of people    : ${servingsCount}
- Max protein/meat    : ${proteinCap} g total (${servingsCount} × 200 g)
- Max grains          : ${grainCap} g total (${servingsCount} × 100 g)
- Maximum cook time   : ${maxTime} minutes

## Dietary Restrictions
${dietaryLine}
${specialGuidance ? `\n### Mandatory dietary rules\n${specialGuidance}` : ''}

## Craving
"${cravingLine}"

## Preferred Cuisine
${preferredCuisine === 'any'
  ? 'Any — no specific regional style required.'
  : `${preferredCuisine.toUpperCase()} — adapt ALL 3 recipes to reflect this cuisine's flavor profile (spices, aromatics, cooking style). Pantry inventory boundaries still apply.`}

## Language
${language === 'hi'
  ? 'hi — Hindi. MANDATORY: Translate recipeName, whyItMatchesCraving, substitutedIngredients keys/values, and all instructions into Hindi (Devanagari script). JSON keys and cookingTime stay in English.'
  : language === 'ml'
  ? 'ml — Malayalam. MANDATORY: Translate recipeName, whyItMatchesCraving, substitutedIngredients keys/values, and all instructions into Malayalam (Malayalam script). JSON keys and cookingTime stay in English.'
  : 'en — English. Respond in English as normal.'}

## 6 Dataset Candidates (ranked by pantry overlap — choose 3 whose structural bases are present)
Any candidate marked "⚠ STRUCTURAL BASE MISSING" must be SKIPPED — do not suggest it.
${matchBlocks}

## Your Task
From the 6 candidates above, select the 3 best dishes whose structural bases are all present in the pantry.
Design exactly 3 DISTINCTIVE recipes — different dishes, not variations of the same idea.
Each recipe must:
1. Complete in ≤ ${maxTime} minutes
2. Serve ${servingsCount} people using the portion caps above
3. Use as many pantry ingredients as possible
4. Satisfy the craving: "${cravingLine}"
5. Respect dietary restrictions: ${dietaryLine}
6. For secondary/accent ingredients only: provide a realistic pantry-staple substitute
7. NEVER substitute a structural base — if the base is missing, skip the dish
8. Fill exactPantryQuantitiesToSubtract with exact amounts consumed (ingredient name must exactly match pantry JSON keys)

## Required Output — return ONLY this JSON, nothing else
{"recipes":[{"recipeName":"","cookingTime":"","whyItMatchesCraving":"","substitutedIngredients":{},"instructions":[],"exactPantryQuantitiesToSubtract":{}},{"recipeName":"","cookingTime":"","whyItMatchesCraving":"","substitutedIngredients":{},"instructions":[],"exactPantryQuantitiesToSubtract":{}},{"recipeName":"","cookingTime":"","whyItMatchesCraving":"","substitutedIngredients":{},"instructions":[],"exactPantryQuantitiesToSubtract":{}}]}

Field rules:
- recipeName                      : creative, distinctive (≤ 60 chars); all 3 must be different dishes
- cookingTime                     : "X minutes" or "X–Y minutes"
- whyItMatchesCraving             : 1–2 sentences; include protein estimate if high-protein mode
- substitutedIngredients          : {} if none needed; only accent/secondary substitutions allowed
- instructions                    : 5–7 strings, each a complete sentence. No bare numbers as array elements
- exactPantryQuantitiesToSubtract : keys must exactly match the "name" fields in the PANTRY JSON above; values are total amounts for all ${servingsCount} serving(s)`;
}

/* ─────────────────────────────────────────────────────────────
   Structural fallback — returns the full 3-recipe response shape.
───────────────────────────────────────────────────────────── */
const COMMON_SUBS: Record<string, string> = {
  'sour cream':    'Greek yogurt',
  'buttermilk':    'milk + 1 tsp lemon juice',
  'heavy cream':   'evaporated milk',
  'fresh basil':   'dried basil (⅓ the quantity)',
  'fresh parsley': 'dried parsley (⅓ the quantity)',
  'white wine':    'chicken broth + 1 tsp white wine vinegar',
  'red wine':      'beef broth + 1 tsp balsamic vinegar',
  'cream cheese':  'thick Greek yogurt',
  'parmesan':      'any hard aged cheese',
  'breadcrumbs':   'crushed crackers or rolled oats',
};

const GENERIC_FALLBACKS: GeneratedRecipe[] = [
  {
    recipeName:             'Quick Pantry Bowl',
    cookingTime:            '20 minutes',
    whyItMatchesCraving:    'A flexible, adaptable dish built entirely from what you have on hand.',
    substitutedIngredients: {},
    instructions: [
      'Bring a pot of salted water to the boil for any grain or pasta you have.',
      'Heat oil in a pan over medium-high heat.',
      'Add your available protein and cook through, about 5–6 minutes.',
      'Add vegetables and sauté until tender, about 4 minutes.',
      'Season with salt, pepper, and any spices available.',
      'Combine with your cooked grain and serve immediately.',
    ],
    exactPantryQuantitiesToSubtract: {},
  },
  {
    recipeName:             'Simple Stir-Fry',
    cookingTime:            '15 minutes',
    whyItMatchesCraving:    'A quick, high-heat dish that works with almost any combination of ingredients.',
    substitutedIngredients: {},
    instructions: [
      'Heat a wok or large pan over high heat with a thin film of oil.',
      'Add aromatics (garlic, onion) and cook for 1 minute.',
      'Add protein and stir-fry until cooked through.',
      'Add vegetables in order of hardness, stirring constantly.',
      'Season with soy sauce or salt and serve over rice or noodles.',
    ],
    exactPantryQuantitiesToSubtract: {},
  },
  {
    recipeName:             'One-Pan Bake',
    cookingTime:            '35 minutes',
    whyItMatchesCraving:    'A hands-off oven dish that lets flavours meld while you relax.',
    substitutedIngredients: {},
    instructions: [
      'Preheat oven to 200 °C / 400 °F.',
      'Toss protein and vegetables with oil, salt, pepper, and any dried herbs.',
      'Spread in a single layer on a baking tray.',
      'Roast for 25–30 minutes, turning once halfway through.',
      'Rest for 5 minutes before serving.',
    ],
    exactPantryQuantitiesToSubtract: {},
  },
];

function buildFallback(
  matches: MatchResult[],
  maxTime: number,
  craving: string,
): GeneratedRecipeResponse {
  // Use up to 6 candidates; take first 3 for fallback output
  const recipes: GeneratedRecipe[] = [0, 1, 2].map(i => {
    const match = matches[i];
    if (!match) {
      return { ...GENERIC_FALLBACKS[i], cookingTime: `${maxTime} minutes` };
    }

    const subs: Record<string, string> = {};
    for (const item of match.missingItems.slice(0, 5)) {
      const k = Object.keys(COMMON_SUBS).find(key => item.includes(key));
      subs[item] = k ? COMMON_SUBS[k] : 'nearest available equivalent';
    }

    const prefix = ['Classic', 'Hearty', 'Light'][i];
    return {
      recipeName:           `${prefix} ${match.recipe.recipe_name}`,
      cookingTime:          `${Math.min(match.recipe.cooking_time, maxTime)} minutes`,
      whyItMatchesCraving:  `Closest match to "${craving || 'your craving'}". Uses ${match.matchCount} of your pantry ingredients.`,
      substitutedIngredients: subs,
      instructions: match.recipe.instructions.slice(0, 6).map(step => {
        const s = typeof step === 'string' ? step : '';
        return `${s.charAt(0).toUpperCase()}${s.slice(1)}${s.endsWith('.') ? '' : '.'}`;
      }),
      exactPantryQuantitiesToSubtract: {},
    };
  });

  return { recipes };
}

/* ─────────────────────────────────────────────────────────────
   Schema validators
───────────────────────────────────────────────────────────── */
function isValidRecipeItem(obj: unknown): obj is GeneratedRecipe {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;

  if (
    typeof r.recipeName             !== 'string' || r.recipeName.length === 0  ||
    typeof r.cookingTime            !== 'string' || r.cookingTime.length === 0 ||
    typeof r.whyItMatchesCraving    !== 'string'                               ||
    r.substitutedIngredients         === null                                  ||
    typeof r.substitutedIngredients !== 'object'                               ||
    Array.isArray(r.substitutedIngredients)                                    ||
    !Array.isArray(r.instructions)
  ) return false;

  // Strip bare step-number elements the model sometimes emits
  r.instructions = (r.instructions as unknown[]).filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );

  if ((r.instructions as string[]).length < 2) return false;

  // Ensure exactPantryQuantitiesToSubtract exists and is a plain object
  if (!r.exactPantryQuantitiesToSubtract || typeof r.exactPantryQuantitiesToSubtract !== 'object') {
    r.exactPantryQuantitiesToSubtract = {};
  }

  return true;
}

function isValidRecipeResponse(obj: unknown): obj is GeneratedRecipeResponse {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  if (!Array.isArray(r.recipes) || r.recipes.length === 0) return false;
  // Validate + normalise each item in place
  return (r.recipes as unknown[]).every(isValidRecipeItem);
}

/* ─────────────────────────────────────────────────────────────
   Strip markdown fences from LLM output
───────────────────────────────────────────────────────────── */
function cleanJson(text: string): string {
  return text
    .replace(/^[\s\S]*?```(?:json)?[ \t]*\n?([\s\S]*?)```[\s\S]*$/, '$1')
    .replace(/`{1,3}/g, '')
    .trim();
}

/* ─────────────────────────────────────────────────────────────
   GET /api/generate-recipe — connectivity health check
───────────────────────────────────────────────────────────── */
export async function GET(): Promise<NextResponse> {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return NextResponse.json(
      { status: 'error', stage: 'env', message: 'GROQ_API_KEY is not set.',
        hint: 'Add GROQ_API_KEY=gsk_... to .env.local and restart.' },
      { status: 500 },
    );
  }
  if (!key.startsWith('gsk_')) {
    return NextResponse.json(
      { status: 'error', stage: 'env',
        message: `GROQ_API_KEY format looks wrong (starts with "${key.slice(0, 10)}...").` },
      { status: 500 },
    );
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6_000);
  try {
    const probe = await groq.chat.completions.create(
      { model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply with exactly one word: connected' }],
        max_tokens: 5, temperature: 0 },
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    return NextResponse.json({
      status: 'ok', message: 'Groq API is reachable.',
      model: 'llama-3.3-70b-versatile',
      keyPrefix: key.slice(0, 12) + '...',
      probeReply: probe.choices[0]?.message?.content?.trim() ?? '(empty)',
      finishReason: probe.choices[0]?.finish_reason ?? 'unknown',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Groq.APIError) {
      return NextResponse.json(
        { status: 'error', stage: 'api_call', httpStatus: err.status, apiMessage: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { status: 'error', stage: 'network',
        message: (err instanceof Error && err.name === 'AbortError') ? 'Timed out.' : String(err) },
      { status: 502 },
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   POST /api/generate-recipe
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest): Promise<NextResponse> {

  /* ── 1. Parse & validate body ──────────────────────────── */
  let body: Partial<RequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const rawItems = Array.isArray(body.pantryItems) ? body.pantryItems : [];
  const pantryItems: PantryItemPayload[] = rawItems
    .filter((x): x is PantryItemPayload =>
      x !== null && typeof x === 'object' &&
      typeof (x as PantryItemPayload).name === 'string' &&
      (x as PantryItemPayload).name.trim().length > 0,
    )
    .map(x => ({
      name:     x.name.trim().toLowerCase(),
      quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
      unit:     typeof x.unit === 'string' && x.unit.length > 0 ? x.unit : 'pcs',
    }));

  if (pantryItems.length === 0) {
    return NextResponse.json(
      { error: 'pantryItems must be a non-empty array of { name, quantity, unit } objects.' },
      { status: 400 },
    );
  }

  const maxTime      = typeof body.maxTime      === 'number' && body.maxTime > 0      ? body.maxTime      : 60;
  const craving      = typeof body.craving      === 'string'                           ? body.craving.trim().slice(0, 300) : '';
  const servingsCount = typeof body.servingsCount === 'number' && body.servingsCount >= 1
    ? Math.round(body.servingsCount) : 1;
  const dietaryRestrictions = Array.isArray(body.dietaryRestrictions)
    ? (body.dietaryRestrictions as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  const preferredCuisine = typeof body.preferredCuisine === 'string' && body.preferredCuisine.trim().length > 0
    ? body.preferredCuisine.trim().toLowerCase()
    : 'any';

  const language = typeof body.language === 'string' && ['en', 'hi', 'ml'].includes(body.language)
    ? body.language
    : 'en';

  const pantryIngredients = pantryItems.map(i => i.name);

  /* ── 2. Local matcher — top 6 candidates (AI picks best 3) ── */
  let topMatches: MatchResult[];
  try {
    const recipes = getRecipes();
    topMatches    = scoreRecipes(pantryIngredients, recipes, 6);
  } catch (err) {
    console.error('[generate-recipe] matcher failed:', err);
    return NextResponse.json({ error: 'Internal recipe matcher error.' }, { status: 500 });
  }

  /* ── 3. Guard: missing key → structural fallback ───────── */
  if (!process.env.GROQ_API_KEY) {
    console.warn('[generate-recipe] GROQ_API_KEY not set — returning structural fallback');
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 4. Build prompt ────────────────────────────────────── */
  const userPrompt = buildPrompt(
    pantryItems, maxTime, craving, dietaryRestrictions, topMatches, servingsCount, preferredCuisine, language,
  );

  /* ── 5. Call Groq with 20-second timeout ────────────────── */
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  let rawText = '';
  try {
    const completion = await groq.chat.completions.create(
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens:  2500,
        temperature: 0.6,
      },
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    const finishReason = completion.choices[0]?.finish_reason;
    if (finishReason && finishReason !== 'stop') {
      console.warn('[generate-recipe] finish_reason:', finishReason);
    }
    rawText = completion.choices[0]?.message?.content ?? '';

  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Groq.APIError) {
      console.error(`[generate-recipe] Groq error ${err.status}:`, err.message);
    } else {
      console.error('[generate-recipe]', err instanceof Error && err.name === 'AbortError'
        ? 'timeout (>20 s)' : String(err));
    }
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 6. Strip any markdown fences ──────────────────────── */
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch {
      console.error('[generate-recipe] unparseable:', rawText.slice(0, 300));
      return NextResponse.json(buildFallback(topMatches, maxTime, craving));
    }
  }

  /* ── 7. Schema guard ────────────────────────────────────── */
  if (!isValidRecipeResponse(parsed)) {
    console.error('[generate-recipe] schema mismatch:', JSON.stringify(parsed).slice(0, 300));
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 8. Return validated result ─────────────────────────── */
  return NextResponse.json(parsed);
}
