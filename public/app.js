(() => {
  const DOM = {
    inputSection: document.getElementById('input-section'),
    resultsSection: document.getElementById('results-section'),
    repoUrl: document.getElementById('repo-url'),
    repoUrl2: document.getElementById('repo-url-2'),
    analyzeBtn: document.getElementById('analyze-btn'),
    errorMsg: document.getElementById('error-msg'),
    dropZone: document.getElementById('drop-zone'),
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    compareResults: document.getElementById('compare-results'),
    loadingMsg: document.getElementById('loading-message'),
    loadingBar: document.getElementById('loading-bar-fill'),
    repoLink: document.getElementById('repo-link'),
    repoDesc: document.getElementById('repo-desc'),
    repoMeta: document.getElementById('repo-meta'),
    statFiles: document.getElementById('stat-files'),
    statDirs: document.getElementById('stat-dirs'),
    statStars: document.getElementById('stat-stars'),
    techBadges: document.getElementById('tech-badges'),
    narrativeContainer: document.getElementById('narrative-container'),
    deepScanContainer: document.getElementById('deep-scan-container'),
    langBars: document.getElementById('lang-bars'),
    fileTree: document.getElementById('file-tree'),
    componentsGrid: document.getElementById('components-grid'),
    expandAllBtn: document.getElementById('expand-all-btn'),
    collapseAllBtn: document.getElementById('collapse-all-btn'),
    newAnalysisBtn: document.getElementById('new-analysis-btn'),
    historyContainer: document.getElementById('history-container'),
    compareToggle: document.getElementById('compare-toggle'),
    compareInput: document.getElementById('compare-input-wrapper'),
    exportMdBtn: document.getElementById('export-md-btn'),
    shareUrlBtn: document.getElementById('share-url-btn'),
    depGraphCanvas: document.getElementById('dep-graph-canvas'),
    depGraphContainer: document.getElementById('dep-graph-container'),
    depGraphHeader: document.getElementById('dep-graph-header'),
    trendingContainer: document.getElementById('trending-container'),
    trendingGrid: document.getElementById('trending-grid'),
    refreshTrending: document.getElementById('refresh-trending'),
    authBtn: document.getElementById('auth-btn'),
    authAvatar: document.getElementById('auth-avatar'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    shortcutsBackdrop: document.getElementById('shortcuts-backdrop'),
    shortcutsClose: document.getElementById('shortcuts-close'),
    keyboardHint: document.getElementById('keyboard-hint'),
    aiToggleBtn: document.getElementById('ai-toggle-btn'),
    aiSettings: document.getElementById('ai-settings'),
    aiProvider: document.getElementById('ai-provider'),
    aiKey: document.getElementById('ai-key'),
    aiKeyToggle: document.getElementById('ai-key-toggle'),
    aiNarrativeContainer: document.getElementById('ai-narrative-container'),
    aiNarrativeHeader: document.getElementById('ai-narrative-header'),
    aiNarrativeBody: document.getElementById('ai-narrative-body'),
  };

  let currentData = null;
  let isCompare = false;
  let isAiMode = false;
  let aiKeyVisible = false;

  const LANG_COLORS = {
    js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
    py: '#3572A5', rb: '#701516', rs: '#dea584', go: '#00ADD8',
    java: '#b07219', kt: '#A97BFF', swift: '#F05138', vue: '#4fc08d',
    css: '#563d7c', scss: '#c6538c', html: '#e34f26', json: '#5a5a5a',
    yml: '#cb171e', yaml: '#cb171e', md: '#083fa1', sql: '#e38c00',
    sh: '#89e051', dockerfile: '#2496ed', tf: '#7b42bc', cs: '#178600',
    cpp: '#f34b7d', c: '#555555', dart: '#00B4AB', php: '#4F5D95',
    r: '#198CE7', scala: '#c22d40', toml: '#9c4221', xml: '#0060ac',
  };
  const LANGUAGE_NAMES = {
    js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', tsx: 'TSX',
    py: 'Python', rb: 'Ruby', rs: 'Rust', go: 'Go',
    java: 'Java', kt: 'Kotlin', swift: 'Swift', vue: 'Vue',
    css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON',
    yml: 'YAML', yaml: 'YAML', md: 'Markdown', sql: 'SQL',
    sh: 'Shell', dockerfile: 'Dockerfile', tf: 'Terraform',
    cs: 'C#', cpp: 'C++', c: 'C', dart: 'Dart', php: 'PHP',
    r: 'R', scala: 'Scala', toml: 'TOML', xml: 'XML',
  };

  // â”€â”€ Theme Toggle â”€â”€
  const themeToggle = document.getElementById('theme-toggle');
  function loadTheme() {
    const saved = localStorage.getItem('repovision_theme');
    if (saved === 'light') document.documentElement.classList.add('light-theme');
  }
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light-theme');
    localStorage.setItem('repovision_theme', isLight ? 'light' : 'dark');
  });
  loadTheme();

  // â”€â”€ History â”€â”€
  function getHistory() {
    try { return JSON.parse(localStorage.getItem('repovision_history') || '[]'); }
    catch { return []; }
  }
  function addHistory(url) {
    const h = getHistory().filter(item => item !== url);
    h.unshift(url);
    localStorage.setItem('repovision_history', JSON.stringify(h.slice(0, 8)));
    renderHistory();
  }
  function renderHistory() {
    const h = getHistory();
    DOM.historyContainer.innerHTML = '';
    if (h.length === 0) return;
    const label = document.createElement('span');
    label.className = 'history-label';
    label.textContent = 'Recent:';
    DOM.historyContainer.appendChild(label);
    for (const url of h) {
      const btn = document.createElement('button');
      btn.className = 'history-pill';
      btn.textContent = url.replace('https://github.com/', '');
      btn.title = url;
      btn.addEventListener('click', () => { fillRepoUrl(url); });
      DOM.historyContainer.appendChild(btn);
    }
  }

  // â”€â”€ Trending â”€â”€
  let trendingErrorCount = 0;
  async function loadTrending() {
    DOM.trendingContainer.classList.remove('hidden');
    DOM.trendingGrid.innerHTML = '<p class="trending-loading">Loading trending repos...</p>';
    try {
      const res = await fetch('/api/trending');
      const data = await res.json();
      trendingErrorCount = 0;
      renderTrending(data.repos);
    } catch {
      trendingErrorCount++;
      DOM.trendingGrid.innerHTML = '<p class="trending-loading">Could not load trending repos.</p>';
    }
  }
  function renderTrending(repos) {
    DOM.trendingGrid.innerHTML = '';
    for (const r of repos) {
      const card = document.createElement('div'); card.className = 'trending-card';
      card.innerHTML = `
        <div class="trending-card-name">${r.full_name}</div>
        <div class="trending-card-desc">${r.description || ''}</div>
        <div class="trending-card-meta">
          <span>${r.language || ''}</span>
          <span>â˜… ${(r.stars || 0).toLocaleString()}</span>
        </div>`;
      card.addEventListener('click', () => {
        fillRepoUrl(`https://github.com/${r.full_name}`);
      });
      DOM.trendingGrid.appendChild(card);
    }
  }
  DOM.refreshTrending.addEventListener('click', loadTrending);
  loadTrending();

  // â”€â”€ OAuth â”€â”€
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        DOM.authBtn.classList.add('hidden');
        DOM.authAvatar.classList.remove('hidden');
        DOM.authAvatar.innerHTML = `<img src="${data.user.avatar}" alt="${data.user.login}" class="auth-avatar-img" title="Signed in as ${data.user.login}">`;
      } else if (data.available) {
        DOM.authBtn.classList.remove('hidden');
        DOM.authAvatar.classList.add('hidden');
      } else {
        DOM.authBtn.classList.add('hidden');
        DOM.authAvatar.classList.add('hidden');
      }
    } catch { DOM.authBtn.classList.add('hidden'); }
  }
  DOM.authBtn.addEventListener('click', () => { window.location.href = '/api/auth/github'; });
  checkAuth();

  // â”€â”€ Keyboard Shortcuts â”€â”€
  function toggleShortcuts(show) {
    try {
      if (show === undefined) {
        DOM.shortcutsModal.classList.toggle('hidden');
      } else if (show) {
        DOM.shortcutsModal.classList.remove('hidden');
      } else {
        DOM.shortcutsModal.classList.add('hidden');
      }
    } catch {}
  }
  if (DOM.keyboardHint) DOM.keyboardHint.addEventListener('click', () => toggleShortcuts());
  if (DOM.shortcutsBackdrop) DOM.shortcutsBackdrop.addEventListener('click', () => toggleShortcuts(false));
  if (DOM.shortcutsClose) DOM.shortcutsClose.addEventListener('click', () => toggleShortcuts(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleShortcuts(); }
    if (e.key === 'Escape') { toggleShortcuts(false); if (document.activeElement) document.activeElement.blur(); }
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.target.matches('input,textarea')) {
      e.preventDefault(); DOM.compareToggle.checked = !DOM.compareToggle.checked;
      DOM.compareToggle.dispatchEvent(new Event('change'));
    }
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.target.matches('input,textarea')) {
      if (!DOM.trendingContainer.classList.contains('hidden')) loadTrending();
    }
    if (e.key === 'Enter' && (e.target === DOM.repoUrl || e.target === DOM.repoUrl2)) {
      DOM.analyzeBtn.click();
    }
  });

  // â”€â”€ URL handling â”€â”€
  function extractUrl(input) {
    input = input.trim();
    if (input.includes('github.com')) {
      const m = input.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|\.git|$)/);
      return m ? `https://github.com/${m[1]}` : null;
    }
    if (/^[\w.-]+\/[\w.-]+$/.test(input)) return `https://github.com/${input}`;
    return null;
  }

  function fillRepoUrl(url) {
    if (!isCompare) { DOM.repoUrl.value = url; DOM.analyzeBtn.click(); return; }
    const first = DOM.repoUrl.value.trim();
    const second = DOM.repoUrl2.value.trim();
    if (!first || first.includes(url.replace('https://github.com/', ''))) {
      DOM.repoUrl.value = url;
    } else if (!second) {
      DOM.repoUrl2.value = url;
    } else {
      DOM.repoUrl.value = url;
      DOM.repoUrl2.value = '';
    }
    DOM.analyzeBtn.click();
  }

  function showError(msg) { DOM.errorMsg.textContent = msg; DOM.errorMsg.classList.remove('hidden'); }
  function hideError() { DOM.errorMsg.classList.add('hidden'); }

  function showLoading(msg) {
    DOM.results.classList.add('hidden');
    DOM.compareResults.classList.add('hidden');
    DOM.loading.classList.remove('hidden');
    DOM.loadingMsg.textContent = msg || 'Connecting to GitHub...';
    DOM.loadingBar.style.width = '10%';
  }
  function updateLoading(msg, pct) {
    DOM.loadingMsg.textContent = msg;
    DOM.loadingBar.style.width = `${pct}%`;
  }
  function hideLoading() { DOM.loading.classList.add('hidden'); }

  // â”€â”€ Analyze â”€â”€
  async function analyze(url) {
    hideError();
    showLoading();
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.querySelector('.btn-text').classList.add('hidden');
    DOM.analyzeBtn.querySelector('.btn-spinner').classList.remove('hidden');
    try {
      updateLoading('Fetching repository structure...', 25);
      await sleep(200);
      updateLoading('Reading files and analyzing architecture...', 50);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Analysis failed'); }
      updateLoading('Building visual map...', 80);
      await sleep(300);
      const data = await res.json();
      currentData = data;
      updateLoading('Done!', 100);
      await sleep(200);
      hideLoading();
      addHistory(url);
      DOM.compareResults.classList.add('hidden');
      renderResults(data);
      DOM.resultsSection.classList.remove('hidden');
      DOM.results.classList.remove('hidden');
      DOM.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      hideLoading();
      DOM.resultsSection.classList.add('hidden');
      showError(err.message);
    } finally {
      DOM.analyzeBtn.disabled = false;
      DOM.analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
      DOM.analyzeBtn.querySelector('.btn-spinner').classList.add('hidden');
    }
  }

  async function analyzeWithAI(url) {
    hideError();
    showLoading();
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.querySelector('.btn-text').classList.add('hidden');
    DOM.analyzeBtn.querySelector('.btn-spinner').classList.remove('hidden');
    const apiKey = DOM.aiKey.value.trim();
    const provider = DOM.aiProvider.value;
    if (!apiKey) { hideLoading(); showError('Enter your API key for AI narrative'); DOM.analyzeBtn.disabled = false; DOM.analyzeBtn.querySelector('.btn-text').classList.remove('hidden'); DOM.analyzeBtn.querySelector('.btn-spinner').classList.add('hidden'); return; }
    try {
      updateLoading('Fetching repository structure...', 20);
      await sleep(200);
      const providerName = provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Claude' : 'Gemini';
      updateLoading('Analyzing with ' + providerName + '...', 50);
      const res = await fetch('/api/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey, provider }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'AI analysis failed'); }
      updateLoading('Building results...', 80);
      await sleep(300);
      const data = await res.json();
      currentData = data;
      updateLoading('Done!', 100);
      await sleep(200);
      hideLoading();
      addHistory(url);
      DOM.compareResults.classList.add('hidden');
      renderResults(data);
      DOM.resultsSection.classList.remove('hidden');
      DOM.results.classList.remove('hidden');
      DOM.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      hideLoading();
      DOM.resultsSection.classList.add('hidden');
      showError(err.message);
    } finally {
      DOM.analyzeBtn.disabled = false;
      DOM.analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
      DOM.analyzeBtn.querySelector('.btn-spinner').classList.add('hidden');
    }
  }

  async function compareRepos(url1, url2) {
    hideError();
    showLoading('Analyzing first repo...');
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.querySelector('.btn-text').classList.add('hidden');
    DOM.analyzeBtn.querySelector('.btn-spinner').classList.remove('hidden');
    try {
      updateLoading('Fetching both repositories...', 20);
      await sleep(300);
      updateLoading('Analyzing architecture...', 50);
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1, url2 }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Compare failed'); }
      updateLoading('Building comparison...', 80);
      await sleep(300);
      const data = await res.json();
      updateLoading('Done!', 100);
      await sleep(200);
      hideLoading();
      addHistory(url1);
      addHistory(url2);
      DOM.results.classList.add('hidden');
      renderCompare(data);
      DOM.resultsSection.classList.remove('hidden');
      DOM.compareResults.classList.remove('hidden');
      DOM.compareResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      hideLoading();
      DOM.resultsSection.classList.add('hidden');
      showError(err.message);
    } finally {
      DOM.analyzeBtn.disabled = false;
      DOM.analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
      DOM.analyzeBtn.querySelector('.btn-spinner').classList.add('hidden');
    }
  }

  // â”€â”€ Collapsible Cards â”€â”€
  function makeCollapsibleCard(title, icon) {
    const card = document.createElement('div'); card.className = 'card';
    const header = document.createElement('div'); header.className = 'card-header';
    const titleEl = document.createElement('h3'); titleEl.className = 'card-title';
    titleEl.innerHTML = `<span class="card-icon">${icon || '&#9670;'}</span> ${title}`;
    const chevron = document.createElement('span'); chevron.className = 'card-chevron'; chevron.textContent = '\u25BC';
    header.appendChild(titleEl); header.appendChild(chevron);
    const body = document.createElement('div'); body.className = 'card-body';
    header.addEventListener('click', () => card.classList.toggle('collapsed'));
    card.appendChild(header); card.appendChild(body);
    return { card, body };
  }

  // â”€â”€ Render Results â”€â”€
  function renderResults(data) {
    renderRepoHeader(data);
    renderNarrative(data);
    renderAiNarrative(data);
    renderDeepScan(data);
    renderDepGraph(data);
    renderLanguages(data);
    renderFileTree(data.fileTree);
    renderComponents(data);
    DOM.exportMdBtn.classList.remove('hidden');
    DOM.shareUrlBtn.classList.remove('hidden');
  }

  function renderAiNarrative(data) {
    if (!data.aiNarrative) { DOM.aiNarrativeContainer.classList.add('hidden'); return; }
    DOM.aiNarrativeContainer.classList.remove('hidden');
    DOM.aiNarrativeBody.innerHTML = data.aiNarrative
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    DOM.aiNarrativeBody.innerHTML = '<p>' + DOM.aiNarrativeBody.innerHTML + '</p>';

    let collapsed = false;
    const header = DOM.aiNarrativeHeader;
    const body = DOM.aiNarrativeBody;
    header.addEventListener('click', () => {
      collapsed = !collapsed;
      body.classList.toggle('hidden', collapsed);
      header.querySelector('.card-chevron').style.transform = collapsed ? 'rotate(-90deg)' : '';
    });
  }

  function renderRepoHeader(data) {
    const r = data.repo;
    DOM.repoLink.textContent = r.full_name;
    DOM.repoLink.href = r.html_url;
    DOM.repoDesc.textContent = r.description || 'No description';
    DOM.repoMeta.innerHTML = '';
    if (r.language) DOM.repoMeta.innerHTML += `<span class="meta-item">${r.language}</span>`;
    if (r.topics && r.topics.length) DOM.repoMeta.innerHTML += `<span class="meta-item">${r.topics.slice(0, 5).join(', ')}</span>`;
    DOM.statFiles.textContent = data.totalFiles.toLocaleString();
    DOM.statDirs.textContent = data.totalDirs.toLocaleString();
    DOM.statStars.textContent = r.stars.toLocaleString();
    DOM.techBadges.innerHTML = '';
    const pb = document.createElement('span'); pb.className = 'tech-badge'; pb.textContent = data.projectType;
    DOM.techBadges.appendChild(pb);
    for (const fw of data.frameworks) {
      const b = document.createElement('span'); b.className = `tech-badge ${fw.type}`; b.textContent = fw.name;
      DOM.techBadges.appendChild(b);
    }
  }

  function renderNarrative(data) {
    DOM.narrativeContainer.innerHTML = '';
    if (!data.narrative || !data.narrative.length) {
      const { card, body } = makeCollapsibleCard('Architecture Overview', '&#9670;');
      body.innerHTML = (data.summary || 'No summary available.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      DOM.narrativeContainer.appendChild(card);
      return;
    }
    for (const sec of data.narrative) {
      const { card, body } = makeCollapsibleCard(`${sec.icon} ${sec.heading}`, '&#9670;');
      body.className = 'card-body summary-content';
      const lines = sec.content.split('\n');
      let inList = false, listEl = null;
      for (const line of lines) {
        if (!line.trim() && inList) { inList = false; listEl = null; continue; }
        if (line.trim().startsWith('- ')) {
          if (!inList) { listEl = document.createElement('ul'); listEl.className = 'narrative-list'; body.appendChild(listEl); inList = true; }
          const li = document.createElement('li');
          li.innerHTML = line.trim().slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          listEl.appendChild(li);
        } else {
          inList = false; listEl = null;
          const p = document.createElement('p');
          p.innerHTML = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          if (p.textContent.trim()) body.appendChild(p);
        }
      }
      DOM.narrativeContainer.appendChild(card);
    }
  }

  function makeCard(title, text) {
    const { card, body } = makeCollapsibleCard(title, '&#9670;');
    body.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return card;
  }

  function renderDeepScan(data) {
    DOM.deepScanContainer.innerHTML = '';
    if (!data.deepScan || data.deepScan.length === 0) { DOM.deepScanContainer.classList.add('hidden'); return; }
    DOM.deepScanContainer.classList.remove('hidden');
    const { card, body } = makeCollapsibleCard('Deep File Scan', '&#9670;');
    for (const file of data.deepScan) {
      const block = document.createElement('div'); block.className = 'deep-file';
      const header = document.createElement('div'); header.className = 'deep-file-header';
      header.innerHTML = `<span class="deep-file-icon">ðŸ“„</span> <code>${file.path}</code> <span class="deep-file-meta">${file.lineCount} lines</span>`;
      block.appendChild(header);
      if (file.exports && file.exports.length) {
        const row = document.createElement('div'); row.className = 'deep-file-row';
        row.innerHTML = `<span class="deep-label">Exports:</span> ${file.exports.map(e => `<code>${e}</code>`).join(' ')}`;
        block.appendChild(row);
      }
      if (file.routes && file.routes.length) {
        const row = document.createElement('div'); row.className = 'deep-file-row';
        row.innerHTML = `<span class="deep-label">Routes:</span> ${file.routes.map(r => `<code>${r}</code>`).join(' ')}`;
        block.appendChild(row);
      }
      if (file.classes && file.classes.length) {
        const row = document.createElement('div'); row.className = 'deep-file-row';
        row.innerHTML = `<span class="deep-label">Classes:</span> ${file.classes.map(c => `<code>${c}</code>`).join(' ')}`;
        block.appendChild(row);
      }
      if (file.topFuncs && file.topFuncs.length) {
        const row = document.createElement('div'); row.className = 'deep-file-row';
        row.innerHTML = `<span class="deep-label">Functions:</span> ${file.topFuncs.map(f => `<code>${f}()</code>`).join(' ')}`;
        block.appendChild(row);
      }
      if (file.importCount > 0) {
        const row = document.createElement('div'); row.className = 'deep-file-row';
        row.innerHTML = `<span class="deep-label">Imports:</span> ${file.importCount} dependencies`;
        block.appendChild(row);
      }
      body.appendChild(block);
    }
    DOM.deepScanContainer.appendChild(card);
  }

  // â”€â”€ Dependency Graph â”€â”€
  function renderDepGraph(data) {
    const canvas = DOM.depGraphCanvas;
    if (!data.depGraph || !data.depGraph.nodes || data.depGraph.nodes.length < 2) {
      DOM.depGraphContainer.classList.add('hidden');
      return;
    }
    DOM.depGraphContainer.classList.remove('hidden');

    const header = DOM.depGraphHeader;
    const cardBody = header.nextElementSibling;
    let collapsed = false;
    header.addEventListener('click', () => {
      collapsed = !collapsed;
      cardBody.classList.toggle('hidden', collapsed);
      header.querySelector('.card-chevron').style.transform = collapsed ? 'rotate(-90deg)' : '';
    });

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = Math.min(rect.width - 4, 800);
    const H = 400;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(2, 2);

    const maxNodes = 20;
    const nodes = data.depGraph.nodes.slice(0, maxNodes);
    const edges = data.depGraph.edges.filter(e =>
      nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target)
    ).slice(0, 40);
    const nodeMap = {};

    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.35;
    for (let i = 0; i < nodes.length; i++) {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      nodes[i].x = cx + Math.cos(angle) * radius;
      nodes[i].y = cy + Math.sin(angle) * radius;
      nodes[i].vx = 0; nodes[i].vy = 0;
      nodes[i].radius = nodes[i].group === 'local' ? 8 : 6;
      nodeMap[nodes[i].id] = nodes[i];
    }

    let animId = null;
    let dragNode = null;

    const repulsion = 30000;
    const minDist = 80;
    const idealEdge = 130;
    const gravity = 0.003;
    const damping = 0.8;
    const margin = 35;

    function simulate() {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < minDist) {
            const force = repulsion / (dist * dist + 1);
            dx /= dist; dy /= dist;
            a.vx += dx * force; a.vy += dy * force;
            b.vx -= dx * force; b.vy -= dy * force;
          }
        }
      }
      for (const e of edges) {
        const s = nodeMap[e.source], t = nodeMap[e.target];
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - idealEdge) * 0.008;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
      }
      for (const n of nodes) {
        n.vx += (cx - n.x) * gravity;
        n.vy += (cy - n.y) * gravity;
        n.vx *= damping; n.vy *= damping;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(margin, Math.min(W - margin, n.x));
        n.y = Math.max(margin, Math.min(H - margin, n.y));
      }
      draw();
      if (!dragNode) animId = requestAnimationFrame(simulate);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (const e of edges) {
        const s = nodeMap[e.source], t = nodeMap[e.target];
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = e.type === 'local' ? 'rgba(108, 92, 231, 0.25)' : 'rgba(152, 152, 176, 0.15)';
        ctx.lineWidth = e.type === 'local' ? 1.5 : 1;
        ctx.stroke();
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.group === 'local' ? '#00cec9' : '#74b9ff';
        if (n === dragNode) {
          ctx.fillStyle = '#6c5ce7';
          ctx.shadowColor = 'rgba(108, 92, 231, 0.5)';
          ctx.shadowBlur = 12;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n === dragNode) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Labels (second pass with collision avoidance)
      const drawnLabels = [];
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const n of nodes) {
        const label = n.label.length > 10 ? n.label.slice(0, 9) + '\u2026' : n.label;
        const m = ctx.measureText(label);
        const tw = m.width + 8;
        const th = 14;
        const lx = n.x;
        const ly = n.y + n.radius + 4;

        let collides = false;
        for (const d of drawnLabels) {
          if (Math.abs(lx - d.x) < (tw + d.w) / 2 && Math.abs(ly - d.y) < th + 2) {
            collides = true; break;
          }
        }
        if (collides) continue;
        drawnLabels.push({ x: lx, y: ly, w: tw });

        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        ctx.beginPath();
        ctx.roundRect(lx - tw / 2, ly, tw, th, 3);
        ctx.fill();

        ctx.fillStyle = n.group === 'local' ? '#00cec9' : '#74b9ff';
        ctx.fillText(label, lx, ly + 2);
      }
    }

    // Mouse interaction
    function getMousePos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    function findNode(pos) {
      for (const n of nodes) {
        const dx = pos.x - n.x, dy = pos.y - n.y;
        if (dx * dx + dy * dy < (n.radius + 10) * (n.radius + 10)) return n;
      }
      return null;
    }

    canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);
      dragNode = findNode(pos);
      if (dragNode) {
        isDragging = true;
        cancelAnimationFrame(animId);
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!dragNode || !isDragging) return;
      const pos = getMousePos(e);
      dragNode.x = pos.x;
      dragNode.y = pos.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      draw();
    });
    canvas.addEventListener('mouseup', () => {
      if (dragNode && isDragging) {
        dragNode = null;
        isDragging = false;
        animId = requestAnimationFrame(simulate);
      }
    });
    canvas.addEventListener('mouseleave', () => {
      if (dragNode && isDragging) {
        dragNode = null;
        isDragging = false;
        animId = requestAnimationFrame(simulate);
      }
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getMousePos(touch);
      dragNode = findNode(pos);
      if (dragNode) {
        isDragging = true;
        cancelAnimationFrame(animId);
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!dragNode || !isDragging) return;
      const touch = e.touches[0];
      const pos = getMousePos(touch);
      dragNode.x = pos.x;
      dragNode.y = pos.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      draw();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (dragNode && isDragging) {
        dragNode = null;
        isDragging = false;
        animId = requestAnimationFrame(simulate);
      }
    }, { passive: false });

    animId = requestAnimationFrame(simulate);
  }
  function renderLanguages(data) {
    DOM.langBars.innerHTML = '';
    if (!data.languages || !data.languages.length) {
      DOM.langBars.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No language data available.</p>';
      return;
    }
    const max = data.languages[0].count;
    for (const lang of data.languages) {
      const row = document.createElement('div'); row.className = 'lang-bar-row';
      const lbl = document.createElement('span'); lbl.className = 'lang-bar-label'; lbl.textContent = LANGUAGE_NAMES[lang.ext] || lang.ext.toUpperCase();
      const track = document.createElement('div'); track.className = 'lang-bar-track';
      const fill = document.createElement('div'); fill.className = 'lang-bar-fill';
      fill.style.width = `${max > 0 ? (lang.count / max) * 100 : 0}%`;
      fill.style.background = LANG_COLORS[lang.ext] || 'var(--accent)';
      track.appendChild(fill);
      const cnt = document.createElement('span'); cnt.className = 'lang-bar-count'; cnt.textContent = lang.count;
      row.appendChild(lbl); row.appendChild(track); row.appendChild(cnt);
      DOM.langBars.appendChild(row);
    }
  }

  function renderFileTree(node) {
    DOM.fileTree.innerHTML = '';
    if (!node || !node.children || !node.children.length) {
      DOM.fileTree.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No files to display.</p>';
      return;
    }
    const sorted = [...node.children].sort((a, b) => a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name));
    for (const child of sorted) DOM.fileTree.appendChild(createTreeNode(child));
  }

  function createTreeNode(node, depth = 0) {
    const wrapper = document.createElement('div'); wrapper.className = 'tree-node';
    const row = document.createElement('div'); row.className = 'tree-row'; row.style.paddingLeft = `${depth * 20 + 6}px`;
    const toggle = document.createElement('span');
    toggle.className = node.type === 'dir' ? 'tree-toggle expanded' : 'tree-toggle-placeholder';
    if (node.type === 'dir') toggle.textContent = '\u25B6';
    row.appendChild(toggle);
    const icon = document.createElement('span'); icon.className = 'tree-icon'; icon.textContent = node.icon || (node.type === 'dir' ? '\uD83D\uDCC1' : '\uD83D\uDCC4');
    row.appendChild(icon);
    const name = document.createElement('span'); name.className = 'tree-name'; name.textContent = node.name;
    row.appendChild(name);
    if (node.type === 'file' && node.lang && node.lang !== 'Unknown') {
      const lang = document.createElement('span'); lang.className = 'tree-lang'; lang.textContent = node.lang;
      row.appendChild(lang);
    }
    wrapper.appendChild(row);
    if (node.type === 'dir' && node.children && node.children.length) {
      const children = document.createElement('div'); children.className = 'tree-children';
      const sorted = [...node.children].sort((a, b) => a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name));
      for (const child of sorted) children.appendChild(createTreeNode(child, depth + 1));
      wrapper.appendChild(children);
      let expanded = true;
      const toggleDir = () => { expanded = !expanded; children.classList.toggle('hidden', !expanded); toggle.classList.toggle('expanded', expanded); };
      toggle.addEventListener('click', (e) => { e.stopPropagation(); toggleDir(); });
      row.addEventListener('click', toggleDir);
    }
    return wrapper;
  }

  function expandAll() {
    document.querySelectorAll('#file-tree .tree-toggle').forEach(t => t.classList.add('expanded'));
    document.querySelectorAll('#file-tree .tree-children').forEach(c => c.classList.remove('hidden'));
  }
  function collapseAll() {
    document.querySelectorAll('#file-tree .tree-toggle').forEach(t => t.classList.remove('expanded'));
    document.querySelectorAll('#file-tree .tree-children').forEach(c => c.classList.add('hidden'));
  }

  function renderComponents(data) {
    DOM.componentsGrid.innerHTML = '';
    if (!data.components || !data.components.length) {
      DOM.componentsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No key components identified.</p>';
      return;
    }
    for (const comp of data.components.slice(0, 24)) {
      const card = document.createElement('div'); card.className = 'component-card';
      const icon = document.createElement('div'); icon.className = 'component-icon'; icon.textContent = comp.icon || '\uD83D\uDCC4';
      const name = document.createElement('div'); name.className = 'component-name'; name.textContent = comp.name;
      const path = document.createElement('div'); path.className = 'component-path'; path.textContent = comp.path;
      card.appendChild(icon); card.appendChild(name); card.appendChild(path);
      if (comp.lang && comp.lang !== 'Unknown') {
        const lang = document.createElement('span'); lang.className = 'component-lang'; lang.textContent = comp.lang;
        card.appendChild(lang);
      }
      DOM.componentsGrid.appendChild(card);
    }
  }

  // â”€â”€ Compare â”€â”€
  function renderCompare(data) {
    DOM.compareResults.innerHTML = '';
    const r1 = data.repo1, r2 = data.repo2;
    const header = document.createElement('div');
    header.className = 'compare-header';
    header.innerHTML = `<h2 class="compare-title">Comparing repos</h2>`;
    DOM.compareResults.appendChild(header);
    const grid = document.createElement('div'); grid.className = 'compare-grid';
    grid.innerHTML = `
      <div class="compare-col">${compareCol(r1, 'A')}</div>
      <div class="compare-divider"></div>
      <div class="compare-col">${compareCol(r2, 'B')}</div>`;
    DOM.compareResults.appendChild(grid);
    const { card: diff, body: diffBody } = makeCollapsibleCard('At a glance', '&#9670;');
    diffBody.innerHTML = `<div class="compare-diff">
        <div class="diff-row"><span class="diff-label">Project type</span><span class="diff-val">${r1.projectType}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.projectType}</span></div>
        <div class="diff-row"><span class="diff-label">Total files</span><span class="diff-val">${r1.totalFiles.toLocaleString()}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.totalFiles.toLocaleString()}</span></div>
        <div class="diff-row"><span class="diff-label">Stars</span><span class="diff-val">${(r1.repo.stars || 0).toLocaleString()}</span><span class="diff-vs">vs</span><span class="diff-val">${(r2.repo.stars || 0).toLocaleString()}</span></div>
        <div class="diff-row"><span class="diff-label">Primary language</span><span class="diff-val">${r1.repo.language || 'â€”'}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.repo.language || 'â€”'}</span></div>
      </div>`;
    DOM.compareResults.appendChild(diff);
    const act = document.createElement('div'); act.className = 'new-analysis';
    act.innerHTML = '<button id="compare-new-btn" class="btn btn-secondary">Compare different repos</button>';
    DOM.compareResults.appendChild(act);
    document.getElementById('compare-new-btn').addEventListener('click', () => {
      DOM.resultsSection.classList.add('hidden');
      DOM.inputSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function compareCol(r, label) {
    const fw = r.frameworks.map(f => f.name).join(', ') || 'none detected';
    const arch = r.archPatterns && r.archPatterns.length ? r.archPatterns[0].name : 'â€”';
    const langs = r.languages ? r.languages.slice(0, 4).map(l => `${LANGUAGE_NAMES[l.ext] || l.ext} (${l.count})`).join('<br>') : 'â€”';
    return `
      <div class="compare-repo-label">Repo ${label}</div>
      <div class="compare-repo-name">${r.repo.full_name}</div>
      <div class="compare-repo-desc">${r.repo.description || ''}</div>
      <div class="compare-section">Frameworks</div><div class="compare-value">${fw}</div>
      <div class="compare-section">Architecture</div><div class="compare-value">${arch}</div>
      <div class="compare-section">Top languages</div><div class="compare-value">${langs}</div>
      <div class="compare-section">Files</div><div class="compare-value">${r.totalFiles.toLocaleString()}</div>`;
  }

  // â”€â”€ Export / Share â”€â”€
  function generateMarkdown(data) {
    const r = data.repo;
    let md = `# ${r.full_name}\n\n`;
    if (r.description) md += `${r.description}\n\n`;
    md += `**Stars:** ${(r.stars || 0).toLocaleString()}  \n`;
    md += `**Files:** ${data.totalFiles.toLocaleString()}  \n`;
    md += `**Language:** ${r.language || 'â€”'}  \n\n`;
    if (data.narrative) {
      for (const sec of data.narrative) {
        md += `## ${sec.heading}\n\n`;
        const lines = sec.content.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('- ')) md += `${line.trim()}\n`;
          else md += `${line.trim()}\n\n`;
        }
        md += '\n';
      }
    }
    md += `---\n*Analyzed by repovision*\n`;
    return md;
  }

  async function copyMarkdown() {
    if (!currentData) return;
    const md = generateMarkdown(currentData);
    try {
      await navigator.clipboard.writeText(md);
      DOM.exportMdBtn.textContent = 'Copied!';
      setTimeout(() => { DOM.exportMdBtn.textContent = 'Copy Markdown'; }, 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      DOM.exportMdBtn.textContent = 'Copied!';
      setTimeout(() => { DOM.exportMdBtn.textContent = 'Copy Markdown'; }, 2000);
    }
  }

  function copyShareUrl() {
    const url = currentData?.repo?.html_url;
    if (!url) return;
    const shareUrl = `https://repovision-alpha.vercel.app?repo=${encodeURIComponent(url)}`;
    try {
      navigator.clipboard.writeText(shareUrl);
      DOM.shareUrlBtn.textContent = 'Copied!';
      setTimeout(() => { DOM.shareUrlBtn.textContent = 'Share'; }, 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      DOM.shareUrlBtn.textContent = 'Copied!';
      setTimeout(() => { DOM.shareUrlBtn.textContent = 'Share'; }, 2000);
    }
  }

  // â”€â”€ Events â”€â”€
  DOM.analyzeBtn.addEventListener('click', () => {
    const raw = DOM.repoUrl.value;
    const url = extractUrl(raw);
    if (!url) { showError('Enter a valid GitHub repo URL (e.g., https://github.com/owner/repo)'); return; }
    DOM.repoUrl.value = url;
    if (isCompare) {
      const raw2 = DOM.repoUrl2.value;
      const url2 = extractUrl(raw2);
      if (!url2) { showError('Enter a valid URL for the second repo'); return; }
      DOM.repoUrl2.value = url2;
      compareRepos(url, url2);
    } else if (isAiMode) {
      analyzeWithAI(url);
    } else { analyze(url); }
  });

  DOM.repoUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.analyzeBtn.click(); });
  DOM.repoUrl2.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.analyzeBtn.click(); });

  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fillRepoUrl(`https://github.com/${btn.dataset.repo}`);
    });
  });

  DOM.newAnalysisBtn.addEventListener('click', () => {
    DOM.resultsSection.classList.add('hidden');
    DOM.inputSection.scrollIntoView({ behavior: 'smooth' });
    DOM.repoUrl.focus();
  });

  DOM.expandAllBtn.addEventListener('click', expandAll);
  DOM.collapseAllBtn.addEventListener('click', collapseAll);

  const inputForm = document.querySelector('.input-form');
  DOM.compareToggle.addEventListener('change', () => {
    isCompare = DOM.compareToggle.checked;
    DOM.compareInput.classList.toggle('hidden', !isCompare);
    inputForm.classList.toggle('input-form-compare', isCompare);
    DOM.analyzeBtn.querySelector('.btn-text').textContent = isCompare ? 'Compare' : 'Analyze';
  });

  DOM.exportMdBtn.addEventListener('click', copyMarkdown);
  DOM.shareUrlBtn.addEventListener('click', copyShareUrl);

  // ── AI Toggle ──
  DOM.aiToggleBtn.addEventListener('click', () => {
    isAiMode = !isAiMode;
    DOM.aiSettings.classList.toggle('hidden', !isAiMode);
    DOM.aiToggleBtn.classList.toggle('btn-ai-active', isAiMode);
    DOM.analyzeBtn.querySelector('.btn-text').textContent = isAiMode ? 'Analyze (AI)' : (isCompare ? 'Compare' : 'Analyze');
  });
  DOM.aiKeyToggle.addEventListener('click', () => {
    aiKeyVisible = !aiKeyVisible;
    DOM.aiKey.type = aiKeyVisible ? 'text' : 'password';
    DOM.aiKeyToggle.textContent = aiKeyVisible ? 'Hide' : 'Show';
  });

  // â”€â”€ Query param handling â”€â”€
  (function handleQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const repo = params.get('repo');
    if (repo) { fillRepoUrl(repo); }
    if (params.get('error') === 'oauth-not-configured') {
      showError('GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
      setTimeout(() => { history.replaceState(null, '', window.location.pathname); }, 100);
    }
  })();

  // â”€â”€ Prevent Enter on compare toggle from submitting â”€â”€
  DOM.compareToggle.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

  renderHistory();

  // â”€â”€ Drag & drop â”€â”€
  let dragCounter = 0;
  DOM.dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; DOM.dropZone.classList.add('dragover'); });
  DOM.dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) DOM.dropZone.classList.remove('dragover'); });
  DOM.dropZone.addEventListener('dragover', (e) => e.preventDefault());
  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dragCounter = 0; DOM.dropZone.classList.remove('dragover');
    const text = e.dataTransfer.getData('text');
    if (text) { fillRepoUrl(text); }
  });

  // ── PWA: register service worker ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
})();
