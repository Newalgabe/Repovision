# repovision

See inside any GitHub repo. Get a full architectural breakdown with plain-English explanations — no sign-up, no config.

![screenshot](https://img.shields.io/badge/status-working-brightgreen)

## How it works

1. Paste a GitHub repo URL (or click an example)
2. Server fetches the repo tree, README, and package.json via the GitHub API
3. The analyzer detects the project type, frameworks, dependencies, architecture pattern, entry points, and directory structure
4. Returns a rich narrative with three sections:

   - **What Is This?** — project description, features from README
   - **What Does It Use?** — every dependency grouped by purpose (Testing, Auth, Database, CLI, etc.) with descriptions of what each library does
   - **How Is It Organized?** — architecture pattern, top-level directories with file counts, entry points, key component breakdown

Plus: language distribution bars, interactive file tree, key components grid, and repo stats.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | No | — | GitHub personal access token. Without it you get 60 requests/hour (shared IP). With a token you get 5,000. [Create one here](https://github.com/settings/tokens) — no special scopes needed for public repos. |
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
├── app.js            Express app (routes, middleware), exported for Vercel
├── server.js         Imports app.js and listens (local dev only)
├── api/index.js      Re-exports app.js for Vercel serverless
├── vercel.json       Routes all traffic to api/index.js
├── analyzer.js       GitHub API client, README parser, dependency categorizer,
│                     architecture pattern detector, narrative generator
└── public/
    ├── index.html    Single-page app
    ├── styles.css    Dark-theme UI
    └── app.js        Frontend logic, interactive tree viewer
```

## Architecture

The analyzer (`analyzer.js`) uses rule-based inference — no AI API calls. It:

- Fetches the full recursive git tree from GitHub's API
- Reads `package.json` to detect dependencies and frameworks
- Parses `README.md` to extract descriptions and feature lists
- Matches directory names against known architecture patterns (MVC, Component-Based, Monorepo, Serverless, etc.)
- Maps 50+ well-known packages to categories with plain-English descriptions
- Generates a structured narrative from all of this data

The frontend renders the result as expandable cards with styled lists, code highlights, and an interactive file explorer.

## Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JS, CSS custom properties
- **API:** GitHub REST API (unauthenticated or token-authenticated)
