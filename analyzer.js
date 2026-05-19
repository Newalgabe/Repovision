const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

let sessionToken = '';
function setToken(token) { sessionToken = token; }
function githubHeaders(token) {
  const headers = { 'User-Agent': 'repovision/1.0' };
  const t = token || sessionToken || GITHUB_TOKEN;
  if (t) headers['Authorization'] = `Bearer ${t}`;
  return headers;
}

// ── Rate limit tracking ──
let lastRateLimit = { remaining: null, limit: null, reset: null };
function getRateLimit() { return { ...lastRateLimit }; }
function resetRateLimit() { lastRateLimit = { remaining: null, limit: null, reset: null }; }

// ── In-memory cache with TTL ──
const cacheStore = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cacheStore.set(key, { data, ts: Date.now() });
}

function cacheKey(owner, repo, type) {
  return `${owner}/${repo}/${type}`;
}

const FRAMEWORK_SIGNATURES = [
  { dep: 'react', name: 'React', type: 'frontend', desc: 'UI component library for building interactive interfaces' },
  { dep: 'vue', name: 'Vue.js', type: 'frontend', desc: 'Progressive frontend framework for building UIs' },
  { dep: 'next', name: 'Next.js', type: 'fullstack', desc: 'React framework with SSR, SSG, and API routes' },
  { dep: 'nuxt', name: 'Nuxt.js', type: 'fullstack', desc: 'Vue framework with SSR and static generation' },
  { dep: 'express', name: 'Express.js', type: 'backend', desc: 'HTTP server and routing middleware for Node.js' },
  { dep: 'fastify', name: 'Fastify', type: 'backend', desc: 'Fast and low-overhead Node.js web framework' },
  { dep: 'django', name: 'Django', type: 'backend', desc: 'High-level Python web framework with batteries included' },
  { dep: 'flask', name: 'Flask', type: 'backend', desc: 'Lightweight Python web framework' },
  { dep: 'spring-boot', name: 'Spring Boot', type: 'backend', desc: 'Java framework for production-grade Spring applications' },
  { dep: 'rails', name: 'Ruby on Rails', type: 'fullstack', desc: 'Full-stack Ruby web framework with convention-over-configuration' },
  { dep: 'laravel', name: 'Laravel', type: 'fullstack', desc: 'PHP web framework with expressive syntax' },
  { dep: 'gatsby', name: 'Gatsby', type: 'frontend', desc: 'React-based static site generator' },
  { dep: 'svelte', name: 'Svelte', type: 'frontend', desc: 'Compiled frontend framework for building UIs' },
  { dep: 'angular', name: 'Angular', type: 'frontend', desc: 'TypeScript-based web application framework' },
  { dep: 'tensorflow', name: 'TensorFlow', type: 'ml', desc: 'Machine learning platform for building and training models' },
  { dep: 'torch', name: 'PyTorch', type: 'ml', desc: 'Deep learning framework with dynamic computation graphs' },
  { dep: 'tailwindcss', name: 'Tailwind CSS', type: 'css', desc: 'Utility-first CSS framework' },
  { dep: 'bootstrap', name: 'Bootstrap', type: 'css', desc: 'CSS framework with pre-built responsive components' },
  { dep: 'prisma', name: 'Prisma', type: 'database', desc: 'Next-gen ORM for Node.js and TypeScript' },
  { dep: 'typeorm', name: 'TypeORM', type: 'database', desc: 'ORM for TypeScript and JavaScript' },
  { dep: 'mongoose', name: 'Mongoose', type: 'database', desc: 'MongoDB object modeling for Node.js' },
  { dep: 'sequelize', name: 'Sequelize', type: 'database', desc: 'SQL ORM for Node.js' },
  { dep: 'redis', name: 'Redis', type: 'database', desc: 'In-memory data structure store' },
  { dep: 'jest', name: 'Jest', type: 'test', desc: 'JavaScript testing framework' },
  { dep: 'mocha', name: 'Mocha', type: 'test', desc: 'JavaScript test framework' },
  { dep: 'vitest', name: 'Vitest', type: 'test', desc: 'Vite-native test runner' },
  { dep: 'cypress', name: 'Cypress', type: 'test', desc: 'End-to-end testing framework' },
  { dep: 'eslint', name: 'ESLint', type: 'tooling', desc: 'JavaScript linter for code quality' },
  { dep: 'prettier', name: 'Prettier', type: 'tooling', desc: 'Opinionated code formatter' },
  { dep: 'webpack', name: 'Webpack', type: 'build', desc: 'Static module bundler' },
  { dep: 'vite', name: 'Vite', type: 'build', desc: 'Fast frontend build tool' },
  { dep: 'esbuild', name: 'esbuild', type: 'build', desc: 'Extremely fast JavaScript bundler' },
  { dep: 'typescript', name: 'TypeScript', type: 'language', desc: 'Typed superset of JavaScript' },
  { dep: 'axios', name: 'Axios', type: 'http', desc: 'Promise-based HTTP client' },
  { dep: 'graphql', name: 'GraphQL', type: 'api', desc: 'API query language and runtime' },
  { dep: 'apollo', name: 'Apollo', type: 'api', desc: 'GraphQL client/server implementation' },
  { dep: 'socket.io', name: 'Socket.IO', type: 'realtime', desc: 'Real-time bidirectional event-based communication' },
  { dep: 'passport', name: 'Passport', type: 'auth', desc: 'Authentication middleware for Node.js' },
  { dep: 'jsonwebtoken', name: 'JWT', type: 'auth', desc: 'JSON Web Token implementation' },
  { dep: 'bcrypt', name: 'bcrypt', type: 'auth', desc: 'Password hashing library' },
  { dep: 'lodash', name: 'Lodash', type: 'util', desc: 'Utility library for common programming tasks' },
  { dep: 'moment', name: 'Moment.js', type: 'util', desc: 'Date parsing and formatting library' },
  { dep: 'dayjs', name: 'Day.js', type: 'util', desc: 'Lightweight date manipulation library' },
  { dep: 'date-fns', name: 'date-fns', type: 'util', desc: 'Modern JavaScript date utility library' },
  { dep: 'uuid', name: 'UUID', type: 'util', desc: 'Universally unique identifier generation' },
  { dep: 'dotenv', name: 'dotenv', type: 'config', desc: 'Environment variable loader from .env files' },
  { dep: 'commander', name: 'Commander.js', type: 'cli', desc: 'Command-line interface parser' },
  { dep: 'yargs', name: 'Yargs', type: 'cli', desc: 'Command-line argument parser' },
  { dep: 'playwright', name: 'Playwright', type: 'test', desc: 'Browser automation and testing framework' },
  { dep: 'puppeteer', name: 'Puppeteer', type: 'test', desc: 'Headless Chrome browser automation' },
];

