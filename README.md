# PantryChef AI 🍳

**PantryChef AI turns what you already own into what you want to eat.** You log the
ingredients in your pantry — with exact quantities and units — and the app scores
a ~13,000-recipe Kaggle dataset locally, then sends the best candidates to an LLM
that generates three fully tailored recipe cards with instructions, smart
substitutions, portion-aware quantities, and a live pantry-deduction preview.

It is a single **Next.js** web app that runs entirely in the browser for all
matching logic, with one serverless function for AI generation, deployed on
**Vercel**.

🔗 **Live app:** *(coming soon — hackathon deployment in progress)*

---

## Features

- 🫙 **Unit-aware digital pantry** — track ingredients with real units (g, kg, ml, L, pcs, cups); quantities auto-step to sensible increments per unit
- ⚡ **Instant local matching** — in-browser engine scores ~13k recipes against your pantry in under 5 ms; no API call, no server cost
- 🤖 **AI recipe generation** — top 6 dataset matches sent to `llama-3.3-70b-versatile` (Groq); the model picks the 3 best dishes whose structural bases you actually have
- 🧂 **Smart substitutions** — AI suggests pantry-staple swaps for missing accent ingredients; structural bases (eggs, rice, pasta…) are never substituted
- 🍽️ **Servings-aware portions** — per-person caps enforced (150–200 g protein, 50–100 g grains, 80–150 g veg); total quantities scale with headcount
- 🥗 **Dietary filters** — vegetarian, vegan, gluten-free, high-protein, low-carb
- 🌍 **Cuisine adaptation** — Indian, Italian, Mexican, East Asian, Mediterranean, or Any; all three recipes adapt to the chosen regional profile
- 📋 **Pantry impact preview** — each recipe card shows exactly which items will be deducted and by how much (with units) before you commit
- ✅ **"I Cooked This!"** — one tap deducts the AI's exact ingredient amounts from your pantry so the next recommendation is immediately more relevant
- 💾 **Zero-backend persistence** — pantry state lives in `localStorage`; no account, no sign-up

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16**, **React 19**, **TypeScript** |
| Styling | **Tailwind CSS v4** |
| AI | **Groq SDK** — `llama-3.3-70b-versatile` |
| Recipe dataset | Kaggle CSV → pre-built `cleaned_recipes.json` (~13k recipes) |
| Persistence | Browser `localStorage` |
| Hosting | **Vercel** (serverless function for AI route) |

---

## Project structure

```
pantrychefai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # root layout + metadata
│   │   ├── page.tsx                          # main UI — pantry + meal customizer
│   │   ├── globals.css
│   │   └── api/generate-recipe/route.ts      # POST → Groq (llama-3.3-70b)
│   ├── components/
│   │   └── RecipeDisplay.tsx                 # tabbed 3-recipe card + pantry impact
│   ├── lib/
│   │   ├── pantry.ts                         # localStorage helpers + unit-aware arithmetic
│   │   └── types.ts                          # all shared TypeScript interfaces
│   └── utils/
│       └── recipeMatcher.ts                  # local scoring engine (pure, no I/O)
├── public/data/
│   └── cleaned_recipes.json                  # pre-built from Kaggle CSV — do not edit
├── scripts/
│   └── mergeData.ts                          # one-time CSV → JSON conversion
├── spec.md                                   # original technical specification
├── .env.local                                # GROQ_API_KEY (not committed)
└── package.json
```

---

## Installation

### Prerequisites
- **Node.js 20+** and npm
- A free **Groq API key** at <https://console.groq.com/keys>

### 1. Clone and install dependencies
```bash
git clone https://code.swecha.org/t_sajith/pantrychefai.git
cd pantrychefai
npm install
```

### 2. Configure environment variables
Create `.env.local` in the project root:
```bash
cp .env.example .env.local   # or create the file manually
```
```
GROQ_API_KEY=gsk_...
```
> ⚠️ Never commit `.env.local`. The key is read only by the serverless function and is never exposed to the browser.

### 3. Start the development server
```bash
npm run dev
```
Open <http://localhost:3000> in your browser.

---

## Usage

### Development
```bash
npm run dev       # start local server at localhost:3000
npm run build     # production build
npm run start     # serve the production build locally
npm run lint      # ESLint check
```

### Rebuilding the recipe dataset
The Kaggle CSV has already been converted and committed as
`public/data/cleaned_recipes.json`. Only re-run this if you want to swap in a
different dataset:
```bash
npm run db:build  # scripts/mergeData.ts → public/data/cleaned_recipes.json
```

### Deploy to Vercel
```bash
vercel login
vercel link
vercel env add GROQ_API_KEY production   # paste your gsk_... key
vercel --prod
```

---

## How it works

```
Browser
  ├─ Digital Pantry (localStorage)
  │     User adds ingredients with quantities + units
  │
  ├─ Local Matcher (recipeMatcher.ts — runs in-browser, <5 ms)
  │     Scores ~13k recipes by token-level ingredient overlap
  │     Normalises plurals, stop words, and compound names
  │     Returns top 6 candidates (matchCount DESC, missingItems.length ASC)
  │
  └─ POST /api/generate-recipe
          ↓
Vercel Serverless Function (route.ts)
  ├─ Validates pantry payload + dietary/cuisine/serving constraints
  ├─ Annotates candidates whose structural base is absent (⚠ SKIP)
  ├─ Builds a structured prompt with exact pantry quantities
  └─ Calls Groq (llama-3.3-70b-versatile, 20 s timeout)
          ↓
        JSON { recipes: [ ... × 3 ] }
          ↓
Browser
  └─ RecipeDisplay.tsx renders tabbed cards with instructions,
     substitutions, and unit-aware pantry impact preview
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/my-change`
2. Keep the local matcher pure — no network calls, no side effects.
3. AI prompt changes must stay within the 20 s Groq timeout on Vercel's free tier.
4. Push the branch and open a **Merge Request** into `main`.

---

## Contributors

| Contributor | Role |
|---|---|
| **Tejas Sajith** ([@t_sajith](https://code.swecha.org/t_sajith)) | Full-stack — pantry UI, local matcher, Groq integration, recipe display |

---

## License

MIT © 2026 — Built at the **Swecha AI Hackathon**.
