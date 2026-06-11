'use client';

import { useState } from 'react';
import type { GeneratedRecipe, PantryItem } from '@/lib/types';
import { getStep } from '@/lib/pantry';
import { translations, type Language } from '@/lib/translations';

interface Props {
  recipes:      GeneratedRecipe[];
  pantry:       PantryItem[];
  lang:         Language;
  onCookedThis: (recipe: GeneratedRecipe) => void;
  onDismiss:    () => void;
}

export default function RecipeDisplay({ recipes, pantry, lang, onCookedThis, onDismiss }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const recipe = recipes[Math.min(activeTab, recipes.length - 1)];
  const t = translations[lang];

  if (!recipe) return null;

  const hasSubs    = Object.keys(recipe.substitutedIngredients).length > 0;
  const hasDeducts = Object.keys(recipe.exactPantryQuantitiesToSubtract).length > 0;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-md">

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div className="flex border-b border-stone-100 bg-stone-50/60">
        {recipes.map((r, i) => {
          const active = i === activeTab;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={[
                'flex flex-1 flex-col items-start gap-0.5 px-5 py-3.5 text-left transition-all',
                'border-b-2',
                active
                  ? 'border-emerald-500 bg-white text-emerald-700'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:bg-white/80',
              ].join(' ')}
            >
              <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-emerald-600' : 'text-stone-400'}`}>
                {t.optionLabel} {i + 1}
              </span>
              <span className={`line-clamp-1 text-sm font-semibold ${active ? 'text-stone-900' : 'text-stone-500'}`}>
                {r.recipeName}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Card header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-emerald-50 to-white px-7 py-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {t.aiGeneratedRecipe}
          </p>
          <h3 className="text-2xl font-bold text-stone-900">{recipe.recipeName}</h3>
          <p className="mt-1.5 text-sm text-stone-500">{recipe.whyItMatchesCraving}</p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600">
          {recipe.cookingTime}
        </span>
      </div>

      {/* ── Body: instructions + right column ────────────── */}
      <div className="grid grid-cols-1 gap-6 px-7 py-6 md:grid-cols-2">

        {/* Instructions */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
            {t.instructions}
          </p>
          <ol className="flex flex-col gap-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-stone-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <span>{step.replace(/^step\s*\d+[:.]\s*/i, '')}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Substitutions */}
          {hasSubs && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
                {t.smartSubstitutions}
              </p>
              <ul className="flex flex-col gap-2">
                {Object.entries(recipe.substitutedIngredients).map(([missing, sub]) => (
                  <li key={missing} className="flex flex-wrap items-start gap-1.5 text-sm">
                    <span className="text-red-400">✗</span>
                    <span className="text-stone-500 line-through">{missing}</span>
                    <span className="text-stone-400">→</span>
                    <span className="font-medium text-emerald-700">{sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pantry deduction preview */}
          <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-700">{t.pantryImpact}</p>
            {hasDeducts ? (
              <ul className="mt-2 flex flex-col gap-1">
                {Object.entries(recipe.exactPantryQuantitiesToSubtract).map(([name, amt]) => {
                  const pantryItem = pantry.find(p => {
                    const n = name.toLowerCase().trim();
                    return p.name === n || p.name.includes(n) || n.includes(p.name);
                  });
                  const unit = pantryItem?.unit ?? '';
                  return (
                    <li key={name} className="flex items-center justify-between text-xs text-stone-600">
                      <span className="capitalize">{name}</span>
                      <span className="font-semibold tabular-nums text-red-500">
                        −{amt}{unit ? ` ${unit}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-stone-500">
                {t.pantryImpactFallback(
                  pantry.slice(0, 3).map(i => `${getStep(i.unit)} ${i.unit}`).join(', ') +
                  (pantry.length > 3 ? '…' : '')
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-stone-100 px-7 py-5">
        <button
          onClick={onDismiss}
          className="text-sm text-stone-400 transition hover:text-stone-600"
        >
          {t.dismiss}
        </button>
        <button
          onClick={() => onCookedThis(recipe)}
          className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg active:scale-[0.98]"
        >
          <span className="text-base">🍽️</span>
          {t.iCookedThis}
        </button>
      </div>
    </div>
  );
}