const LANGUAGE_MAP = {
  js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript', tsx: 'React TSX',
  py: 'Python', rb: 'Ruby', rs: 'Rust', go: 'Go', java: 'Java',
  kt: 'Kotlin', swift: 'Swift', vue: 'Vue', css: 'CSS', scss: 'SCSS',
  html: 'HTML', json: 'JSON', yml: 'YAML', yaml: 'YAML', md: 'Markdown',
  sql: 'SQL', sh: 'Shell', dockerfile: 'Dockerfile', tf: 'Terraform',
  cs: 'C#', cpp: 'C++', c: 'C', dart: 'Dart', php: 'PHP',
  r: 'R', scala: 'Scala', toml: 'TOML', xml: 'XML',
};

const ARCH_PATTERNS = [
  { keywords: ['controller', 'view', 'model'], name: 'MVC (Model-View-Controller)', desc: 'Separates data logic, presentation, and user input handling' },
  { keywords: ['service', 'repository', 'controller'], name: 'Layered Architecture', desc: 'Organizes code into horizontal layers with distinct responsibilities' },
  { keywords: ['component', 'container', 'page'], name: 'Component-Based', desc: 'UI built from reusable, self-contained components' },
  { keywords: ['module', 'feature'], name: 'Modular Architecture', desc: 'Code grouped by feature or domain concern' },
  { keywords: ['middleware', 'route', 'handler'], name: 'Middleware Pipeline', desc: 'Request processing through a chain of middleware functions' },
  { keywords: ['packages', 'apps'], name: 'Monorepo', desc: 'Multiple related projects managed in a single repository' },
  { keywords: ['action', 'reducer', 'store'], name: 'Flux / Redux Pattern', desc: 'Unidirectional data flow with a central store' },
  { keywords: ['api', 'graphql', 'resolver'], name: 'API-First', desc: 'Designed around a defined API contract' },
  { keywords: ['plugin', 'extension'], name: 'Plugin Architecture', desc: 'Extensible core with pluggable modules' },
  { keywords: ['lambda', 'handler'], name: 'Serverless', desc: 'Function-as-a-Service event-driven architecture' },
];

