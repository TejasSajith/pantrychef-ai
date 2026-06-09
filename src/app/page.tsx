'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPantry, addItem, removeItem, adjustQuantity, clearPantry } from '@/lib/pantry';
import type { PantryItem, MealConfig } from '@/lib/types';

const DIETARY_OPTIONS = [
  { key: 'vegetarian' as const, label: 'Vegetarian', emoji: '🥗' },
  { key: 'vegan'      as const, label: 'Vegan',       emoji: '🌱' },
  { key: 'glutenFree' as const, label: 'Gluten-Free', emoji: '🌾' },
];

export default function Home() {
  const [pantry,  setPantryState] = useState<PantryItem[]>([]);
  const [input,   setInput]       = useState('');
  const [config,  setConfig]      = useState<MealConfig>({
    prepTime: 30,
    dietary:  { vegetarian: false, vegan: false, glutenFree: false },
    craving:  '',
  });
  const [mounted, setMounted] = useState(false);

  /* Hydrate from localStorage once the client mounts */
  useEffect(() => {
    setPantryState(getPantry());
    setMounted(true);
  }, []);

  /* ── Pantry mutations ─────────────────────────── */
  const handleAdd = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setPantryState(addItem(trimmed));
    setInput('');
  }, [input]);

  const handleRemove = useCallback((id: string) => {
    setPantryState(removeItem(id));
  }, []);

  const handleAdjust = useCallback((id: string, delta: number) => {
    setPantryState(adjustQuantity(id, delta));
  }, []);

  const handleClear = useCallback(() => {
    clearPantry();
    setPantryState([]);
  }, []);

  /* ── Config mutations ─────────────────────────── */
  const setPrepTime = (v: number) =>
    setConfig((c) => ({ ...c, prepTime: v }));

  const toggleDietary = (key: keyof MealConfig['dietary']) =>
    setConfig((c) => ({
      ...c,
      dietary: { ...c.dietary, [key]: !c.dietary[key] },
    }));

  const setCraving = (v: string) =>
    setConfig((c) => ({ ...c, craving: v }));

  /* Placeholder — wired to the matcher + AI in Day 2 */
  const handleFindRecipes = () => {
    console.log('Find recipes →', { pantry, config });
  };

  /* Prevent hydration mismatch — nothing until client mounts */
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

      {/* ── Two-column dashboard ─────────────────────── */}
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
            <div className="flex gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. chicken, garlic, tomatoes…"
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={handleAdd}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
              >
                Add
              </button>
            </div>

            {/* Ingredient list */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {pantry.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                  <span className="text-5xl">🫙</span>
                  <p className="mt-1 text-sm font-medium text-stone-500">
                    Your pantry is empty
                  </p>
                  <p className="text-xs text-stone-400">
                    Add ingredients above to start discovering recipes
                  </p>
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
                      </span>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1 rounded-lg bg-stone-100 px-1 py-1">
                        <button
                          onClick={() => handleAdjust(item.id, -1)}
                          aria-label={`Decrease ${item.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold leading-none text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums text-stone-700">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleAdjust(item.id, 1)}
                          aria-label={`Increase ${item.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-base font-bold leading-none text-stone-500 transition hover:bg-white hover:text-stone-800 hover:shadow-sm"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete — fades in on row hover */}
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
                    <label
                      htmlFor="prep-time"
                      className="text-sm font-semibold text-stone-700"
                    >
                      Preparation Time
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

                {/* Dietary restrictions */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-700">
                    Dietary Restrictions
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {DIETARY_OPTIONS.map(({ key, label, emoji }) => (
                      <label
                        key={key}
                        className={`flex cursor-pointer select-none items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${
                          config.dietary[key]
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={config.dietary[key]}
                          onChange={() => toggleDietary(key)}
                          className="h-4 w-4 cursor-pointer rounded accent-emerald-500"
                        />
                        <span className="text-base leading-none">{emoji}</span>
                        <span
                          className={`text-sm font-medium ${
                            config.dietary[key] ? 'text-emerald-700' : 'text-stone-700'
                          }`}
                        >
                          {label}
                        </span>
                        {config.dietary[key] && (
                          <span className="ml-auto text-xs font-semibold text-emerald-600">
                            Active
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Craving */}
                <div>
                  <label
                    htmlFor="craving"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
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
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 py-4 text-sm font-bold tracking-wide text-white shadow-md transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98]"
                >
                  <span className="text-base">✨</span>
                  Find Recipes
                </button>

              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
