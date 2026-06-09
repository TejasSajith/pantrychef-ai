export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  addedAt: number;
}

export interface RecipeRow {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  imageStub?: string;
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

export interface MealConfig {
  prepTime: number;
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  craving: string;
}