function ext(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function classifyFile(name, path) {
  const e = ext(name);
  const lang = LANGUAGE_MAP[e] || e.toUpperCase() || 'Unknown';
  const lower = name.toLowerCase();

  if (lower === 'dockerfile') return { lang: 'Dockerfile', icon: '🐳', category: 'config' };
  if (lower === 'makefile') return { lang: 'Makefile', icon: '🔨', category: 'build' };
  if (['package.json', 'package-lock.json', 'yarn.lock'].includes(lower)) return { lang: 'JSON', icon: '📦', category: 'config' };
  if (['tsconfig.json', '.babelrc', '.eslintrc', '.prettierrc', 'jest.config.js', 'vite.config.js', 'vite.config.ts', 'next.config.js', 'webpack.config.js'].includes(lower)) return { lang, icon: '⚙️', category: 'config' };
  if (lower.endsWith('.config.js') || lower.endsWith('.config.ts')) return { lang, icon: '⚙️', category: 'config' };
  if (['readme.md'].includes(lower)) return { lang: 'Markdown', icon: '📖', category: 'docs' };
  if (lower === 'license' || lower === 'license.md') return { lang: 'Markdown', icon: '📜', category: 'meta' };
  if (lower === '.gitignore') return { lang: 'Config', icon: '🚫', category: 'config' };
  if (lower.endsWith('.test.js') || lower.endsWith('.test.ts') || lower.endsWith('.spec.js') || lower.endsWith('.spec.ts') || path.includes('test') || path.includes('__tests__')) return { lang, icon: '🧪', category: 'test' };
  if (lower.endsWith('.stories.js') || lower.endsWith('.stories.tsx')) return { lang, icon: '📚', category: 'storybook' };
  if (path.includes('component') || path.includes('components')) return { lang, icon: '🧩', category: 'component' };
  if (path.includes('api') || path.includes('routes') || path.includes('endpoint') || path.includes('router')) return { lang, icon: '🔌', category: 'api' };
  if (path.includes('util') || path.includes('helper') || path.includes('utils')) return { lang, icon: '🔧', category: 'util' };
  if (path.includes('model') || path.includes('entity') || path.includes('schema')) return { lang, icon: '📊', category: 'model' };
  if (path.includes('migration')) return { lang, icon: '🗄️', category: 'migration' };
  if (path.includes('hook') || path.includes('hooks')) return { lang, icon: '🪝', category: 'hooks' };
  if (path.includes('context')) return { lang, icon: '🌐', category: 'context' };
  if (path.includes('middleware')) return { lang, icon: '🔀', category: 'middleware' };
  if (path.includes('style') || path.includes('styles') || path.includes('css')) return { lang, icon: '🎨', category: 'style' };
  if (path.includes('type') || path.includes('types') || path.includes('interface')) return { lang, icon: '📐', category: 'types' };
  if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml') return { lang: 'YAML', icon: '🐳', category: 'infra' };
  if (path.includes('cli') || path.includes('command')) return { lang, icon: '💻', category: 'cli' };

  return { lang, icon: '📄', category: 'source' };
}

async function ghFetch(url, token) {
  const res = await fetch(url, { headers: githubHeaders(token) });
  const remaining = res.headers.get('x-ratelimit-remaining');
  const limit = res.headers.get('x-ratelimit-limit');
  const reset = res.headers.get('x-ratelimit-reset');
  if (remaining !== null) lastRateLimit.remaining = parseInt(remaining);
  if (limit !== null) lastRateLimit.limit = parseInt(limit);
  if (reset !== null) lastRateLimit.reset = parseInt(reset);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      if (body.message) detail = body.message;
    } catch {}
    if (res.status === 403 && !GITHUB_TOKEN) {
      throw new Error('GitHub API rate limit exceeded (60 req/hr without token). Set the GITHUB_TOKEN environment variable for 5000 req/hr.');
    }
    if (res.status === 401 && GITHUB_TOKEN) {
      throw new Error(`GitHub API 401 — your GITHUB_TOKEN is invalid or expired. Generate a new one at https://github.com/settings/tokens`);
    }
    if (res.status === 403 && GITHUB_TOKEN) {
      throw new Error(`GitHub API 403 — your token may lack permissions or rate limit is exhausted. ${detail}`.trim());
    }
    throw new Error(`GitHub API error: ${res.status}${detail ? ' — ' + detail : ''}`);
  }
  return res.json();
}

