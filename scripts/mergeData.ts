/**
 * db:build — one-time pipeline
 *
 * Source : public/data/RAW_recipes.csv  (281 MB, ~230k rows)
 * Output : public/data/cleaned_recipes.json  (5k–10k quality recipes)
 *
 * Schema used:
 *   name          → recipe_name
 *   id            → id
 *   minutes       → cooking_time
 *   steps         → instructions  (Python list string → string[])
 *   ingredients   → ingredients   (Python list string → string[])
 *
 * Joins: none needed — RAW_recipes.csv is self-contained.
 * PP_recipes.csv contains only tokenised integers, not human-readable text.
 * Interactions files are user-rating data, irrelevant for recipe content.
 */

import { createReadStream, writeFileSync } from 'fs';
import { join }                            from 'path';
import Papa                                from 'papaparse';

/* ── Config ────────────────────────────────────────────────── */
const INPUT      = join(process.cwd(), 'public/data/RAW_recipes.csv');
const OUTPUT     = join(process.cwd(), 'public/data/cleaned_recipes.json');
const TARGET     = 8_000;   // hard cap on output rows
const MIN_MINS   = 5;        // skip instant/no-cook entries
const MAX_MINS   = 180;      // skip multi-day marinades etc.
const MIN_INGR   = 3;        // skip trivial single-ingredient rows
const MIN_STEPS  = 2;        // skip recipes with no real instructions

/* ── Types ─────────────────────────────────────────────────── */
interface RawRow {
  name: string;
  id: string;
  minutes: string;
  steps: string;
  ingredients: string;
  n_ingredients: string;
  n_steps: string;
}

export interface CleanedRecipe {
  id: string;
  recipe_name: string;
  ingredients: string[];
  instructions: string[];
  cooking_time: number;
}

/* ── Python-list parser ─────────────────────────────────────── */
/**
 * Converts Python repr list strings to plain string arrays.
 *
 * Handles:
 *   ['item one', 'item two']          → ['item one', 'item two']
 *   ['it\'s great', "double-quoted"]  → ["it's great", "double-quoted"]
 *   []                                → []
 */
function parsePythonList(raw: string): string[] {
  if (!raw || raw.trim() === '[]') return [];

  const results: string[] = [];
  // Match single-quoted or double-quoted strings, honoring backslash escapes
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    const val = (m[1] ?? m[2])
      .replace(/\\'/g,  "'")
      .replace(/\\"/g,  '"')
      .replace(/\\n/g,  ' ')
      .replace(/\\t/g,  ' ')
      .replace(/\s+/g,  ' ')
      .trim();

    if (val) results.push(val);
  }

  return results;
}

/* ── Quality gate ───────────────────────────────────────────── */
function isQuality(row: RawRow, ingredients: string[], instructions: string[]): boolean {
  const mins = parseInt(row.minutes, 10);
  if (isNaN(mins) || mins < MIN_MINS || mins > MAX_MINS) return false;
  if (!row.name?.trim())                                  return false;
  if (ingredients.length  < MIN_INGR)                    return false;
  if (instructions.length < MIN_STEPS)                   return false;
  return true;
}

/* ── Main ───────────────────────────────────────────────────── */
const collected: CleanedRecipe[] = [];
let rowsScanned  = 0;
let rowsSkipped  = 0;

console.log('');
console.log('PantryChef AI — Dataset Builder');
console.log('─────────────────────────────────────────────');
console.log(`  Source : ${INPUT}`);
console.log(`  Target : ${TARGET} quality recipes`);
console.log(`  Filter : ${MIN_MINS}–${MAX_MINS} min, ≥${MIN_INGR} ingredients, ≥${MIN_STEPS} steps`);
console.log('─────────────────────────────────────────────\n');

const t0     = Date.now();
const stream = createReadStream(INPUT, { encoding: 'utf-8' });

Papa.parse<RawRow>(stream, {
  header:         true,
  skipEmptyLines: true,

  step(result, parser) {
    /* Abort cleanly once we hit the target */
    if (collected.length >= TARGET) {
      parser.abort();
      return;
    }

    rowsScanned++;
    const row = result.data;

    const ingredients  = parsePythonList(row.ingredients);
    const instructions = parsePythonList(row.steps);

    if (!isQuality(row, ingredients, instructions)) {
      rowsSkipped++;
      return;
    }

    collected.push({
      id:           row.id,
      recipe_name:  row.name.trim(),
      ingredients,
      instructions,
      cooking_time: parseInt(row.minutes, 10),
    });

    /* Live progress every 500 collected */
    if (collected.length % 500 === 0) {
      process.stdout.write(
        `  ✦ ${String(collected.length).padStart(5)} collected  |  ${String(rowsScanned).padStart(7)} scanned\r`
      );
    }
  },

  complete() {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    const json    = JSON.stringify(collected, null, 2);
    const sizeKB  = Math.round(Buffer.byteLength(json, 'utf-8') / 1024);

    writeFileSync(OUTPUT, json, 'utf-8');

    console.log(`\n\n─────────────────────────────────────────────`);
    console.log(`  ✓ Recipes collected : ${collected.length.toLocaleString()}`);
    console.log(`  ✓ Rows scanned      : ${rowsScanned.toLocaleString()}`);
    console.log(`  ✓ Rows skipped      : ${rowsSkipped.toLocaleString()}`);
    console.log(`  ✓ Elapsed           : ${elapsed}s`);
    console.log(`  ✓ Output size       : ${sizeKB.toLocaleString()} KB`);
    console.log(`  ✓ Written to        : ${OUTPUT}`);
    console.log('─────────────────────────────────────────────\n');
  },

  error(err) {
    console.error('\n✗ Parse error:', err);
    process.exit(1);
  },
});
