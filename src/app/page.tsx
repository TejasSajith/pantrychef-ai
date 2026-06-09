'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPantry, addItem, removeItem, adjustQuantity,
  decrementItems, clearPantry, getStep,
} from '@/lib/pantry';
import type { PantryItem, MealConfig, GeneratedRecipe } from '@/lib/types';
import { UNITS } from '@/lib/types';

/* ── Key mapping: dietary state key → API string ───────────── */
const DIETARY_LABEL_MAP: Record<keyof MealConfig['dietary'], string> = {
  vegetarian:  'vegetarian',
  vegan:       'vegan',
  glutenFree:  'gluten-free',
  highProtein: 'high-protein',
  lowCarb:     'low-carb',
};

const DIETARY_OPTIONS: {
  key:   keyof MealConfig['dietary'];
  label: string;
  emoji: string;
  accent: string;
}[] = [
  { key: 'vegetarian',  label: 'Vegetarian',   emoji: '🥗', accent: 'emerald' },
  { key: 'vegan',       label: 'Vegan',         emoji: '🌱', accent: 'emerald' },
  { key: 'glutenFree',  label: 'Gluten-Free',   emoji: '🌾', accent: 'emerald' },
  { key: 'highProtein', label: 'High-Protein',  emoji: '💪', accent: 'blue'    },
  { key: 'lowCarb',     label: 'Low-Carb',      emoji: '🥩', accent: 'orange'  },
];

function formatQty(quantity: number, unit: string): string {
  const n = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2));
  return `${n} ${unit}`;
}

/** Minimal structural check so we never set a malformed API error object as the result. */
function isRecipe(data: unknown): data is GeneratedRecipe {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.recipeName          === 'string' && d.recipeName.length > 0 &&
    typeof d.cookingTime         === 'string' &&
    typeof d.whyItMatchesCraving === 'string' &&
    Array.isArray(d.instructions) && (d.instructions as unknown[]).length > 0
  );
}