async function fetchRepoTree(owner, repo, token) {
  try {
    return await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, token);
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('Not Found')) {
      try {
        return await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, token);
      } catch (err2) {
        if (err2.message.includes('404') || err2.message.includes('Not Found')) throw new Error('Repository not found or is empty');
        throw err2;
      }
    }
    throw err;
  }
}

async function fetchFileContent(owner, repo, path, token) {
  try {
    const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, token);
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchRepoInfo(owner, repo, token) {
  return ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
}

function detectProjectType(treeItems) {
  const paths = treeItems.map(i => i.path);
  if (paths.some(p => p === 'package.json')) return { type: 'Node.js / JavaScript', pm: 'npm/yarn/pnpm' };
  if (paths.some(p => p === 'Cargo.toml')) return { type: 'Rust', pm: 'cargo' };
  if (paths.some(p => p === 'requirements.txt' || p === 'pyproject.toml' || p === 'setup.py')) return { type: 'Python', pm: 'pip/poetry' };
  if (paths.some(p => p === 'go.mod')) return { type: 'Go', pm: 'go mod' };
  if (paths.some(p => p === 'pom.xml' || p === 'build.gradle')) return { type: 'Java', pm: 'maven/gradle' };
  if (paths.some(p => p === 'Gemfile')) return { type: 'Ruby', pm: 'bundler' };
  if (paths.some(p => p === 'composer.json')) return { type: 'PHP', pm: 'composer' };
  if (paths.some(p => p.endsWith('.csproj'))) return { type: 'C# / .NET', pm: 'dotnet' };
  if (paths.some(p => p === 'pubspec.yaml')) return { type: 'Dart / Flutter', pm: 'pub' };
  if (paths.some(p => p === 'mix.exs')) return { type: 'Elixir', pm: 'mix' };
  if (paths.some(p => p === 'stack.yaml' || p === 'package.yaml')) return { type: 'Haskell', pm: 'stack' };

  const extCount = {};
  for (const p of treeItems) {
    const e = ext(p.path);
    if (e && e.length < 6) extCount[e] = (extCount[e] || 0) + 1;
  }
  const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const topExt = sorted[0][0];
    return { type: LANGUAGE_MAP[topExt] || topExt.toUpperCase(), pm: 'Unknown' };
  }
  return { type: 'Unknown', pm: 'Unknown' };
}

async function readPackageDeps(owner, repo, token) {
  const content = await fetchFileContent(owner, repo, 'package.json', token);
  if (!content) return { dependencies: {}, devDependencies: {} };
  try {
    const pkg = JSON.parse(content);
    return {
      dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
      name: pkg.name,
      description: pkg.description,
      scripts: pkg.scripts || {},
    };
  } catch { return { dependencies: {}, devDependencies: {} }; }
}

function detectFrameworks(deps) {
  const found = [];
  for (const sig of FRAMEWORK_SIGNATURES) {
    const depKey = Object.keys(deps).find(k => k === sig.dep || k === `@${sig.dep}` || k.replace(/^@/, '') === sig.dep);
    if (depKey) {
      found.push({ ...sig, version: deps[depKey] });
    }
  }
  return found;
}

function categorizeDeps(deps) {
  const categorized = {};
  for (const [name, version] of Object.entries(deps)) {
    const match = FRAMEWORK_SIGNATURES.find(s => s.dep === name || `@${s.dep}` === name);
    const category = match ? match.type : (name.startsWith('@types/') ? 'types' : 'other');
    const display = match ? match.name : name.replace(/^@/, '').replace(/\//, ' / ');
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ name: display, version, description: match?.desc || null });
  }
  return categorized;
}

function detectArchPattern(treeItems) {
  const allPaths = treeItems.map(i => i.path.toLowerCase());
  const allPathStr = allPaths.join(' ');
  const scores = [];

  for (const pattern of ARCH_PATTERNS) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (allPathStr.includes(kw)) score += 1;
    }
    if (score > 0) scores.push({ ...pattern, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 3);
}

async function fetchReadme(owner, repo, token) {
  const content = await fetchFileContent(owner, repo, 'README.md', token);
  if (!content) return null;
  return content.slice(0, 4000);
}

