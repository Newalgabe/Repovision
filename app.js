require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  fetchRepoTree, fetchRepoInfo, detectProjectType, readPackageDeps,
  detectFrameworks, categorizeDeps, generateArchSummary,
  categorizeComponents, buildFlatTree, generateNarrative,
  detectArchPattern, detectEntryPoints, scanEntryContent,
  fetchReadme, parseReadme, detectProjectPurpose,
} = require('./analyzer');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parseGitHubUrl(url) {
  const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
  return { owner: match[1], repo: match[2].replace(/\/$/, '') };
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const { owner, repo } = parseGitHubUrl(url);
    console.log(`Analyzing ${owner}/${repo}...`);

    const [repoInfo, treeData] = await Promise.all([
      fetchRepoInfo(owner, repo),
      fetchRepoTree(owner, repo),
    ]);

    const items = treeData.tree || [];

    const projectType = detectProjectType(items);
    const deps = await readPackageDeps(owner, repo);
    const frameworks = detectFrameworks(deps.dependencies || {});
    const categorizedDeps = categorizeDeps(deps.dependencies || {});
    const archPatterns = detectArchPattern(items);
    const entryPoints = detectEntryPoints(items);
    const readmeContent = await fetchReadme(owner, repo);
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
    };

    console.log(`Done analyzing ${owner}/${repo}`);
    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
