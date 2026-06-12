export const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'cups'] as const;
export type Unit = (typeof UNITS)[number];

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  addedAt: number;
}

export interface RecipeRow {
  id: string;
  recipe_name: string;
  ingredients: string[];
  instructions: string[];
  cooking_time: number;
}

export interface MatchResult {
  recipe: RecipeRow;
  matchCount: number;
  matchRatio: number;
  matchedItems: string[];
  missingItems: string[];
}

export interface RecipeResponse {
  title: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  steps: string[];
  substitutions: { ingredient: string; substitute: string }[];
  tips: string;
}

/** Schema for a single AI-generated recipe */
export interface GeneratedRecipe {
  recipeName: string;
  cookingTime: string;
  whyItMatchesCraving: string;
  /** Keys are missing ingredient names; values are suggested substitutes */
  substitutedIngredients: Record<string, string>;
  instructions: string[];
  /** Keys are pantry ingredient names; values are amounts to deduct (in pantry units) */
  exactPantryQuantitiesToSubtract: Record<string, number>;
}

/** Top-level schema returned by POST /api/generate-recipe */
export interface GeneratedRecipeResponse {
  recipes: GeneratedRecipe[];
}

export interface MealConfig {
  prepTime: number;
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    highProtein: boolean;
    lowCarb: boolean;
  };
  craving: string;
}
