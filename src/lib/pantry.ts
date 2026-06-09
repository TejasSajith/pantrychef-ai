import type { PantryItem } from './types';

const STORAGE_KEY = 'pantry_items';

export function getPantry(): PantryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PantryItem[]) : [];
  } catch {
    return [];
  }
}

export function setPantry(items: PantryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(name: string): PantryItem[] {
  const normalized = name.trim().toLowerCase();
  const current = getPantry();
  if (!normalized || current.some((i) => i.name === normalized)) return current;
  const next: PantryItem[] = [
    ...current,
    { id: crypto.randomUUID(), name: normalized, quantity: 1, addedAt: Date.now() },
  ];
  setPantry(next);
  return next;
}

export function removeItem(id: string): PantryItem[] {
  const next = getPantry().filter((i) => i.id !== id);
  setPantry(next);
  return next;
}

export function adjustQuantity(id: string, delta: number): PantryItem[] {
  const next = getPantry().map((i) =>
    i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
  );
  setPantry(next);
  return next;
}

export function clearPantry(): void {
  localStorage.removeItem(STORAGE_KEY);
}
