'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPantry,
  addItem,
  removeItem,
  adjustQuantity,
  decrementItems,
  deductByName,
  clearPantry,
  getStep,
} from '@/lib/pantry';
import RecipeDisplay from '@/components/RecipeDisplay';
import AISettingsPanel from '@/components/AISettingsPanel';
import type { PantryItem, MealConfig, GeneratedRecipe, GeneratedRecipeResponse } from '@/lib/types';
import { UNITS } from '@/lib/types';
import { translations, type Language } from '@/lib/translations';
import { type AIConfig, loadAIConfig, saveAIConfig, PROVIDER_META } from '@/lib/ai-config';

type CuisineOption =
  | 'any'
  | 'north-indian'
  | 'south-indian'
  | 'mughlai'
  | 'kerala'
  | 'italian'
  | 'mexican'
  | 'east-asian'
  | 'mediterranean';

const DIETARY_LABEL_MAP: Record<keyof MealConfig['dietary'], string> = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  glutenFree: 'gluten-free',
  highProtein: 'high-protein',
  lowCarb: 'low-carb',
};

const DIETARY_KEYS: {
  key: keyof MealConfig['dietary'];
  emoji: string;
  accent: 'emerald' | 'blue' | 'orange';
}[] = [
  { key: 'vegetarian', emoji: '🥗', accent: 'emerald' },
  { key: 'vegan', emoji: '🌱', accent: 'emerald' },
  { key: 'glutenFree', emoji: '🌾', accent: 'emerald' },
  { key: 'highProtein', emoji: '💪', accent: 'blue' },
  { key: 'lowCarb', emoji: '🥩', accent: 'orange' },
];

function formatQty(quantity: number, unit: string): string {
  const n = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2));
  return `${n} ${unit}`;
}

function isRecipeResponse(data: unknown): data is GeneratedRecipeResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.recipes) || d.recipes.length === 0) return false;
  return (d.recipes as unknown[]).every((r) => {
    if (!r || typeof r !== 'object') return false;
    const rec = r as Record<string, unknown>;
    return (
      typeof rec.recipeName === 'string' &&
      rec.recipeName.length > 0 &&
      typeof rec.cookingTime === 'string' &&
      Array.isArray(rec.instructions) &&
      (rec.instructions as unknown[]).length > 0
    );
  });
}

const LANG_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  ml: 'മലയാളം',
};

