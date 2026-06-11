export type Language = 'en' | 'hi' | 'ml';

export interface Translations {
  appSubtitle: string;
  hackathonBadge: string;

  digitalPantry: string;
  mealCustomizer: string;
  recipeOptions: string;

  ingredientPlaceholder: string;
  add: string;
  clearAll: string;
  pantryEmpty: string;
  pantryEmptySub: string;
  itemCount: (n: number) => string;

  preparationTime: string;
  numberOfPeople: string;
  personCount: (n: number) => string;
  dietaryPreferences: string;
  preferredCuisine: string;
  craving: string;
  cravingPlaceholder: string;

  findRecipesBtn: (n: number) => string;
  generatingRecipes: string;

  couldNotGenerate: string;
  cookingInProgress: string;
  noRecipesFound: string;

  vegetarian: string;
  vegan: string;
  glutenFree: string;
  highProtein: string;
  lowCarb: string;
  active: string;

  cuisineAny: string;
  cuisineNorthIndian: string;
  cuisineSouthIndian: string;
  cuisineMughlai: string;
  cuisineKerala: string;
  cuisineItalian: string;
  cuisineMexican: string;
  cuisineEastAsian: string;
  cuisineMediterranean: string;

  optionLabel: string;
  aiGeneratedRecipe: string;
  instructions: string;
  smartSubstitutions: string;
  pantryImpact: string;
  iCookedThis: string;
  dismiss: string;
  pantryImpactFallback: (units: string) => string;
}

const en: Translations = {
  appSubtitle: 'Turn what you have into what you love',
  hackathonBadge: 'Swecha AI Hackathon',

  digitalPantry: 'Digital Pantry',
  mealCustomizer: 'Meal Customizer',
  recipeOptions: 'Recipe Options',

  ingredientPlaceholder: 'e.g. chicken, garlic, flour…',
  add: 'Add',
  clearAll: 'Clear all',
  pantryEmpty: 'Your pantry is empty',
  pantryEmptySub: 'Add ingredients above to start discovering recipes',
  itemCount: n => `${n} ${n === 1 ? 'item' : 'items'}`,

  preparationTime: 'Preparation Time',
  numberOfPeople: 'Number of People',
  personCount: n => `${n} ${n === 1 ? 'person' : 'people'}`,
  dietaryPreferences: 'Dietary Preferences',
  preferredCuisine: 'Preferred Cuisine',
  craving: 'What are you craving right now?',
  cravingPlaceholder: 'e.g. something warm and comforting, spicy noodles, a light summer salad…',

  findRecipesBtn: n => n > 1 ? `Find Recipes for ${n}` : 'Find Recipes',
  generatingRecipes: 'Generating 3 recipes…',

  couldNotGenerate: 'Could not generate recipes',
  cookingInProgress: 'Cooking in progress…',
  noRecipesFound: 'No recipes found',

  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  glutenFree: 'Gluten-Free',
  highProtein: 'High-Protein',
  lowCarb: 'Low-Carb',
  active: 'Active',

  cuisineAny: 'Any',
  cuisineNorthIndian: 'North Indian',
  cuisineSouthIndian: 'South Indian',
  cuisineMughlai: 'Mughlai',
  cuisineKerala: 'Kerala / Coastal',
  cuisineItalian: 'Italian',
  cuisineMexican: 'Mexican',
  cuisineEastAsian: 'East Asian',
  cuisineMediterranean: 'Mediterranean',

  optionLabel: 'Option',
  aiGeneratedRecipe: 'AI-Generated Recipe',
  instructions: 'Instructions',
  smartSubstitutions: 'Smart Substitutions',
  pantryImpact: 'Pantry impact',
  iCookedThis: 'I Cooked This!',
  dismiss: 'Dismiss',
  pantryImpactFallback: units =>
    `Clicking I Cooked This! will deduct one serving of each ingredient (${units}).`,
};

const hi: Translations = {
  appSubtitle: 'जो है उससे बनाएं जो चाहते हैं',
  hackathonBadge: 'Swecha AI Hackathon',

  digitalPantry: 'डिजिटल पैंट्री',
  mealCustomizer: 'भोजन कस्टमाइज़र',
  recipeOptions: 'रेसिपी विकल्प',

  ingredientPlaceholder: 'उदा. चिकन, लहसुन, आटा…',
  add: 'जोड़ें',
  clearAll: 'सब हटाएं',
  pantryEmpty: 'आपकी पैंट्री खाली है',
  pantryEmptySub: 'रेसिपी खोजने के लिए ऊपर सामग्री जोड़ें',
  itemCount: n => `${n} ${n === 1 ? 'सामग्री' : 'सामग्रियां'}`,

  preparationTime: 'तैयारी का समय',
  numberOfPeople: 'लोगों की संख्या',
  personCount: n => `${n} ${n === 1 ? 'व्यक्ति' : 'लोग'}`,
  dietaryPreferences: 'आहार प्राथमिकताएं',
  preferredCuisine: 'पसंदीदा व्यंजन',
  craving: 'अभी क्या खाने का मन है?',
  cravingPlaceholder: 'उदा. कुछ गर्म और आरामदायक, मसालेदार नूडल्स…',

  findRecipesBtn: n => n > 1 ? `${n} के लिए रेसिपी खोजें` : 'रेसिपी खोजें',
  generatingRecipes: '3 रेसिपी बनाई जा रही हैं…',

  couldNotGenerate: 'रेसिपी नहीं बन सकी',
  cookingInProgress: 'पक रहा है…',
  noRecipesFound: 'कोई रेसिपी नहीं मिली',

  vegetarian: 'शाकाहारी',
  vegan: 'वीगन',
  glutenFree: 'ग्लूटन-मुक्त',
  highProtein: 'उच्च-प्रोटीन',
  lowCarb: 'कम-कार्ब',
  active: 'सक्रिय',

  cuisineAny: 'कोई भी',
  cuisineNorthIndian: 'उत्तर भारतीय',
  cuisineSouthIndian: 'दक्षिण भारतीय',
  cuisineMughlai: 'मुगलई',
  cuisineKerala: 'केरल / तटीय',
  cuisineItalian: 'इटालियन',
  cuisineMexican: 'मेक्सिकन',
  cuisineEastAsian: 'पूर्व एशियाई',
  cuisineMediterranean: 'भूमध्यसागरीय',

  optionLabel: 'विकल्प',
  aiGeneratedRecipe: 'AI-जनरेटेड रेसिपी',
  instructions: 'निर्देश',
  smartSubstitutions: 'स्मार्ट विकल्प',
  pantryImpact: 'पैंट्री प्रभाव',
  iCookedThis: 'मैंने यह बनाया!',
  dismiss: 'बंद करें',
  pantryImpactFallback: units =>
    `"मैंने यह बनाया!" दबाने पर प्रत्येक सामग्री से एक सर्विंग घटाई जाएगी (${units}).`,
};

