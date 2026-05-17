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
  };

  let currentData = null;
  let isCompare = false;

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

  // ── History ──
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
      const short = url.replace('https://github.com/', '');
      btn.textContent = short;
      btn.title = url;
      btn.addEventListener('click', () => {
        DOM.repoUrl.value = url;
        DOM.analyzeBtn.click();
      });
      DOM.historyContainer.appendChild(btn);
    }
  }

  // ── URL handling ──
  function extractUrl(input) {
    input = input.trim();
    if (input.includes('github.com')) {
      const m = input.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|\.git|$)/);
      return m ? `https://github.com/${m[1]}` : null;
    }
    if (/^[\w.-]+\/[\w.-]+$/.test(input)) return `https://github.com/${input}`;
    return null;
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

  // ── Analyze ──
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

  // ── Render Results ──
  function renderResults(data) {
    renderRepoHeader(data);
    renderNarrative(data);
    renderDeepScan(data);
    renderLanguages(data);
    renderFileTree(data.fileTree);
    renderComponents(data);
    DOM.exportMdBtn.classList.remove('hidden');
    DOM.shareUrlBtn.classList.remove('hidden');
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
      const card = makeCard('Architecture Overview', data.summary || 'No summary available.');
      DOM.narrativeContainer.appendChild(card);
      return;
    }
    for (const sec of data.narrative) {
      const card = document.createElement('div');
      card.className = 'card narrative-card';
      const h3 = document.createElement('h3');
      h3.className = 'card-title';
      h3.innerHTML = `<span class="card-icon">&#9670;</span> ${sec.icon} ${sec.heading}`;
      card.appendChild(h3);
      const content = document.createElement('div');
      content.className = 'summary-content';
      const lines = sec.content.split('\n');
      let inList = false, listEl = null;
      for (const line of lines) {
        if (!line.trim() && inList) { inList = false; listEl = null; continue; }
        if (line.trim().startsWith('- ')) {
          if (!inList) { listEl = document.createElement('ul'); listEl.className = 'narrative-list'; content.appendChild(listEl); inList = true; }
          const li = document.createElement('li');
          li.innerHTML = line.trim().slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          listEl.appendChild(li);
        } else {
          inList = false; listEl = null;
          const p = document.createElement('p');
          p.innerHTML = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          if (p.textContent.trim()) content.appendChild(p);
        }
      }
      card.appendChild(content);
      DOM.narrativeContainer.appendChild(card);
    }
  }

  function makeCard(title, text) {
    const card = document.createElement('div'); card.className = 'card';
    const h3 = document.createElement('h3'); h3.className = 'card-title';
    h3.innerHTML = `<span class="card-icon">&#9670;</span> ${title}`; card.appendChild(h3);
    const div = document.createElement('div'); div.className = 'summary-content';
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    card.appendChild(div);
    return card;
  }

  function renderDeepScan(data) {
    DOM.deepScanContainer.innerHTML = '';
    if (!data.deepScan || data.deepScan.length === 0) { DOM.deepScanContainer.classList.add('hidden'); return; }
    DOM.deepScanContainer.classList.remove('hidden');
    const card = document.createElement('div'); card.className = 'card';
    const h3 = document.createElement('h3'); h3.className = 'card-title';
    h3.innerHTML = '<span class="card-icon">&#9670;</span> Deep File Scan';
    card.appendChild(h3);
    for (const file of data.deepScan) {
      const block = document.createElement('div'); block.className = 'deep-file';
      const header = document.createElement('div'); header.className = 'deep-file-header';
      header.innerHTML = `<span class="deep-file-icon">📄</span> <code>${file.path}</code> <span class="deep-file-meta">${file.lineCount} lines</span>`;
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
      card.appendChild(block);
    }
    DOM.deepScanContainer.appendChild(card);
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

  // ── Compare ──
  function renderCompare(data) {
    DOM.compareResults.innerHTML = '';
    const r1 = data.repo1, r2 = data.repo2;

    // Header
    const header = document.createElement('div');
    header.className = 'compare-header';
    header.innerHTML = `<h2 class="compare-title">Comparing repos</h2>`;
    DOM.compareResults.appendChild(header);

    // Side-by-side
    const grid = document.createElement('div'); grid.className = 'compare-grid';
    grid.innerHTML = `
      <div class="compare-col">${compareCol(r1, 'A')}</div>
      <div class="compare-divider"></div>
      <div class="compare-col">${compareCol(r2, 'B')}</div>
    `;
    DOM.compareResults.appendChild(grid);

    // Diff stats
    const diff = document.createElement('div'); diff.className = 'card';
    diff.innerHTML = `<h3 class="card-title"><span class="card-icon">&#9670;</span> At a glance</h3>
      <div class="compare-diff">
        <div class="diff-row"><span class="diff-label">Project type</span><span class="diff-val">${r1.projectType}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.projectType}</span></div>
        <div class="diff-row"><span class="diff-label">Total files</span><span class="diff-val">${r1.totalFiles.toLocaleString()}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.totalFiles.toLocaleString()}</span></div>
        <div class="diff-row"><span class="diff-label">Stars</span><span class="diff-val">${(r1.repo.stars || 0).toLocaleString()}</span><span class="diff-vs">vs</span><span class="diff-val">${(r2.repo.stars || 0).toLocaleString()}</span></div>
        <div class="diff-row"><span class="diff-label">Primary language</span><span class="diff-val">${r1.repo.language || '—'}</span><span class="diff-vs">vs</span><span class="diff-val">${r2.repo.language || '—'}</span></div>
      </div>`;
    DOM.compareResults.appendChild(diff);

    // Action
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
    const arch = r.archPatterns && r.archPatterns.length ? r.archPatterns[0].name : '—';
    const langs = r.languages ? r.languages.slice(0, 4).map(l => `${LANGUAGE_NAMES[l.ext] || l.ext} (${l.count})`).join('<br>') : '—';
    return `
      <div class="compare-repo-label">Repo ${label}</div>
      <div class="compare-repo-name">${r.repo.full_name}</div>
      <div class="compare-repo-desc">${r.repo.description || ''}</div>
      <div class="compare-section">Frameworks</div><div class="compare-value">${fw}</div>
      <div class="compare-section">Architecture</div><div class="compare-value">${arch}</div>
      <div class="compare-section">Top languages</div><div class="compare-value">${langs}</div>
      <div class="compare-section">Files</div><div class="compare-value">${r.totalFiles.toLocaleString()}</div>
    `;
  }

  // ── Export / Share ──
  function generateMarkdown(data) {
    const r = data.repo;
    let md = `# ${r.full_name}\n\n`;
    if (r.description) md += `${r.description}\n\n`;
    md += `**Stars:** ${(r.stars || 0).toLocaleString()}  \n`;
    md += `**Files:** ${data.totalFiles.toLocaleString()}  \n`;
    md += `**Language:** ${r.language || '—'}  \n\n`;
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
    const shareUrl = `${window.location.origin}?repo=${encodeURIComponent(url)}`;
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

  // ── Events ──
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
    } else {
      analyze(url);
    }
  });

  DOM.repoUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.analyzeBtn.click(); });
  DOM.repoUrl2.addEventListener('keydown', (e) => { if (e.key === 'Enter') DOM.analyzeBtn.click(); });

  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.repoUrl.value = `https://github.com/${btn.dataset.repo}`;
      DOM.analyzeBtn.click();
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

  // ── Share URL from query param ──
  (function loadShare() {
    const params = new URLSearchParams(window.location.search);
    const repo = params.get('repo');
    if (repo) {
      DOM.repoUrl.value = repo;
      DOM.analyzeBtn.click();
    }
  })();

  renderHistory();

  // ── Drag & drop ──
  let dragCounter = 0;
  DOM.dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; DOM.dropZone.classList.add('dragover'); });
  DOM.dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) DOM.dropZone.classList.remove('dragover'); });
  DOM.dropZone.addEventListener('dragover', (e) => e.preventDefault());
  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dragCounter = 0; DOM.dropZone.classList.remove('dragover');
    const text = e.dataTransfer.getData('text');
    if (text) { DOM.repoUrl.value = text; DOM.analyzeBtn.click(); }
  });

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
})();
