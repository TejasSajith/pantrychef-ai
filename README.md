<<<<<<< HEAD
# PantryChef AI

### An AI-powered, data-driven kitchen utility that turns what you already own into what you want to eat.

> Built for the **Swecha AI Hackathon** · Full-stack Next.js 14 · Deployed on Vercel

---

## The Problem

Every kitchen has the same three friction points:

| Pain Point | Reality |
|---|---|
| **Food Waste** | 30–40% of the food supply is wasted globally. Most of it starts in the home fridge. |
| **Ingredient Overwhelm** | Recipes online assume a fully-stocked pantry. Real life doesn't. |
| **Dynamic Restrictions** | Dietary constraints — allergies, preferences, what's expired — change meal to meal. |

PantryChef AI solves this by inverting the workflow: instead of finding a recipe and then shopping, you log what you *already have*, and the system builds the recipe around *you*.

---

## Core Features

### 1. Digital Pantry Tracker
Add, edit, and remove ingredients through a clean tag-input interface. Your pantry persists across sessions via `localStorage` — no account, no backend, no friction.

### 2. Kaggle Dataset Intersection Engine
A local, in-browser scoring algorithm scans a pre-parsed Kaggle recipe dataset (~13k rows) and ranks recipes by ingredient overlap with your pantry. Runs in under 5 ms. No API call, no server cost.

### 3. Dynamic Constraint-Based AI Recipe Modifier
Top matches are sent to Claude (Haiku) via a tightly-engineered prompt. The AI returns a structured recipe card — steps, timing, and targeted substitutions for every ingredient you're missing. Responds in under 8 seconds.

### 4. "Cooked It!" State Decrement Loop
Mark a recipe as cooked and the app automatically decrements the used ingredients from your pantry. Your pantry stays accurate without any manual editing, making the next recommendation immediately more relevant.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | Full-stack React, file-based routing, API routes |
| **Language** | TypeScript | End-to-end type safety across data, UI, and API |
| **Styling** | Tailwind CSS | Utility-first, mobile-first UI composition |
| **Data** | Kaggle CSV → pre-built `recipes.json` | Local dataset, parsed once at build time |
| **AI** | Claude API (`claude-haiku-4-5`) | Fast structured JSON recipe generation |
| **Persistence** | Browser `localStorage` | Zero-backend pantry state |
| **Deployment** | Vercel | Serverless edge hosting, env var management |

---

## Getting Started

### Prerequisites

- Node.js `>=18.0.0`
- An [Anthropic API key](https://console.anthropic.com/)
- The Kaggle recipe dataset (see Step 3 below)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/pantrychefai.git
cd pantrychefai
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

---

### Step 3 — Add the Kaggle Dataset

1. Download the **Food Ingredients and Recipes Dataset** from Kaggle.
2. Unzip the archive.
3. Place the CSV file at the following path in the project:

```
public/
└── data/
    └── recipes.csv      ← place the file here
```

4. Run the one-time build script to convert the CSV into the optimized JSON format the app reads:

```bash
npm run build:data
```

This generates `data/recipes.json` and only needs to be run once (or when the dataset changes).

---

### Step 4 — Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your key:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> Your API key is never exposed to the browser. It is read exclusively by the Vercel serverless function at `app/api/recipe/route.ts`.

---

### Step 5 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Hackathon Timeline

### Day 1 — Foundation & Local Parsing

| Time Block | Task | Deliverable |
|---|---|---|
| 09:00 – 10:00 | Project scaffold + TypeScript config | Bootstrapped Next.js 14 app |
| 10:00 – 11:30 | Define all shared types & interfaces | `lib/types.ts` complete |
| 11:30 – 13:00 | CSV → JSON conversion script | `data/recipes.json` generated |
| 13:00 – 14:00 | *Lunch break* | — |
| 14:00 – 15:30 | Local matcher algorithm | `lib/matcher.ts` + console-tested |
| 15:30 – 17:00 | `localStorage` pantry helpers | `lib/pantry.ts` complete |
| 17:00 – 18:30 | `PantryInput` tag component | Ingredient add/remove UI working |
| 18:30 – 20:00 | Wire `page.tsx` — input → raw match cards | End-to-end local flow working |

### Day 2 — AI Integration, Polish & Vercel Deployment

| Time Block | Task | Deliverable |
|---|---|---|
| 09:00 – 10:30 | Prompt engineering + `lib/prompt.ts` | Tested prompt, JSON output confirmed |
| 10:30 – 12:00 | `/api/recipe` serverless route | Claude integration live locally |
| 12:00 – 13:00 | `RecipeCard` AI enrichment + loading state | Animated card with steps & substitutions |
| 13:00 – 14:00 | *Lunch break* | — |
| 14:00 – 15:00 | `MatchBadge` component | Match %, missing items displayed |
| 15:00 – 16:30 | "Cooked It!" decrement loop | Pantry auto-updates after cooking |
| 16:30 – 17:30 | Tailwind polish — mobile-first layout | Presentation-ready UI |
| 17:30 – 18:30 | Deploy to Vercel, set env vars, smoke test | Live production URL |
| 18:30 – 20:00 | Buffer — edge case fixes, demo prep | Submission-ready |

---

## Project Structure

```
pantrychefai/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/recipe/route.ts
├── components/
│   ├── PantryInput.tsx
│   ├── RecipeCard.tsx
│   └── MatchBadge.tsx
├── lib/
│   ├── matcher.ts
│   ├── pantry.ts
│   ├── prompt.ts
│   └── types.ts
├── data/
│   └── recipes.json          # generated — do not edit manually
├── public/data/
│   └── recipes.csv           # Kaggle source — not committed
├── scripts/
│   └── build-data.ts
├── .env.local                # not committed
├── .env.example
├── spec.md
└── README.md
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start local development server at `localhost:3000` |
| `npm run build` | Production build for Vercel |
| `npm run build:data` | One-time CSV → JSON dataset conversion |
| `npm run lint` | ESLint check across the project |

---

## Contributing

This project was built under hackathon conditions. If you're extending it post-event:

1. Fork the repo and create a feature branch off `main`.
2. Keep the local matcher pure — no network calls, no side effects.
3. Any new AI prompt changes must be benchmarked to stay under 8 s on Vercel's free tier.
4. Open a PR with a clear description of what changed and why.

---

## License

MIT © 2026 — Built at the Swecha AI Hackathon.
=======
# pantrychefai



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://code.swecha.org/t_sajith/pantrychefai.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://code.swecha.org/t_sajith/pantrychefai/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> 9b0cd1c102657fcc77ced8f626ae7a900f3bd545
