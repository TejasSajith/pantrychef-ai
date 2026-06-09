import { NextRequest, NextResponse } from 'next/server';
import { readFileSync }               from 'fs';
import { join }                       from 'path';
import Groq                           from 'groq-sdk';
import { scoreRecipes }               from '@/utils/recipeMatcher';
import type { RecipeRow, MatchResult, GeneratedRecipe } from '@/lib/types';

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
      '║  All POST requests will return structural fallbacks. ║\n' +
      '╚══════════════════════════════════════════════════════╝\n',
    );
    return;
  }

  // Groq keys start with "gsk_"
  if (!key.startsWith('gsk_')) {
    console.warn(
      '\n⚠  [generate-recipe]  GROQ_API_KEY looks wrong.\n' +
      `   Loaded value starts with: "${key.slice(0, 10)}..."\n` +
      '   Groq keys always start with "gsk_".\n' +
      '   Get yours at: https://console.groq.com/keys\n',
    );
  } else {
    console.log(
      `\n✓  [generate-recipe]  GROQ_API_KEY loaded — ${key.slice(0, 12)}... ` +
      `(${key.length} chars)\n`,
    );
  }
}());

/* ─────────────────────────────────────────────────────────────
   Dataset — read once per cold-start, held in module scope.
───────────────────────────────────────────────────────────── */
let _recipes: RecipeRow[] | null = null;

function getRecipes(): RecipeRow[] {
  if (_recipes) return _recipes;
  const filePath = join(process.cwd(), 'public/data/cleaned_recipes.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as RecipeRow[];
  // Sanitize: strip null / non-string entries that would crash the token scorer
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
}

/* ─────────────────────────────────────────────────────────────
   System instruction
   The phrase "raw JSON object" satisfies the requirement that
   the prompt explicitly requests JSON when response_format is
   json_object.
───────────────────────────────────────────────────────────── */
const SYSTEM_INSTRUCTION =
  'You are an expert, resource-mindful chef. ' +
  'You specialise in building delicious meals from whatever ingredients a ' +
  'user already owns, never suggesting a trip to the shops when a smart ' +
  'substitute exists. ' +
  'The user provides exact quantities and units for each ingredient. ' +
  'Use these amounts to judge whether there is enough of each ingredient ' +
  'for a full recipe (e.g. 50 g of flour is insufficient for a cake but fine for a sauce). ' +
  'If any critical ingredient is low, scale the recipe portions down to match what is available ' +
  'and mention the scaled serving size in whyItMatchesCraving. ' +
  'When "high-protein" is a dietary requirement: make a protein source (meat, poultry, fish, eggs, ' +
  'legumes, tofu, or dairy) the centrepiece of the dish, and include an estimated protein content ' +
  'per serving (e.g. "approx. 35 g protein per serving") inside whyItMatchesCraving. ' +
  'When "low-carb" is a dietary requirement: keep net carbohydrates below 20 g per serving; ' +
  'replace starchy ingredients (bread, pasta, rice, potatoes) with vegetable alternatives such as ' +
  'cauliflower rice, courgette noodles, or lettuce wraps. ' +
  'You respond with ONLY a raw JSON object — no markdown fences, no prose, ' +
  'no key names other than those specified.';

/* ─────────────────────────────────────────────────────────────
   Prompt builder
───────────────────────────────────────────────────────────── */
function buildPrompt(
  pantryItems: PantryItemPayload[],
  maxTime: number,
  craving: string,
  dietary: string[],
  matches: MatchResult[],
): string {
  const dietaryLine = dietary.length ? dietary.join(', ') : 'none';
  const cravingLine = craving || 'a satisfying, well-rounded meal';

  const DIETARY_GUIDANCE: Record<string, string> = {
    'high-protein': '💪 HIGH-PROTEIN REQUIRED — make meat, fish, eggs, legumes, tofu, or dairy the star. Estimate protein per serving in whyItMatchesCraving.',
    'low-carb':     '🥩 LOW-CARB REQUIRED — keep net carbs under 20 g/serving. Replace pasta/rice/bread with cauliflower, courgette, or extra vegetables.',
    'vegan':        '🌱 VEGAN — absolutely no meat, fish, dairy, or eggs. Every ingredient must be plant-based.',
    'vegetarian':   '🥗 VEGETARIAN — no meat or fish. Eggs and dairy are fine.',
    'gluten-free':  '🌾 GLUTEN-FREE — no wheat, barley, or rye. Use certified gluten-free alternatives.',
  };
  const specialGuidance = dietary
    .map(d => DIETARY_GUIDANCE[d])
    .filter(Boolean)
    .join('\n');

  const pantryLines = pantryItems
    .map(({ name, quantity, unit }) => {
      const qty = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2));
      return `- ${name}: ${qty} ${unit}`;
    })
    .join('\n');

  const matchBlocks = matches.map((m, i) => {
    const have    = m.matchedItems.length ? m.matchedItems.join(', ')             : 'none';
    const missing = m.missingItems.length ? m.missingItems.slice(0, 6).join(', ') : 'none';
    return (
      `#${i + 1} — ${m.recipe.recipe_name} (${m.recipe.cooking_time} min)\n` +
      `  Have    : ${have}\n` +
      `  Missing : ${missing}`
    );
  }).join('\n\n');

  return `## User's Pantry (name — quantity available)
${pantryLines}

## Hard Constraints
- Maximum total time  : ${maxTime} minutes
- Dietary restrictions: ${dietaryLine}
- Craving             : "${cravingLine}"
${specialGuidance ? `\n## Dietary Rules (MUST FOLLOW)\n${specialGuidance}` : ''}