export default function Home() {
  const [pantry,      setPantryState] = useState<PantryItem[]>([]);
  const [input,       setInput]       = useState('');
  const [inputQty,    setInputQty]    = useState(1);
  const [inputUnit,   setInputUnit]   = useState<typeof UNITS[number]>('pcs');
  const [config,      setConfig]      = useState<MealConfig>({
    prepTime: 30,
    dietary:  { vegetarian: false, vegan: false, glutenFree: false, highProtein: false, lowCarb: false },
    craving:  '',
  });
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<GeneratedRecipe | null>(null);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setPantryState(getPantry());
    setMounted(true);
  }, []);

  /* ── Pantry mutations ─────────────────────────── */
  const handleAdd = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setPantryState(addItem(trimmed, inputQty, inputUnit));
    setInput('');
    setInputQty(1);
  }, [input, inputQty, inputUnit]);

  const handleRemove = useCallback((id: string) => {
    setPantryState(removeItem(id));
  }, []);

  const handleAdjust = useCallback((id: string, direction: 1 | -1) => {
    setPantryState(adjustQuantity(id, direction));
  }, []);

  const handleClear = useCallback(() => {
    clearPantry();
    setPantryState([]);
    setResult(null);
    setFetchError(null);
  }, []);

  /* ── Config mutations ─────────────────────────── */
  const setPrepTime   = (v: number) => setConfig(c => ({ ...c, prepTime: v }));
  const toggleDietary = (key: keyof MealConfig['dietary']) =>
    setConfig(c => ({ ...c, dietary: { ...c.dietary, [key]: !c.dietary[key] } }));
  const setCraving = (v: string) => setConfig(c => ({ ...c, craving: v }));

  /* ── Find Recipes ─────────────────────────────── */
  const handleFindRecipes = useCallback(async () => {
    if (pantry.length === 0 || loading) return;

    setLoading(true);
    setResult(null);
    setFetchError(null);

    const dietaryList = (Object.entries(config.dietary) as [keyof MealConfig['dietary'], boolean][])
      .filter(([, v]) => v)
      .map(([k]) => DIETARY_LABEL_MAP[k]);

    try {
      const res = await fetch('/api/generate-recipe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pantryItems: pantry.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
          maxTime:     config.prepTime,
          craving:     config.craving,
          dietaryRestrictions: dietaryList,
        }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setFetchError('The server returned an unreadable response. Please try again.');
        return;
      }

      /* Check for an API-level error field */
      if (!res.ok || (data && typeof data === 'object' && 'error' in (data as object))) {
        const msg = (data as Record<string, string>)?.error ?? `Server error (${res.status})`;
        setFetchError(msg);
        return;
      }

      /* Validate the shape matches GeneratedRecipe before rendering */
      if (!isRecipe(data)) {
        console.error('[Find Recipes] Unexpected response shape:', data);
        setFetchError('Got an unexpected response from the AI. Please try again.');
        return;
      }

      setResult(data);
    } catch (err) {
      setFetchError(
        err instanceof TypeError && err.message.includes('fetch')
          ? 'Network error — check your connection and try again.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [pantry, config, loading]);

  /* ── I Cooked This! — decrement all pantry items by 1 step */
  const handleCookedThis = useCallback(() => {
    setPantryState(decrementItems(pantry.map(i => i.id)));
    setResult(null);
    setFetchError(null);
  }, [pantry]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <span className="select-none text-3xl">🍳</span>
          <div>
            <h1 className="text-xl font-bold leading-none tracking-tight text-stone-900">
              PantryChef <span className="text-emerald-600">AI</span>
            </h1>
            <p className="mt-0.5 text-xs text-stone-500">
              Turn what you have into what you love
            </p>
          </div>
          <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Swecha AI Hackathon
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* ═══════════════════════════════════════
              LEFT — Digital Pantry
          ═══════════════════════════════════════ */}
          <section className="flex flex-col gap-5">

            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
                Digital Pantry
              </h2>
              <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                {pantry.length} {pantry.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Add ingredient */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. chicken, garlic, flour…"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={inputQty}
                  min={0.01}
                  step={getStep(inputUnit)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) setInputQty(v);
                  }}
                  className="w-20 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-stone-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <select
                  value={inputUnit}
                  onChange={(e) => {
                    const u = e.target.value as typeof UNITS[number];
                    setInputUnit(u);
                    setInputQty(getStep(u));
                  }}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="g">g — Grams</option>
                  <option value="kg">kg — Kilograms</option>
                  <option value="ml">ml — Millilitres</option>
                  <option value="L">L — Litres</option>
                  <option value="pcs">pcs — Pieces</option>
                  <option value="cups">cups — Cups</option>
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!input.trim()}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Ingredient list */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {pantry.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                  <span className="text-5xl">🫙</span>
                  <p className="mt-1 text-sm font-medium text-stone-500">Your pantry is empty</p>
                  <p className="text-xs text-stone-400">Add ingredients above to start discovering recipes</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {pantry.map((item, idx) => (
                    <li key={item.id} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50">
                      <span className="w-5 text-center font-mono text-xs text-stone-300">{idx + 1}</span>

                      <span className="flex-1 text-sm font-medium capitalize text-stone-800">
                        {item.name}
                        <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-normal text-stone-500">
                          {formatQty(item.quantity, item.unit)}
                        </span>
                      </span>

                      <div className="flex items-center gap-1 rounded-lg bg-stone-100 px-1 py-1">
                        <button
                          onClick={() => handleAdjust(item.id, -1)}
                          aria-label={`Decrease ${item.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold leading-none text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >−</button>
                        <span className="min-w-[4.5rem] text-center text-xs font-semibold tabular-nums text-stone-700">
                          {formatQty(item.quantity, item.unit)}
                        </span>
                        <button
                          onClick={() => handleAdjust(item.id, 1)}
                          aria-label={`Increase ${item.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold leading-none text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >+</button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {pantry.length > 0 && (
              <button onClick={handleClear} className="self-start text-xs text-stone-400 transition hover:text-red-400">
                Clear all
              </button>
            )}
          </section>

          {/* ═══════════════════════════════════════
              RIGHT — Meal Customizer
          ═══════════════════════════════════════ */}
          <section className="flex flex-col gap-5">

            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
                Meal Customizer
              </h2>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
              <div className="flex flex-col gap-8">

                {/* Prep time */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <label htmlFor="prep-time" className="text-sm font-semibold text-stone-700">
                      Preparation Time
                    </label>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-sm font-bold text-amber-600">
                      {config.prepTime} min
                    </span>
                  </div>
                  <input
                    id="prep-time"
                    type="range"
                    min={10} max={120} step={5}
                    value={config.prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                  />
                  <div className="mt-2 flex justify-between text-xs text-stone-400">
                    <span>10 min</span><span>1 hr</span><span>2 hrs</span>
                  </div>
                </div>

                {/* Dietary restrictions */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-700">Dietary Preferences</p>
                  <div className="flex flex-col gap-2.5">
                    {DIETARY_OPTIONS.map(({ key, label, emoji, accent }) => {
                      const active = config.dietary[key];
                      const borderColor = active
                        ? accent === 'blue'   ? 'border-blue-300 bg-blue-50'
                        : accent === 'orange' ? 'border-orange-300 bg-orange-50'
                        : 'border-emerald-300 bg-emerald-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50';
                      const textColor = active
                        ? accent === 'blue'   ? 'text-blue-700'
                        : accent === 'orange' ? 'text-orange-700'
                        : 'text-emerald-700'
                        : 'text-stone-700';
                      const badgeColor = active
                        ? accent === 'blue'   ? 'text-blue-600'
                        : accent === 'orange' ? 'text-orange-600'
                        : 'text-emerald-600'
                        : '';

                      return (
                        <label
                          key={key}
                          className={`flex cursor-pointer select-none items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${borderColor}`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleDietary(key)}
                            className="h-4 w-4 cursor-pointer rounded accent-emerald-500"
                          />
                          <span className="text-base leading-none">{emoji}</span>
                          <span className={`text-sm font-medium ${textColor}`}>{label}</span>
                          {active && (
                            <span className={`ml-auto text-xs font-semibold ${badgeColor}`}>Active</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Craving */}
                <div>
                  <label htmlFor="craving" className="mb-2 block text-sm font-semibold text-stone-700">
                    What are you craving right now?
                  </label>
                  <textarea
                    id="craving"
                    value={config.craving}
                    onChange={(e) => setCraving(e.target.value)}
                    placeholder="e.g. something warm and comforting, spicy noodles, a light summer salad…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* CTA */}
                <button
                  onClick={handleFindRecipes}
                  disabled={pantry.length === 0 || loading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 py-4 text-sm font-bold tracking-wide text-white shadow-md transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Finding the perfect recipe…
                    </>
                  ) : (
                    <>
                      <span className="text-base">✨</span>
                      Find Recipes
                    </>
                  )}
                </button>

              </div>
            </div>
          </section>
        </div>

        {/* ── Error banner ─────────────────────────────── */}
        {fetchError && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <span className="mt-0.5 shrink-0 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Could not generate a recipe</p>
              <p className="mt-0.5 text-xs text-red-600">{fetchError}</p>
            </div>
            <button
              onClick={() => setFetchError(null)}
              className="shrink-0 text-xs text-red-400 transition hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            FULL-WIDTH — AI Recipe Result card
        ═══════════════════════════════════════════════ */}
        {result && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-white shadow-md">

            {/* Card header */}
            <div className="flex items-start justify-between gap-4 rounded-t-2xl bg-gradient-to-br from-emerald-50 to-white px-7 py-6">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  AI-Generated Recipe
                </p>
                <h3 className="text-2xl font-bold text-stone-900">{result.recipeName}</h3>
                <p className="mt-1 text-sm text-stone-500">{result.whyItMatchesCraving}</p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600">
                {result.cookingTime}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 px-7 py-6 md:grid-cols-2">

              {/* Instructions */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Instructions
                </p>
                <ol className="flex flex-col gap-3">
                  {result.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-stone-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {i + 1}
                      </span>
                      <span>{step.replace(/^step\s*\d+[:.]\s*/i, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Right column: substitutions + inventory notice */}
              <div className="flex flex-col gap-4">
                {Object.keys(result.substitutedIngredients).length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                      Smart Substitutions
                    </p>
                    <ul className="flex flex-col gap-2">
                      {Object.entries(result.substitutedIngredients).map(([missing, sub]) => (
                        <li key={missing} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-red-400">✗</span>
                          <span className="text-stone-500 line-through">{missing}</span>
                          <span className="text-stone-400">→</span>
                          <span className="font-medium text-emerald-700">{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-600">
                  <p className="font-semibold text-stone-700">Ready to cook?</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Clicking{' '}
                    <span className="font-semibold text-amber-600">I Cooked This!</span>{' '}
                    will deduct one serving of each ingredient from your pantry (
                    {pantry.slice(0, 3).map(i => `${getStep(i.unit)} ${i.unit}`).join(', ')}
                    {pantry.length > 3 ? '…' : ''}).
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-stone-100 px-7 py-5">
              <button
                onClick={() => { setResult(null); setFetchError(null); }}
                className="text-sm text-stone-400 transition hover:text-stone-600"
              >
                Dismiss
              </button>
              <button
                onClick={handleCookedThis}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.98]"
              >
                <span className="text-base">🍽️</span>
                I Cooked This!
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
