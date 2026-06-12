import type { PantryItem, Unit } from './types';

const STORAGE_KEY = 'pantry_items';

export const UNIT_STEP: Record<string, number> = {
  g: 50,
  kg: 0.1,
  ml: 50,
  L: 0.25,
  pcs: 1,
  cups: 0.25,
};

export function getStep(unit: string): number {
  return UNIT_STEP[unit] ?? 1;
}

export function getPantry(): PantryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as PantryItem[];
    // Migrate older items that predate the unit field
    return items.map((item) => ({ ...item, unit: (item.unit ?? 'pcs') as Unit }));
  } catch {
    return [];
  }
}

export function setPantry(items: PantryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(name: string, quantity = 1, unit: Unit = 'pcs'): PantryItem[] {
  const normalized = name.trim().toLowerCase();
  const current = getPantry();
  if (!normalized || current.some((i) => i.name === normalized)) return current;
  const next: PantryItem[] = [
    ...current,
    {
      id: crypto.randomUUID(),
      name: normalized,
      quantity: parseFloat(quantity.toFixed(3)),
      unit,
      addedAt: Date.now(),
    },
  ];
  setPantry(next);
  return next;
}

export function removeItem(id: string): PantryItem[] {
  const next = getPantry().filter((i) => i.id !== id);
  setPantry(next);
  return next;
}

/**
 * Increment or decrement quantity by the unit-appropriate step size.
 * Direction: +1 to increase, -1 to decrease.
 * Floors at one step (can't go below minimum via stepper; use removeItem to delete).
 */
export function adjustQuantity(id: string, direction: 1 | -1): PantryItem[] {
  const next = getPantry().map((item) => {
    if (item.id !== id) return item;
    const step = getStep(item.unit);
    const newQty = parseFloat((item.quantity + direction * step).toFixed(3));
    return { ...item, quantity: Math.max(step, newQty) };
  });
  setPantry(next);
  return next;
}

/**
 * Decrement all listed item IDs by one step for their unit.
 * Items that reach 0 are removed (they've been fully used up).
 * Called when the user clicks "I Cooked This!".
 */
export function decrementItems(ids: string[]): PantryItem[] {
  const idSet = new Set(ids);
  const next = getPantry()
    .map((item) => {
      if (!idSet.has(item.id)) return item;
      const step = getStep(item.unit);
      const newQty = parseFloat((item.quantity - step).toFixed(3));
      return { ...item, quantity: Math.max(0, newQty) };
    })
    .filter((item) => item.quantity > 0);
  setPantry(next);
  return next;
}

/**
 * Deduct specific amounts from pantry items using the AI's
 * exactPantryQuantitiesToSubtract map (ingredient name → amount).
 * Math.round eliminates floating-point artifacts (e.g. 249.99999… → 250).
 * Items whose quantity reaches exactly 0 are removed from the pantry.
 */
export function deductByName(amounts: Record<string, number>): PantryItem[] {
  const lowerAmounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(amounts)) {
    lowerAmounts[k.toLowerCase().trim()] = v;
  }

  const next = getPantry()
    .map((item) => {
      // Try exact match then substring match in both directions
      const matchedKey = Object.keys(lowerAmounts).find(
        (k) => item.name === k || item.name.includes(k) || k.includes(item.name)
      );
      if (!matchedKey) return item;
      const used = lowerAmounts[matchedKey];
      const newQty = Math.max(0, parseFloat((item.quantity - used).toFixed(3)));
      return { ...item, quantity: newQty };
    })
    .filter((item) => item.quantity > 0);

  setPantry(next);
  return next;
}

export function clearPantry(): void {
  localStorage.removeItem(STORAGE_KEY);
}