## Top 3 Closest Recipe Matches (ranked by pantry overlap)
${matchBlocks}

## Your Task
Design ONE optimised recipe that:
1. Can be completed in ≤ ${maxTime} minutes (prep + cook)
2. Uses as many pantry ingredients as possible
3. Satisfies the craving: "${cravingLine}"
4. Respects dietary restrictions: ${dietaryLine}
5. For every ingredient the user does NOT have, provide a realistic \
pantry-staple substitute — e.g. sour cream → Greek yogurt, \
buttermilk → milk + 1 tsp lemon juice, fresh basil → dried basil (⅓ qty), \
heavy cream → evaporated milk, wine → broth + 1 tsp vinegar.

## Required Output
Return this exact JSON object and nothing else. No wrapper. No comments.

{"recipeName":"","cookingTime":"","whyItMatchesCraving":"","substitutedIngredients":{},"instructions":[]}

Field rules:
- recipeName          : creative yet descriptive (≤ 60 chars)
- cookingTime         : "X minutes" or "X–Y minutes"
- whyItMatchesCraving : exactly 1–2 sentences on why the flavour/texture profile matches the craving
- substitutedIngredients : object where each key is a missing ingredient and value is the substitute; empty {} if none needed
- instructions        : array of 5–7 strings — each a complete step sentence. Do NOT include bare numbers as separate array elements. Each string must begin with the instruction text, e.g. "Heat oil in a pan…"`;
}

/* ─────────────────────────────────────────────────────────────
   Structural fallback
───────────────────────────────────────────────────────────── */
function buildFallback(
  matches: MatchResult[],
  maxTime: number,
  craving: string,
): GeneratedRecipe {
  const best = matches[0];

  if (!best) {
    return {
      recipeName:             'Quick Pantry Bowl',
      cookingTime:            `${maxTime} minutes`,
      whyItMatchesCraving:    'A flexible, adaptable dish built entirely from what you have on hand.',
      substitutedIngredients: {},
      instructions: [
        'Step 1: Bring a pot of salted water to the boil for any grain or pasta you have.',
        'Step 2: Heat oil in a pan over medium-high heat.',
        'Step 3: Add your available protein and cook through.',
        'Step 4: Add vegetables and sauté until tender.',
        'Step 5: Season with salt, pepper, and any spices available.',
        'Step 6: Combine with your cooked grain and serve immediately.',
      ],
    };
  }

  const COMMON_SUBS: Record<string, string> = {
    'sour cream':    'Greek yogurt',
    'buttermilk':    'milk + 1 tsp lemon juice',
    'heavy cream':   'evaporated milk',
    'fresh basil':   'dried basil (use ⅓ the quantity)',
    'fresh parsley': 'dried parsley (use ⅓ the quantity)',
    'white wine':    'chicken or vegetable broth + 1 tsp white wine vinegar',
    'red wine':      'beef broth + 1 tsp balsamic vinegar',
    'cream cheese':  'thick Greek yogurt',
    'parmesan':      'any hard aged cheese',
    'breadcrumbs':   'crushed crackers or rolled oats',
  };

  const subs: Record<string, string> = {};
  for (const item of best.missingItems.slice(0, 5)) {
    const k = Object.keys(COMMON_SUBS).find(k => item.includes(k));
    subs[item] = k ? COMMON_SUBS[k] : 'nearest available equivalent';
  }

  return {
    recipeName:           `Adapted ${best.recipe.recipe_name}`,
    cookingTime:          `${Math.min(best.recipe.cooking_time, maxTime)} minutes`,
    whyItMatchesCraving:  `Based on your pantry, this is the closest match to your craving for "${craving || 'a satisfying meal'}". It uses ${best.matchCount} of your available ingredients.`,
    substitutedIngredients: subs,
    instructions: best.recipe.instructions.slice(0, 6).map(
      (step, i) => {
        const s = typeof step === 'string' ? step : '';
        return `Step ${i + 1}: ${s.charAt(0).toUpperCase() + s.slice(1)}${s.endsWith('.') ? '' : '.'}`;
      },
    ),
  };
}

/* ─────────────────────────────────────────────────────────────
   Schema validator
───────────────────────────────────────────────────────────── */
function isValidGeneratedRecipe(obj: unknown): obj is GeneratedRecipe {
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

  // Strip any non-string entries the model may have emitted (e.g. bare step numbers)
  r.instructions = (r.instructions as unknown[]).filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );

  return (r.instructions as string[]).length >= 2;
}

/* ─────────────────────────────────────────────────────────────
   GET /api/generate-recipe — connectivity health check
   curl http://localhost:3000/api/generate-recipe
───────────────────────────────────────────────────────────── */
export async function GET(): Promise<NextResponse> {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return NextResponse.json(
      {
        status:  'error',
        stage:   'env',
        message: 'GROQ_API_KEY is not set.',
        hint:    'Add GROQ_API_KEY=gsk_... to .env.local, then restart the dev server. Free key at https://console.groq.com/keys',
      },
      { status: 500 },
    );
  }

  if (!key.startsWith('gsk_')) {
    return NextResponse.json(
      {
        status:    'error',
        stage:     'env',
        message:   `GROQ_API_KEY format looks wrong (starts with "${key.slice(0, 10)}...").`,
        hint:      'Groq keys start with "gsk_". Get one at https://console.groq.com/keys',
        keyLength: key.length,
      },
      { status: 500 },
    );
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 6_000);

  try {
    const probe = await groq.chat.completions.create(
      {
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: 'Reply with exactly one word: connected' }],
        max_tokens:  5,
        temperature: 0,
      },
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    const probeText    = probe.choices[0]?.message?.content?.trim() ?? '(no response)';
    const finishReason = probe.choices[0]?.finish_reason ?? 'unknown';

    return NextResponse.json({
      status:       'ok',
      message:      'Groq API is reachable and the key is valid.',
      model:        'llama-3.3-70b-versatile',
      keyPrefix:    key.slice(0, 12) + '...',
      probeReply:   probeText,
      finishReason,
    });

  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Groq.APIError) {
      return NextResponse.json(
        {
          status:     'error',
          stage:      'api_call',
          httpStatus: err.status,
          apiMessage: err.message,
          keyPrefix:  key.slice(0, 12) + '...',
          hint:       err.status === 401 ? 'Key is invalid or has been revoked.'
                    : err.status === 403 ? 'Key lacks permission for this model.'
                    : err.status === 429 ? 'Rate-limited. Check https://console.groq.com'
                    : 'Check https://console.groq.com for details.',
        },
        { status: 502 },
      );
    }

    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      {
        status:  'error',
        stage:   'network',
        message: isTimeout
          ? 'Request timed out after 6 s.'
          : `Network error: ${String(err)}`,
      },
      { status: 502 },
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   POST /api/generate-recipe
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest): Promise<NextResponse> {

  /* ── 1. Parse & validate request body ─────────────────── */
  let body: Partial<RequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const rawItems = Array.isArray(body.pantryItems) ? body.pantryItems : [];
  const pantryItems: PantryItemPayload[] = rawItems
    .filter(
      (x): x is PantryItemPayload =>
        x !== null &&
        typeof x === 'object' &&
        typeof (x as PantryItemPayload).name === 'string' &&
        (x as PantryItemPayload).name.trim().length > 0,
    )
    .map(x => ({
      name:     x.name.trim().toLowerCase(),
      quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
      unit:     typeof x.unit === 'string' && x.unit.length > 0 ? x.unit : 'pcs',
    }));

  const maxTime             = typeof body.maxTime === 'number' && body.maxTime > 0 ? body.maxTime : 60;
  const craving             = typeof body.craving === 'string' ? body.craving.trim().slice(0, 300) : '';
  const dietaryRestrictions = Array.isArray(body.dietaryRestrictions)
    ? (body.dietaryRestrictions as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

  if (pantryItems.length === 0) {
    return NextResponse.json(
      { error: 'pantryItems must be a non-empty array of { name, quantity, unit } objects.' },
      { status: 400 },
    );
  }

  const pantryIngredients = pantryItems.map(i => i.name);

  /* ── 2. Local matcher — top 3 structural hits ──────────── */
  let topMatches: MatchResult[];
  try {
    const recipes = getRecipes();
    topMatches    = scoreRecipes(pantryIngredients, recipes, 3);
  } catch (err) {
    console.error('[generate-recipe] matcher failed:', err);
    return NextResponse.json(
      { error: 'Internal recipe matcher error.' },
      { status: 500 },
    );
  }

  /* ── 3. Guard: missing key → structural fallback ───────── */
  if (!process.env.GROQ_API_KEY) {
    console.warn('[generate-recipe] GROQ_API_KEY not set — returning structural fallback');
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 4. Build prompt ────────────────────────────────────── */
  const userPrompt = buildPrompt(
    pantryItems,
    maxTime,
    craving,
    dietaryRestrictions,
    topMatches,
  );

  /* ── 5. Call llama-3.3-70b-versatile with 15-second timeout */
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 15_000);

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
        max_tokens:  800,
        temperature: 0.4,
      },
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    const finishReason = completion.choices[0]?.finish_reason;
    if (finishReason && finishReason !== 'stop') {
      console.warn('[generate-recipe] Unexpected finish_reason:', finishReason);
    }

    rawText = completion.choices[0]?.message?.content ?? '';

  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Groq.APIError) {
      console.error(`[generate-recipe] Groq API error ${err.status}:`, err.message);
    } else {
      const label = (err instanceof Error && err.name === 'AbortError')
        ? 'timeout (>8 s)'
        : `fetch error: ${String(err)}`;
      console.error('[generate-recipe]', label);
    }
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 6. Parse LLM output ────────────────────────────────── */
  // Strip any markdown fences the model might still emit despite the system instruction.
  // Handles: ```json\n...\n```, ```\n...\n```, and inline ``` wrapping.
  function cleanJson(text: string): string {
    return text
      .replace(/^[\s\S]*?```(?:json)?[ \t]*\n?([\s\S]*?)```[\s\S]*$/, '$1')  // extract fenced block
      .replace(/`{1,3}/g, '')  // strip any stray backticks
      .trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const stripped = cleanJson(rawText);
    try {
      parsed = JSON.parse(stripped);
    } catch {
      console.error('[generate-recipe] Unparseable response:', rawText.slice(0, 300));
      return NextResponse.json(buildFallback(topMatches, maxTime, craving));
    }
  }

  /* ── 7. Schema guard ────────────────────────────────────── */
  if (!isValidGeneratedRecipe(parsed)) {
    console.error('[generate-recipe] Schema mismatch:', JSON.stringify(parsed).slice(0, 300));
    return NextResponse.json(buildFallback(topMatches, maxTime, craving));
  }

  /* ── 8. Return validated result ─────────────────────────── */
  return NextResponse.json(parsed);
}