function parseReadme(content) {
  if (!content) return null;
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || '';

  let intro = [];
  let readingIntro = false;
  let foundInstall = false;
  let foundFeatures = false;
  let features = [];

  for (const line of lines) {
    const stripped = line.trim();

    if (stripped.startsWith('# ')) { readingIntro = true; continue; }

    if (/^##\s+(installation|getting started|setup|quick start)/i.test(stripped)) {
      foundInstall = true;
      readingIntro = false;
      continue;
    }

    if (/^##\s+(features|what it does|capabilities|overview)/i.test(stripped)) {
      foundFeatures = true;
      readingIntro = false;
      continue;
    }

    if (/^##\s/.test(stripped) && !foundInstall && !readingIntro && intro.length < 6) {
      readingIntro = false;
      continue;
    }

    if (readingIntro && stripped && !stripped.startsWith('#') && !stripped.startsWith('```') && intro.length < 5) {
      intro.push(stripped);
    }

    if (foundFeatures && (stripped.startsWith('- ') || stripped.startsWith('* '))) {
      features.push(stripped.replace(/^[-*]\s+/, ''));
    }
    if (foundFeatures && features.length > 0 && !stripped.startsWith('- ') && !stripped.startsWith('* ') && !stripped.startsWith('#')) {
      foundFeatures = false;
    }
  }

  return { title, intro: intro.slice(0, 4), features: features.slice(0, 8) };
}

function detectEntryPoints(items) {
  const entryCandidates = [
    'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
    'server.js', 'server.ts', 'cli.js', 'cli.ts', 'index.jsx', 'index.tsx',
    'main.py', 'app.py', 'server.py', 'cli.py',
    'main.rs', 'lib.rs', 'main.go', 'cmd',
    'Program.cs', 'Startup.cs',
    'main.java', 'Application.java',
  ];

  const found = [];
  for (const item of items) {
    const name = item.path.split('/').pop();
    if (entryCandidates.includes(name)) {
      found.push({
        path: item.path,
        name,
        depth: item.path.split('/').length,
      });
    }
  }

  found.sort((a, b) => a.depth - b.depth);
  return found.slice(0, 6);
}

async function scanEntryContent(owner, repo, entryPoints) {
  const results = [];
  for (const entry of entryPoints.slice(0, 4)) {
    const content = await fetchFileContent(owner, repo, entry.path);
    if (!content) continue;

    const exports = [];
    const imports = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('import ') || t.startsWith('const ') || t.startsWith('require(')) {
        imports.push(t);
      }
      if (/^(export\s+\w+|module\.exports|function\s+\w+)/.test(t)) {
        exports.push(t.replace(/^export\s+/, '').trim());
      }
      if (/^(class|async function|function|const\s+\w+\s*=)/.test(t) && t.includes('{')) {
        exports.push(t);
      }
    }

    results.push({
      path: entry.path,
      name: entry.name,
      exports: exports.slice(0, 8),
      importCount: imports.length,
      lineCount: lines.length,
    });
  }
  return results;
}

