# repovision

See inside any GitHub repo. Get a full architectural breakdown with plain-English explanations — no sign-up, no config.

**Try it:** [repovision-alpha.vercel.app](https://repovision-alpha.vercel.app)

![status](https://img.shields.io/badge/status-working-brightgreen)

## How it works

1. Paste a GitHub repo URL (or click an example)
2. Server fetches the repo tree, README, and package.json via the GitHub API
3. The analyzer detects the project type, frameworks, dependencies, architecture pattern, entry points, and directory structure
4. Returns a rich narrative with three sections:

   - **What Is This?** — project description, features from README
   - **What Does It Use?** — every dependency grouped by purpose (Testing, Auth, Database, CLI, etc.) with descriptions of what each library does
   - **How Is It Organized?** — architecture pattern, top-level directories with file counts, entry points, key component breakdown

Plus: language distribution bars, interactive file tree, key components grid, deep file scan, and repo stats.

## Features

- **Compare mode** — analyze two repos side by side with a diff table
- **Theme toggle** — switch between dark and light mode (persisted in localStorage)
- **Collapsible cards** — expand/collapse each section of the analysis
- **Deep file scan** — reads the most important files and extracts exports, routes, classes, and functions
- **Dependency graph** — interactive force-directed graph showing how files connect (local vs. external imports)
- **GitHub OAuth** — sign in with your GitHub account to use your own rate limit (5,000 req/hr)
- **Trending repos** — fetched from GitHub's API, one-click to analyze
- **Keyboard shortcuts** — press `?` to see all shortcuts
- **History** — last 8 repos shown as clickable pills below the input
- **Export Markdown** — copy the full analysis as Markdown
- **Share via URL** — copy a `?repo=` link that auto-runs on page load
- **Rate-limit aware** — 5,000 req/hr with a token; descriptive error when hitting the 60 req/hr limit without one

## Quick start

```bash
npm install
cp .env.example .env    # edit .env and add your GITHUB_TOKEN
npm start
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | No | — | GitHub personal access token. Without it you get 60 requests/hour (shared IP). With a token you get 5,000. [Create one here](https://github.com/settings/tokens) — no special scopes needed for public repos. |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth App client ID. Enables "Sign in with GitHub" so users can use their own rate limit. |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth App client secret. |
| `SESSION_SECRET` | No | `repovision-dev-secret...` | Session encryption key. Set a random string in production. |
| `PORT` | No | `3000` | Server port |

## Deploy to Vercel

Anyone can use the deployed version without needing their own token — you set `GITHUB_TOKEN` as a Vercel environment variable and it stays server-side.

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo in the Vercel dashboard. The `api/index.js` entry point is auto-detected. Add `GITHUB_TOKEN` in Project → Settings → Environment Variables.

## Project structure

```
├── .env.example      Copy to .env and add your GITHUB_TOKEN
├── app.js            Express app (routes, middleware), exported for Vercel
├── server.js         Imports app.js and listens (local dev only)
├── api/index.js      Re-exports app.js for Vercel serverless
├── vercel.json       Routes all traffic to api/index.js
├── analyzer.js       GitHub API client, README parser, dependency categorizer,
│                     architecture pattern detector, narrative generator
└── public/
    ├── index.html    Single-page app
    ├── styles.css    Dark/light theme UI (CSS custom properties)
    └── app.js        Frontend logic, interactive tree viewer
```

## Architecture

The analyzer (`analyzer.js`) uses rule-based inference — no AI API calls. It:

- Fetches the full recursive git tree from GitHub's API
- Reads `package.json` to detect dependencies and frameworks
- Parses `README.md` to extract descriptions and feature lists
- Matches directory names against known architecture patterns (MVC, Component-Based, Monorepo, Serverless, etc.)
- Maps 50+ well-known packages to categories with plain-English descriptions
- Scores all files by importance and deep-scans the top 8 for exports/routes/classes/functions
- Generates a structured narrative from all of this data

The frontend renders the result as collapsible cards with styled lists, code highlights, an interactive file explorer, a light/dark theme toggle, and a force-directed dependency graph.

## Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JS, CSS custom properties
- **API:** GitHub REST API (unauthenticated or token-authenticated)