const ml: Translations = {
  appSubtitle: 'ഉള്ളതുകൊണ്ട് ഇഷ്ടമുള്ളത് ഉണ്ടാക്കൂ',
  hackathonBadge: 'Swecha AI Hackathon',

  digitalPantry: 'ഡിജിറ്റൽ പാൻട്രി',
  mealCustomizer: 'ഭക്ഷണ കസ്റ്റമൈസർ',
  recipeOptions: 'റെസിപ്പി ഓപ്ഷനുകൾ',

  ingredientPlaceholder: 'ഉദാ. ചിക്കൻ, വെളുത്തുള്ളി, മാവ്…',
  add: 'ചേർക്കുക',
  clearAll: 'എല്ലാം മായ്ക്കുക',
  pantryEmpty: 'നിങ്ങളുടെ പാൻട്രി ശൂന്യമാണ്',
  pantryEmptySub: 'റെസിപ്പി കണ്ടെത്താൻ മുകളിൽ ചേർക്കുക',
  itemCount: n => `${n} ${n === 1 ? 'ഇനം' : 'ഇനങ്ങൾ'}`,

  preparationTime: 'തയ്യാറാക്കൽ സമയം',
  numberOfPeople: 'ആളുകളുടെ എണ്ണം',
  personCount: n => `${n} ${n === 1 ? 'വ്യക്തി' : 'ആളുകൾ'}`,
  dietaryPreferences: 'ഭക്ഷണ മുൻഗണനകൾ',
  preferredCuisine: 'ഇഷ്ടപ്പെട്ട ഭക്ഷണരീതി',
  craving: 'ഇപ്പോൾ എന്ത് കഴിക്കണം?',
  cravingPlaceholder: 'ഉദാ. ചൂടുള്ളത്, മസാല നൂഡിൽസ്, ഹൽക്കൽ സലാഡ്…',

  findRecipesBtn: n => n > 1 ? `${n} പേർക്ക് റെസിപ്പി` : 'റെസിപ്പി കണ്ടെത്തുക',
  generatingRecipes: '3 റെസിപ്പികൾ തയ്യാറാക്കുന്നു…',

  couldNotGenerate: 'റെസിപ്പി ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല',
  cookingInProgress: 'പാകം ചെയ്യുന്നു…',
  noRecipesFound: 'റെസിപ്പി കണ്ടെത്തിയില്ല',

  vegetarian: 'സസ്യഭക്ഷണം',
  vegan: 'വീഗൻ',
  glutenFree: 'ഗ്ലൂറ്റൻ-മുക്തം',
  highProtein: 'ഉയർന്ന പ്രോട്ടീൻ',
  lowCarb: 'കുറഞ്ഞ കാർബ്',
  active: 'സജീവം',

  cuisineAny: 'ഏതും',
  cuisineNorthIndian: 'നോർത്ത് ഇന്ത്യൻ',
  cuisineSouthIndian: 'സൗത്ത് ഇന്ത്യൻ',
  cuisineMughlai: 'മുഗൾ',
  cuisineKerala: 'കേരള / തീരദേശം',
  cuisineItalian: 'ഇറ്റാലിയൻ',
  cuisineMexican: 'മെക്സിക്കൻ',
  cuisineEastAsian: 'കിഴക്കൻ ഏഷ്യൻ',
  cuisineMediterranean: 'മെഡിറ്ററേനിയൻ',

  optionLabel: 'ഓപ്ഷൻ',
  aiGeneratedRecipe: 'AI-നിർമ്മിത റെസിപ്പി',
  instructions: 'നിർദ്ദേശങ്ങൾ',
  smartSubstitutions: 'സ്മാർട്ട് പകരക്കാർ',
  pantryImpact: 'പാൻട്രി സ്വാധീനം',
  iCookedThis: 'ഞാൻ ഇത് പാകം ചെയ്തു!',
  dismiss: 'നിരസിക്കുക',
  pantryImpactFallback: units =>
    `"ഞാൻ ഇത് പാകം ചെയ്തു!" അമർത്തിയാൽ ഓരോ ചേരുവയിൽ നിന്നും ഒരു സർവ്വിംഗ് കുറയ്ക്കും (${units}).`,
};

export const translations: Record<Language, Translations> = { en, hi, ml };