function generateNarrative(data) {
  const { repoInfo, projectType, frameworks, deps, categorizedDeps, archPatterns, entryPoints, readme, owner, repo, items } = data;
  const sections = [];

  // ── What Is This? ──
  let whatLines = [];
  const desc = repoInfo.description || '';
  const readmeInfo = readme?.intro?.length ? readme.intro.join(' ') : '';

  whatLines.push(`This is **${repoInfo.name}**${repoInfo.stars > 0 ? ` (★ ${repoInfo.stars.toLocaleString()})` : ''}, a ${projectType.type} project${deps.name ? ` called **${deps.name}**` : ''}.`);

  if (desc) whatLines.push(desc);
  if (readmeInfo) whatLines.push(readmeInfo);

  if (readme?.features?.length) {
    whatLines.push('\n**Key features:**');
    for (const f of readme.features) whatLines.push(f);
  }

  sections.push({ heading: 'What Is This?', icon: '📋', content: whatLines.join('\n\n') });

  // ── What Does It Use? ──
  const techLines = [];
  techLines.push(`Built with **${projectType.type}**${projectType.pm ? ` via ${projectType.pm}` : ''}.`);

  if (frameworks.length > 0) {
    const fwByType = {};
    for (const fw of frameworks) {
      if (!fwByType[fw.type]) fwByType[fw.type] = [];
      fwByType[fw.type].push(fw);
    }
    for (const [type, fws] of Object.entries(fwByType)) {
      const names = fws.map(f => `**${f.name}**${f.desc ? ` (${f.desc})` : ''}`);
      techLines.push(`- **${type.charAt(0).toUpperCase() + type.slice(1)}**: ${names.join(', ')}`);
    }
  }

  const fwNames = new Set(frameworks.map(f => f.name.toLowerCase()));
  if (categorizedDeps && Object.keys(categorizedDeps).length > 0) {
    const catLabels = {
      database: 'Database & ORM', test: 'Testing', tooling: 'Tooling',
      build: 'Build Tools', auth: 'Authentication', http: 'HTTP Client',
      api: 'API Layer', realtime: 'Real-time', cli: 'CLI',
      util: 'Utilities', config: 'Configuration', types: 'Type Definitions',
      frontend: 'Frontend', backend: 'Backend', css: 'CSS & Styling',
      ml: 'ML / AI', language: 'Language',
    };
    for (const [cat, libs] of Object.entries(categorizedDeps)) {
      if (cat === 'other' || cat === 'types') continue;
      const display = catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
      const filtered = libs.filter(l => !fwNames.has(l.name.toLowerCase())).slice(0, 5);
      const names = filtered.map(l => {
        return l.description ? `**${l.name}** (${l.description})` : `**${l.name}**`;
      });
      if (names.length > 0) techLines.push(`- **${display}**: ${names.join(', ')}`);
    }
  }

  sections.push({ heading: 'What Does It Use?', icon: '⚡', content: techLines.join('\n') });

  // ── How Is It Organized? ──
  const orgLines = [];

  if (archPatterns.length > 0) {
    const mainPat = archPatterns[0];
    orgLines.push(`The project follows a **${mainPat.name}**: ${mainPat.desc}.`);
  }

  const topDirs = new Set();
  for (const item of items) {
    const parts = item.path.split('/');
    if (parts.length > 1) topDirs.add(parts[0]);
  }
  const topList = [...topDirs]
    .filter(d => !d.startsWith('.') && d !== 'node_modules' && d !== 'target' && d !== '__pycache__')
    .sort();

  if (topList.length > 0) {
    orgLines.push(`\n**Top-level directories:**`);
    for (const d of topList) {
      const subFiles = items.filter(i => i.path.startsWith(d + '/') && i.type === 'blob').length;
      const subDirs = new Set(items.filter(i => i.path.startsWith(d + '/') && i.path.includes('/')).map(i => i.path.split('/')[1]));
      orgLines.push(`- **${d}/** — ${subFiles} file${subFiles !== 1 ? 's' : ''}${subDirs.size > 0 ? `, ${subDirs.size} subdirector${subDirs.size > 1 ? 'ies' : 'y'}` : ''}`);
    }
  }

  if (entryPoints.length > 0) {
    orgLines.push(`\n**Entry points:**`);
    for (const ep of entryPoints) {
      orgLines.push(`- \`${ep.path}\` — depth ${ep.depth}`);
    }
  }

  const catCount = {};
  for (const item of items) {
    const info = classifyFile(item.path, item.path);
    catCount[info.category] = (catCount[info.category] || 0) + 1;
  }
  const notableCats = Object.entries(catCount)
    .filter(([c]) => !['config', 'meta', 'source', 'docs'].includes(c))
    .sort((a, b) => b[1] - a[1]);

  if (notableCats.length > 0) {
    orgLines.push(`\n**Key components found in the codebase:**`);
    const catNames = { api: 'API endpoint', component: 'UI component', model: 'data model', hooks: 'custom hook', middleware: 'middleware', test: 'test', style: 'style', types: 'type definition', util: 'utility', migration: 'migration', cli: 'CLI command', context: 'React context', build: 'build script', storybook: 'Storybook story', infra: 'infrastructure' };
    for (const [cat, count] of notableCats.slice(0, 8)) {
      const label = catNames[cat] || cat;
      orgLines.push(`- ${count} ${label}${count > 1 ? 's' : ''}`);
    }
  }

  sections.push({ heading: 'How Is It Organized?', icon: '🏗️', content: orgLines.join('\n') });

  return sections;
}

