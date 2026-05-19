require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const fetch = require('node-fetch');
const {
  fetchRepoTree, fetchRepoInfo, detectProjectType, readPackageDeps,
  detectFrameworks, categorizeDeps, generateArchSummary,
  categorizeComponents, buildFlatTree, generateNarrative,
  detectArchPattern, detectEntryPoints, scanEntryContent,
  fetchReadme, parseReadme, detectProjectPurpose,
  deepScanFiles, setToken,
  cacheResult, getCachedResult, clearCache,
} = require('./analyzer');

const app = express();

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'repovision-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

function parseGitHubUrl(url) {
  const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
  return { owner: match[1], repo: match[2].replace(/\/$/, '') };
}

async function analyzeRepo(owner, repo, token) {
  const cached = getCachedResult(owner, repo);
  if (cached) {
    console.log(`Cache hit for ${owner}/${repo}`);
    return cached;
  }

  console.log(`Analyzing ${owner}/${repo}...`);

  const [repoInfo, treeData] = await Promise.all([
    fetchRepoInfo(owner, repo, token),
    fetchRepoTree(owner, repo, token),
  ]);

  const items = treeData.tree || [];

  const projectType = detectProjectType(items);
  const deps = await readPackageDeps(owner, repo, token);
  const frameworks = detectFrameworks(deps.dependencies || {});
  const categorizedDeps = categorizeDeps(deps.dependencies || {});
  const archPatterns = detectArchPattern(items);
  const entryPoints = detectEntryPoints(items);
  const readmeContent = await fetchReadme(owner, repo, token);
  const readme = parseReadme(readmeContent);
  const purpose = detectProjectPurpose(items, projectType, deps);

  const narrativeData = {
    repoInfo, projectType, frameworks, deps, categorizedDeps,
    archPatterns, entryPoints, readme, owner, repo, items,
  };
  const narrative = generateNarrative(narrativeData);

  const archSummary = generateArchSummary(frameworks, projectType, items);
  const components = categorizeComponents(items);
  const fileTree = buildFlatTree(items);

  const langCount = {};
  for (const item of items) {
    const e = item.path.split('.').pop().toLowerCase();
    if (e && e.length < 10 && !item.path.includes('node_modules')) {
      langCount[e] = (langCount[e] || 0) + 1;
    }
  }

  const langRanking = Object.entries(langCount)
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const deepData = await deepScanFiles(owner, repo, items, token);

  const result = {
    repo: {
      name: repoInfo.name,
      full_name: repoInfo.full_name,
      description: repoInfo.description,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      language: repoInfo.language,
      default_branch: repoInfo.default_branch,
      topics: repoInfo.topics || [],
      html_url: repoInfo.html_url,
    },
    summary: archSummary,
    narrative,
    projectType: projectType.type,
    projectPurpose: purpose,
    frameworks: frameworks.map(f => ({ name: f.name, type: f.type, desc: f.desc })),
    languages: langRanking,
    totalFiles: items.filter(i => i.type === 'blob').length,
    totalDirs: new Set(items.filter(i => i.type === 'tree').map(i => i.path)).size,
    components,
    fileTree,
    readme: readme ? { title: readme.title, features: readme.features } : null,
    archPatterns: archPatterns.map(p => ({ name: p.name, desc: p.desc, score: p.score })),
    entryPoints: entryPoints.map(e => ({ path: e.path, name: e.name })),
    deepScan: deepData.deepScan,
    depGraph: deepData.depGraph,
  };

  cacheResult(owner, repo, result);
  console.log(`Done analyzing ${owner}/${repo}${cached ? ' (cached)' : ''}`);
  return result;
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const { owner, repo } = parseGitHubUrl(url);
    const token = req.session?.githubToken;
    if (token) setToken(token);
    const result = await analyzeRepo(owner, repo, token);
    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { url1, url2 } = req.body;
    if (!url1 || !url2) return res.status(400).json({ error: 'Two URLs are required (url1, url2)' });

    const { owner: o1, repo: r1 } = parseGitHubUrl(url1);
    const { owner: o2, repo: r2 } = parseGitHubUrl(url2);

    const token = req.session?.githubToken;
    if (token) setToken(token);
    const [result1, result2] = await Promise.all([
      analyzeRepo(o1, r1, token),
      analyzeRepo(o2, r2, token),
    ]);

    res.json({ repo1: result1, repo2: result2 });
  } catch (err) {
    console.error('Compare error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GitHub OAuth ──
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

app.get('/api/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) return res.json({ error: 'GitHub OAuth not configured' });
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=`;
  res.redirect(url);
});

app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      req.session.githubToken = tokenData.access_token;
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'repovision/1.0' },
      });
      const userData = await userRes.json();
      req.session.githubUser = { login: userData.login, avatar: userData.avatar_url, name: userData.name };
    }
    res.redirect('/');
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect('/?error=oauth');
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session?.githubToken && req.session?.githubUser) {
    res.json({ authenticated: true, user: req.session.githubUser });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// ── Trending ──
const TRENDING_CACHE = { data: null, ts: 0 };
const TRENDING_TTL = 30 * 60 * 1000;

app.get('/api/trending', async (req, res) => {
  if (Date.now() - TRENDING_CACHE.ts < TRENDING_TTL && TRENDING_CACHE.data) {
    return res.json(TRENDING_CACHE.data);
  }
  try {
    const token = req.session?.githubToken || process.env.GITHUB_TOKEN;
    const headers = { 'User-Agent': 'repovision/1.0', Accept: 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const data = await fetch(
      'https://api.github.com/search/repositories?q=stars:>5000&sort=stars&order=desc&per_page=8',
      { headers }
    ).then(r => r.json());
    const repos = (data.items || []).map(r => ({
      full_name: r.full_name, description: r.description, stars: r.stargazers_count,
      language: r.language, html_url: r.html_url,
    }));
    const result = { repos, fallback: false };
    if (repos.length === 0) throw new Error('empty');
    TRENDING_CACHE.data = result;
    TRENDING_CACHE.ts = Date.now();
    res.json(result);
  } catch {
    res.json({
      repos: [
        { full_name: 'vercel/next.js', description: 'The React Framework', stars: 130000, language: 'TypeScript' },
        { full_name: 'facebook/react', description: 'A declarative UI library', stars: 230000, language: 'JavaScript' },
        { full_name: 'tailwindlabs/tailwindcss', description: 'Utility-first CSS framework', stars: 85000, language: 'CSS' },
        { full_name: 'rust-lang/rust', description: 'Empowering everyone to build reliable software', stars: 100000, language: 'Rust' },
        { full_name: 'microsoft/vscode', description: 'Visual Studio Code', stars: 165000, language: 'TypeScript' },
        { full_name: 'astral-sh/ruff', description: 'An extremely fast Python linter and code formatter', stars: 35000, language: 'Rust' },
      ],
      fallback: true,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
