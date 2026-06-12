# Changelog

All notable changes to PantryChef AI are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Releases from v0.2.0 onward are generated automatically by [git-cliff](https://git-cliff.org/) via the CI pipeline using `cliff.toml`.

---

## [0.1.0] — 2026-06-12

### Features

- Unit-aware digital pantry — track ingredients with quantities and units (g, kg, ml, L, pcs, cups)
- In-browser recipe matching engine scores ~13k recipes in under 5 ms
- AI recipe generation via Groq (`llama-3.3-70b-versatile`) — returns 3 tailored recipe cards
- Smart ingredient substitutions for missing accent ingredients
- Servings-aware portion scaling (150–200 g protein, 50–100 g grains, 80–150 g veg per person)
- Dietary filters: vegetarian, vegan, gluten-free, high-protein, low-carb
- Regional cuisine adaptation: Indian, Italian, Mexican, East Asian, Mediterranean
- Pantry impact preview per recipe card before committing
- "I Cooked This!" one-tap pantry deduction
- Multi-provider AI support — BYOK (Groq / OpenAI) + Ollama local inference
- Multi-language UI: English, Hindi, Malayalam
- Zero-backend persistence via `localStorage`