function generateArchSummary(frameworks, projectType, treeItems) {
  const parts = [];
  const frontend = frameworks.filter(f => f.type === 'frontend' || f.type === 'fullstack').map(f => f.name);
  const backend = frameworks.filter(f => f.type === 'backend' || f.type === 'fullstack').map(f => f.name);
  const ml = frameworks.filter(f => f.type === 'ml').map(f => f.name);
  if (frontend.length) parts.push(`Frontend: ${frontend.join(', ')}`);
  if (backend.length) parts.push(`Backend: ${backend.join(', ')}`);
  if (ml.length) parts.push(`ML/AI: ${ml.join(', ')}`);
  const catCount = {};
  for (const item of treeItems) {
    const info = classifyFile(item.path, item.path);
    catCount[info.category] = (catCount[info.category] || 0) + 1;
  }
  const arch = [];
  if (catCount.api) arch.push(`${catCount.api} API endpoint${catCount.api > 1 ? 's' : ''}`);
  if (catCount.component) arch.push(`${catCount.component} UI component${catCount.component > 1 ? 's' : ''}`);
  if (catCount.model) arch.push(`${catCount.model} data model${catCount.model > 1 ? 's' : ''}`);
  if (catCount.test) arch.push(`${catCount.test} test file${catCount.test > 1 ? 's' : ''}`);
  if (arch.length) parts.push(`Structure: ${arch.join(', ')}.`);
  parts.push(`Tech stack: ${projectType.type}${frameworks.length ? ' with ' + frameworks.map(f => f.name).join(', ') : ''}.`);
  return parts.join('\n\n');
}

function detectProjectPurpose(items, projectType, deps) {
  const paths = items.map(i => i.path.toLowerCase());
  const pathStr = paths.join(' ');

  if (pathStr.includes('api') && pathStr.includes('route')) return 'web-api';
  if (pathStr.includes('component') && (pathStr.includes('page') || pathStr.includes('app'))) return 'web-app';
  if (deps.name && deps.description) return 'library';
  if (pathStr.includes('cli') || pathStr.includes('command')) return 'cli-tool';
  if (pathStr.includes('test') && !pathStr.includes('src')) return 'testing';
  if (pathStr.includes('plugin') || pathStr.includes('extension')) return 'plugin';
  if (pathStr.includes('migration') && pathStr.includes('sql')) return 'database';
  if (pathStr.includes('worker') || pathStr.includes('queue')) return 'background-worker';
  return 'general';
}

function categorizeComponents(items) {
  const components = [];
  const seen = new Set();

  for (const item of items) {
    const info = classifyFile(item.path, item.path);
    if (['component', 'api', 'model', 'hooks', 'middleware', 'source', 'cli'].includes(info.category)) {
      const key = item.path;
      if (!seen.has(key) && !key.includes('node_modules') && !key.includes('.git')) {
        seen.add(key);
        components.push({
          path: item.path,
          category: info.category,
          icon: info.icon,
          lang: info.lang,
          name: item.path.split('/').pop(),
        });
      }
    }
  }
  return components.slice(0, 30);
}

function buildFlatTree(items) {
  const root = { name: 'root', type: 'dir', children: [] };
  const map = { '': root };

  for (const item of items) {
    const parts = item.path.replace(/\\/g, '/').split('/');
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!map[currentPath]) {
        const isTerminal = i === parts.length - 1;
        const isDir = item.type === 'tree' || !isTerminal;
        const node = {
          name: part,
          type: isDir ? 'dir' : 'file',
          path: currentPath,
          children: isDir ? [] : undefined,
        };
        if (!isDir) {
          const info = classifyFile(item.path, item.path);
          node.lang = info.lang;
          node.icon = info.icon;
          node.category = info.category;
        }
        map[currentPath] = node;
        if (map[parentPath]) {
          map[parentPath].children.push(node);
        } else {
          root.children.push(node);
        }
      }
    }
  }
  return root;
}

