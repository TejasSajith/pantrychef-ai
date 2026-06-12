import { scoreRecipes } from '@/utils/recipeMatcher';
import type { RecipeRow } from '@/lib/types';

const recipes: RecipeRow[] = [
  {
    id: 'egg-fried-rice',
    recipe_name: 'Egg Fried Rice',
    ingredients: ['eggs', 'rice', 'soy sauce', 'garlic'],
    instructions: ['Fry eggs.', 'Add rice.'],
    cooking_time: 15,
  },
  {
    id: 'pasta-marinara',
    recipe_name: 'Pasta Marinara',
    ingredients: ['pasta', 'tomatoes', 'garlic', 'olive oil'],
    instructions: ['Boil pasta.', 'Make sauce.'],
    cooking_time: 20,
  },
  {
    id: 'butter-chicken',
    recipe_name: 'Butter Chicken',
    ingredients: ['chicken', 'butter', 'cream', 'tomatoes', 'spices'],
    instructions: ['Cook chicken in sauce.'],
    cooking_time: 30,
  },
];

describe('scoreRecipes', () => {
  it('returns empty array when pantry is empty', () => {
    expect(scoreRecipes([], recipes, 3)).toEqual([]);
  });

  it('returns empty array when recipes list is empty', () => {
    expect(scoreRecipes(['eggs', 'rice'], [], 3)).toEqual([]);
  });

  it('ranks by matchCount descending', () => {
    const results = scoreRecipes(['eggs', 'rice', 'garlic', 'soy sauce'], recipes, 3);
    expect(results[0].recipe.recipe_name).toBe('Egg Fried Rice');
    expect(results[0].matchCount).toBe(4);
  });

  it('matches plural forms (eggs → egg)', () => {
    const results = scoreRecipes(['egg'], recipes, 3);
    const eggRice = results.find(r => r.recipe.recipe_name === 'Egg Fried Rice');
    expect(eggRice).toBeDefined();
    expect(eggRice!.matchCount).toBeGreaterThan(0);
  });

  it('matches partial pantry items (tomato → tomatoes)', () => {
    const results = scoreRecipes(['tomato'], recipes, 3);
    const withTomatoes = results.filter(r => r.matchCount > 0);
    expect(withTomatoes.length).toBeGreaterThan(0);
  });

  it('respects topN limit', () => {
    const results = scoreRecipes(['garlic', 'butter'], recipes, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('populates matchedItems and missingItems correctly', () => {
    const results = scoreRecipes(['eggs', 'rice'], recipes, 1);
    const top = results[0];
    expect(top.matchedItems.length).toBeGreaterThan(0);
    expect(top.matchedItems.length + top.missingItems.length).toBe(top.recipe.ingredients.length);
  });

  it('computes matchRatio between 0 and 1', () => {
    const results = scoreRecipes(['eggs'], recipes, 3);
    for (const r of results) {
      expect(r.matchRatio).toBeGreaterThanOrEqual(0);
      expect(r.matchRatio).toBeLessThanOrEqual(1);
    }
  });
});
