# PantryChef AI — User Manual

## What is PantryChef AI?

PantryChef AI turns the ingredients you already own into recipe suggestions. You tell it what's in your pantry, it scores thousands of recipes locally in your browser, and then uses AI to generate three fully tailored recipe cards — with step-by-step instructions, smart substitutions for missing items, and an exact preview of what will be deducted from your pantry.

---

## Getting started

### 1. Open the app

Visit the live URL or run locally:

```bash
npm install && npm run dev
# open http://localhost:3000
```

### 2. Add ingredients to your pantry

- Type an ingredient name in the **Add ingredient** field
- Set the **quantity** and **unit** (g, kg, ml, L, pcs, cups)
- Press **Add** or hit Enter
- Repeat for all ingredients you have on hand

Your pantry is saved automatically in your browser — no account needed.

### 3. Configure your meal

| Setting             | Options                                                  |
| ------------------- | -------------------------------------------------------- |
| **Servings**        | 1 – 10 people                                            |
| **Dietary filters** | Vegetarian, Vegan, Gluten-free, High-protein, Low-carb   |
| **Cuisine**         | Any, Indian, Italian, Mexican, East Asian, Mediterranean |
| **Max prep time**   | 15 min, 30 min, 45 min, 60 min+                          |

### 4. Generate recipes

Click **Find Recipes**. The app will:

1. Score ~13,000 recipes against your pantry in your browser (< 5 ms)
2. Send the top candidates to the AI
3. Display three recipe cards with full instructions

### 5. Review a recipe card

Each card shows:

- **Recipe name and description**
- **Ingredients** — with a tick for what you have and a swap suggestion for what you don't
- **Pantry impact preview** — exactly which items will be deducted and by how much
- **Step-by-step instructions**

### 6. Mark as cooked

Click **I Cooked This!** on any recipe card to deduct the exact ingredient amounts from your pantry. The next recipe search will reflect your updated pantry.

---

## Changing the AI provider

Click the **AI Settings** panel to switch between:

| Provider           | Requirements                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| **Groq** (default) | Free Groq API key from [console.groq.com](https://console.groq.com/keys) |
| **OpenAI**         | OpenAI API key                                                           |
| **Ollama**         | Ollama running locally on port 11434                                     |

Enter your API key in the field provided — it is stored only in your browser and never sent to our servers.

---

## Changing the language

Use the language selector in the top bar to switch between **English**, **Hindi**, and **Malayalam**.

---

## Managing your pantry

| Action        | How                                                   |
| ------------- | ----------------------------------------------------- |
| Edit quantity | Click the quantity field on any pantry item           |
| Remove item   | Click the × button next to the item                   |
| Clear pantry  | Click **Clear all** at the bottom of the pantry panel |

---

## Frequently asked questions

**My recipes don't match what I expected.**
The matcher works on ingredient name tokens — "olive oil" and "extra virgin olive oil" both match "olive". Very generic items like "salt" or "water" appear in almost every recipe and have less influence on ranking.

**The AI is slow or times out.**
The Groq free tier has a 20-second timeout. Try regenerating — model availability varies. Switching to Ollama gives unlimited local inference with no timeout.

**My pantry disappeared.**
PantryChef AI uses `localStorage`. Clearing your browser data or using a private/incognito window will reset the pantry.

**Can I use this offline?**
The recipe matching runs fully offline in your browser. AI generation requires an internet connection (unless you use Ollama locally).