// ── Deep file scanning ──
function priorityFiles(items) {
  const byExt = {};
  for (const item of items) {
    if (item.type !== 'blob') continue;
    const e = ext(item.path);
    if (!e || e.length > 5) continue;
    if (!byExt[e]) byExt[e] = [];
    byExt[e].push(item);
  }

  const scored = items
    .filter(i => i.type === 'blob')
    .map(i => {
      let score = 0;
      const ie = ext(i.path);
      const parts = i.path.split('/');
      const name = parts[parts.length - 1].toLowerCase();

      if (['index.js','index.ts','app.js','app.ts','main.js','main.ts','server.js','server.ts','cli.js','lib.rs','main.py','app.py','main.go'].includes(name)) score += 20;
      if (parts.length === 1) score += 5;
      if (i.path.includes('src/')) score += 3;
      if (i.path.includes('routes/') || i.path.includes('api/')) score += 4;
      if (i.path.includes('models/') || i.path.includes('schemas/')) score += 3;
      if (i.path.includes('middleware/')) score += 3;
      if (i.path.includes('utils/') || i.path.includes('helpers/')) score += 1;
      if (i.path.includes('node_modules') || i.path.includes('.git')) score = -100;
      if (['.md','.json','.yml','.yaml','.lock','.txt','.css','.html','.svg','.png','.jpg'].includes('.' + ie)) score -= 5;

      return { item: i, score, ext: ie };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 12).map(s => s.item);
}

async function deepScanFiles(owner, repo, items, token) {
  const candidates = priorityFiles(items);
  const results = [];
  const depGraphNodes = [];
  const depGraphEdges = [];
  const nodeSet = new Set();

  for (const candidate of candidates.slice(0, 8)) {
    const content = await fetchFileContent(owner, repo, candidate.path, token);
    if (!content) continue;

    const lines = content.split('\n');
    const exports = [];
    const imports = [];
    const routes = [];
    const classes = [];
    const funcs = [];

    for (const line of lines) {
      const t = line.trim();

      // Exports
      if (/^(export\s+default\s+|export\s+(const|function|class|interface|type|enum|let|var)\s+)/.test(t)) {
        const m = t.match(/export\s+(?:default\s+)?(?:const|function|class|interface|type|enum|let|var)\s+(\w+)/);
        exports.push(m ? m[1] : t.replace(/^export\s+/, '').split(/[({=]/)[0].trim());
      }
      if (/^module\.exports\s*=/.test(t)) {
        exports.push('module.exports');
      }

      // Imports
      if (/^(import\s+|const\s+.+\s*=\s*require\()/.test(t)) {
        const m = t.match(/from\s+['"]([^'"]+)['"]/);
        if (m) imports.push(m[1]);
        else {
          const m2 = t.match(/require\(['"]([^'"]+)['"]\)/);
          if (m2) imports.push(m2[1]);
        }
      }

      // Route definitions (Express/Fastify)
      const routeMatch = t.match(/\.(get|post|put|delete|patch|all)\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) routes.push(`${routeMatch[1].toUpperCase()} ${routeMatch[2]}`);

      // Class definitions
      if (/^class\s+(\w+)/.test(t)) {
        const m = t.match(/^class\s+(\w+)/);
        if (m) classes.push(m[1]);
      }

      // Async functions
      if (/^(async\s+)?function\s+(\w+)/.test(t)) {
        const m = t.match(/(?:async\s+)?function\s+(\w+)/);
        if (m && !['if','for','while'].includes(m[1])) funcs.push(m[1]);
      }
    }

    const localImports = imports.filter(i => i.startsWith('.'));
    const externalImports = imports.filter(i => !i.startsWith('.'));
    results.push({
      path: candidate.path,
      name: candidate.path.split('/').pop(),
      lineCount: lines.length,
      exports: exports.slice(0, 6),
      imports: imports.slice(0, 10),
      localImports: localImports.slice(0, 6),
      externalImports: externalImports.slice(0, 6),
      importCount: imports.length,
      routes: routes.slice(0, 6),
      classes: classes.slice(0, 4),
      topFuncs: funcs.slice(0, 6),
    });

    // Build dep graph
    if (!nodeSet.has(candidate.path)) {
      nodeSet.add(candidate.path);
      depGraphNodes.push({ id: candidate.path, label: candidate.path.split('/').pop(), group: 'local' });
    }
    for (const imp of imports) {
      if (!nodeSet.has(imp)) {
        nodeSet.add(imp);
        depGraphNodes.push({ id: imp, label: imp.split('/').pop(), group: imp.startsWith('.') ? 'local' : 'external' });
      }
      depGraphEdges.push({ source: candidate.path, target: imp, type: imp.startsWith('.') ? 'local' : 'external' });
    }
  }

  return { deepScan: results, depGraph: { nodes: depGraphNodes, edges: depGraphEdges } };
}

function cacheResult(owner, repo, data) {
  cacheSet(cacheKey(owner, repo, 'analysis'), data);
}

function getCachedResult(owner, repo) {
  return cacheGet(cacheKey(owner, repo, 'analysis'));
}

function clearCache() {
  cacheStore.clear();
}

module.exports = {
  fetchRepoTree, fetchFileContent, fetchRepoInfo,
  detectProjectType, readPackageDeps, detectFrameworks,
  categorizeDeps, generateArchSummary,
  categorizeComponents, buildFlatTree, generateNarrative,
  detectArchPattern, detectEntryPoints, scanEntryContent,
  fetchReadme, parseReadme, detectProjectPurpose, classifyFile,
  deepScanFiles, setToken,
  cacheResult, getCachedResult, clearCache,
  getRateLimit, resetRateLimit,
};