export default function Home() {
  const [pantry, setPantryState] = useState<PantryItem[]>([]);
  const [input, setInput] = useState('');
  const [inputQty, setInputQty] = useState(1);
  const [inputUnit, setInputUnit] = useState<(typeof UNITS)[number]>('pcs');
  const [servingsCount, setServings] = useState(1);
  const [cuisine, setCuisine] = useState<CuisineOption>('any');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [config, setConfig] = useState<MealConfig>({
    prepTime: 30,
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      highProtein: false,
      lowCarb: false,
    },
    craving: '',
  });
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<GeneratedRecipe[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [aiConfig, setAIConfig] = useState<AIConfig>(loadAIConfig());
  const [showAISettings, setShowAISettings] = useState(false);

  useEffect(() => {
    setPantryState(getPantry());
    setAIConfig(loadAIConfig());
    setMounted(true);
  }, []);

  const t = translations[currentLanguage];

  const CUISINE_OPTIONS: { value: CuisineOption; label: string; emoji: string }[] = [
    { value: 'any', label: t.cuisineAny, emoji: '🌍' },
    { value: 'north-indian', label: t.cuisineNorthIndian, emoji: '🍛' },
    { value: 'south-indian', label: t.cuisineSouthIndian, emoji: '🥘' },
    { value: 'mughlai', label: t.cuisineMughlai, emoji: '🫕' },
    { value: 'kerala', label: t.cuisineKerala, emoji: '🥥' },
    { value: 'italian', label: t.cuisineItalian, emoji: '🍝' },
    { value: 'mexican', label: t.cuisineMexican, emoji: '🌮' },
    { value: 'east-asian', label: t.cuisineEastAsian, emoji: '🥢' },
    { value: 'mediterranean', label: t.cuisineMediterranean, emoji: '🫒' },
  ];

  /* ── Pantry mutations ─────────────────────────── */
  const handleAdd = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setPantryState(addItem(trimmed, inputQty, inputUnit));
    setInput('');
    setInputQty(1);
  }, [input, inputQty, inputUnit]);

  const handleRemove = useCallback((id: string) => setPantryState(removeItem(id)), []);
  const handleAdjust = useCallback(
    (id: string, d: 1 | -1) => setPantryState(adjustQuantity(id, d)),
    []
  );
  const handleClear = useCallback(() => {
    clearPantry();
    setPantryState([]);
    setRecipes(null);
    setFetchError(null);
  }, []);

  /* ── Config mutations ─────────────────────────── */
  const setPrepTime = (v: number) => setConfig((c) => ({ ...c, prepTime: v }));
  const toggleDietary = (key: keyof MealConfig['dietary']) =>
    setConfig((c) => ({ ...c, dietary: { ...c.dietary, [key]: !c.dietary[key] } }));
  const setCraving = (v: string) => setConfig((c) => ({ ...c, craving: v }));

  /* ── Find Recipes ─────────────────────────────── */
  const handleFindRecipes = useCallback(async () => {
    if (pantry.length === 0 || loading) return;
    setLoading(true);
    setRecipes(null);
    setFetchError(null);

    const dietaryList = (Object.entries(config.dietary) as [keyof MealConfig['dietary'], boolean][])
      .filter(([, v]) => v)
      .map(([k]) => DIETARY_LABEL_MAP[k]);

    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pantryItems: pantry.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
          maxTime: config.prepTime,
          craving: config.craving,
          dietaryRestrictions: dietaryList,
          servingsCount,
          preferredCuisine: cuisine,
          language: currentLanguage,
          aiConfig: {
            provider: aiConfig.provider,
            apiKey: aiConfig.provider !== 'server' ? aiConfig.apiKey : undefined,
            groqModel: aiConfig.groqModel,
            openaiModel: aiConfig.openaiModel,
            ollamaEndpoint: aiConfig.ollamaEndpoint,
            ollamaModel: aiConfig.ollamaModel,
          },
        }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setFetchError('The server returned an unreadable response. Please try again.');
        return;
      }

      if (!res.ok || (data && typeof data === 'object' && 'error' in (data as object))) {
        setFetchError((data as Record<string, string>)?.error ?? `Server error (${res.status})`);
        return;
      }

      if (!isRecipeResponse(data)) {
        console.error('[Find Recipes] Unexpected response shape:', data);
        setFetchError('Got an unexpected response from the AI. Please try again.');
        return;
      }

      setRecipes((data as GeneratedRecipeResponse).recipes);
    } catch (err) {
      setFetchError(
        err instanceof TypeError && err.message.includes('fetch')
          ? 'Network error — check your connection and try again.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [pantry, config, loading, servingsCount, cuisine, currentLanguage, aiConfig]);

  /* ── AI Config ───────────────────────────────── */
  const handleSaveAIConfig = useCallback((cfg: AIConfig) => {
    saveAIConfig(cfg);
    setAIConfig(cfg);
    setShowAISettings(false);
  }, []);

  /* ── I Cooked This! ───────────────────────────── */
  const handleCookedThis = useCallback(
    (recipe: GeneratedRecipe) => {
      const amounts = recipe.exactPantryQuantitiesToSubtract ?? {};
      if (Object.keys(amounts).length > 0) {
        setPantryState(deductByName(amounts));
      } else {
        setPantryState(decrementItems(pantry.map((i) => i.id)));
      }
      setRecipes(null);
      setFetchError(null);
    },
    [pantry]
  );

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
            <p className="mt-0.5 text-xs text-stone-500">{t.appSubtitle}</p>
          </div>

          {/* Right-side controls */}
          <div className="ml-auto flex items-center gap-2">
            {/* Language selector */}
            <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 p-0.5">
              {(Object.keys(LANG_LABELS) as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCurrentLanguage(lang)}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                    currentLanguage === lang
                      ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                      : 'text-stone-500 hover:text-stone-700',
                  ].join(' ')}
                >
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>

            {/* AI provider button */}
            <button
              type="button"
              onClick={() => setShowAISettings(true)}
              title="AI Provider Settings"
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-100"
            >
              <span className="text-sm leading-none">{PROVIDER_META[aiConfig.provider].icon}</span>
              <span className="hidden sm:inline">
                {PROVIDER_META[aiConfig.provider].shortLabel}
              </span>
              <span className="text-stone-400">⚙</span>
            </button>

            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline">
              {t.hackathonBadge}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ═══════════════════════════════════
              LEFT — Digital Pantry
          ═══════════════════════════════════ */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
                {t.digitalPantry}
              </h2>
              <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                {t.itemCount(pantry.length)}
              </span>
            </div>

            {/* Add ingredient */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder={t.ingredientPlaceholder}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className="w-20 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-stone-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <select
                  value={inputUnit}
                  onChange={(e) => {
                    const u = e.target.value as (typeof UNITS)[number];
                    setInputUnit(u);
                    setInputQty(getStep(u));
                  }}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  {t.add}
                </button>
              </div>
            </div>

            {/* Ingredient list */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {pantry.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                  <span className="text-5xl">🫙</span>
                  <p className="mt-1 text-sm font-medium text-stone-500">{t.pantryEmpty}</p>
                  <p className="text-xs text-stone-400">{t.pantryEmptySub}</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {pantry.map((item, idx) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50"
                    >
                      <span className="w-5 text-center font-mono text-xs text-stone-300">
                        {idx + 1}
                      </span>
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
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >
                          −
                        </button>
                        <span className="min-w-[4.5rem] text-center text-xs font-semibold tabular-nums text-stone-700">
                          {formatQty(item.quantity, item.unit)}
                        </span>
                        <button
                          onClick={() => handleAdjust(item.id, 1)}
                          aria-label={`Increase ${item.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {pantry.length > 0 && (
              <button
                onClick={handleClear}
                className="self-start text-xs text-stone-400 transition hover:text-red-400"
              >
                {t.clearAll}
              </button>
            )}
          </section>

          {/* ═══════════════════════════════════
              RIGHT — Meal Customizer
          ═══════════════════════════════════ */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500">
                {t.mealCustomizer}
              </h2>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
              <div className="flex flex-col gap-8">
                {/* Prep time */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <label htmlFor="prep-time" className="text-sm font-semibold text-stone-700">
                      {t.preparationTime}
                    </label>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-sm font-bold text-amber-600">
                      {config.prepTime} min
                    </span>
                  </div>
                  <input
                    id="prep-time"
                    type="range"
                    min={10}
                    max={120}
                    step={5}
                    value={config.prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                  />
                  <div className="mt-2 flex justify-between text-xs text-stone-400">
                    <span>10 min</span>
                    <span>1 hr</span>
                    <span>2 hrs</span>
                  </div>
                </div>

                {/* Number of People */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-stone-700">
                      {t.numberOfPeople}
                    </label>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-0.5 text-sm font-bold text-stone-600">
                      {t.personCount(servingsCount)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      disabled={servingsCount <= 1}
                      aria-label="Decrease servings"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-bold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <div className="flex flex-1 items-center justify-center gap-1">
                      {Array.from({ length: Math.min(servingsCount, 8) }).map((_, i) => (
                        <span key={i} className="text-base" title={`${i + 1} person`}>
                          🧑
                        </span>
                      ))}
                      {servingsCount > 8 && (
                        <span className="text-xs font-semibold text-stone-500">
                          +{servingsCount - 8}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setServings((s) => Math.min(20, s + 1))}
                      disabled={servingsCount >= 20}
                      aria-label="Increase servings"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-bold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Dietary preferences */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-700">
                    {t.dietaryPreferences}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {DIETARY_KEYS.map(({ key, emoji, accent }) => {
                      const active = config.dietary[key];
                      const dietaryLabel = t[key as keyof typeof t] as string;
                      const border = active
                        ? accent === 'blue'
                          ? 'border-blue-300 bg-blue-50'
                          : accent === 'orange'
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-emerald-300 bg-emerald-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50';
                      const text = active
                        ? accent === 'blue'
                          ? 'text-blue-700'
                          : accent === 'orange'
                            ? 'text-orange-700'
                            : 'text-emerald-700'
                        : 'text-stone-700';
                      const badge = active
                        ? accent === 'blue'
                          ? 'text-blue-600'
                          : accent === 'orange'
                            ? 'text-orange-600'
                            : 'text-emerald-600'
                        : '';
                      return (
                        <label
                          key={key}
                          className={`flex cursor-pointer select-none items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${border}`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleDietary(key)}
                            className="h-4 w-4 cursor-pointer rounded accent-emerald-500"
                          />
                          <span className="text-base leading-none">{emoji}</span>
                          <span className={`text-sm font-medium ${text}`}>{dietaryLabel}</span>
                          {active && (
                            <span className={`ml-auto text-xs font-semibold ${badge}`}>
                              {t.active}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred Cuisine */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-700">{t.preferredCuisine}</p>
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_OPTIONS.map(({ value, label, emoji }) => {
                      const active = cuisine === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCuisine(value)}
                          className={[
                            'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                            active
                              ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-300'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50',
                          ].join(' ')}
                        >
                          <span className="text-sm leading-none">{emoji}</span>
                          {label}
                          {active && value !== 'any' && (
                            <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Craving */}
                <div>
                  <label
                    htmlFor="craving"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    {t.craving}
                  </label>
                  <textarea
                    id="craving"
                    value={config.craving}
                    onChange={(e) => setCraving(e.target.value)}
                    placeholder={t.cravingPlaceholder}
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
                      {t.generatingRecipes}
                    </>
                  ) : (
                    <>
                      <span className="text-base">✨</span>
                      {t.findRecipesBtn(servingsCount)}
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
              <p className="text-sm font-semibold text-red-700">{t.couldNotGenerate}</p>
              <p className="mt-0.5 text-xs text-red-600">{fetchError}</p>
            </div>
            <button
              onClick={() => setFetchError(null)}
              className="shrink-0 text-xs text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Recipe Display ─────────────────────────── */}
        {recipes && (
          <RecipeDisplay
            recipes={recipes}
            pantry={pantry}
            lang={currentLanguage}
            onCookedThis={handleCookedThis}
            onDismiss={() => {
              setRecipes(null);
              setFetchError(null);
            }}
          />
        )}
      </main>

      {/* ── AI Settings Modal ────────────────────────── */}
      {showAISettings && (
        <AISettingsPanel
          config={aiConfig}
          onSave={handleSaveAIConfig}
          onClose={() => setShowAISettings(false)}
        />
      )}
    </div>
  );
}
