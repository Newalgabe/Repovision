(() => {
  const DOM = {
    inputSection: document.getElementById('input-section'),
    resultsSection: document.getElementById('results-section'),
    repoUrl: document.getElementById('repo-url'),
    analyzeBtn: document.getElementById('analyze-btn'),
    errorMsg: document.getElementById('error-msg'),
    dropZone: document.getElementById('drop-zone'),
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
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
    langBars: document.getElementById('lang-bars'),
    fileTree: document.getElementById('file-tree'),
    componentsGrid: document.getElementById('components-grid'),
    expandAllBtn: document.getElementById('expand-all-btn'),
    collapseAllBtn: document.getElementById('collapse-all-btn'),
    newAnalysisBtn: document.getElementById('new-analysis-btn'),
  };

  let currentData = null;
  let treeState = {};

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

  function on(fn) { document.addEventListener('DOMContentLoaded', fn); }

  function extractUrl(input) {
    input = input.trim();
    if (input.includes('github.com')) {
      const m = input.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|\.git|$)/);
      return m ? `https://github.com/${m[1]}` : null;
    }
    if (/^[\w.-]+\/[\w.-]+$/.test(input)) {
      return `https://github.com/${input}`;
    }
    return null;
  }

  function showError(msg) {
    DOM.errorMsg.textContent = msg;
    DOM.errorMsg.classList.remove('hidden');
  }

  function hideError() {
    DOM.errorMsg.classList.add('hidden');
  }

  function showLoading() {
    DOM.results.classList.add('hidden');
    DOM.loading.classList.remove('hidden');
    DOM.loadingMsg.textContent = 'Connecting to GitHub...';
    DOM.loadingBar.style.width = '10%';
  }

  function updateLoading(msg, pct) {
    DOM.loadingMsg.textContent = msg;
    DOM.loadingBar.style.width = `${pct}%`;
  }

  function hideLoading() {
    DOM.loading.classList.add('hidden');
  }

  async function analyze(url) {
    hideError();
    showLoading();
    DOM.analyzeBtn.disabled = true;
    DOM.analyzeBtn.querySelector('.btn-text').classList.add('hidden');
    DOM.analyzeBtn.querySelector('.btn-spinner').classList.remove('hidden');

    try {
      updateLoading('Fetching repository structure...', 25);
      await sleep(300);

      updateLoading('Reading files and analyzing architecture...', 50);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      updateLoading('Building visual map...', 80);
      await sleep(400);

      const data = await res.json();
      currentData = data;

      updateLoading('Done!', 100);
      await sleep(300);

      hideLoading();
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

  function renderResults(data) {
    renderRepoHeader(data);
    renderNarrative(data);
    renderLanguages(data);
    renderFileTree(data.fileTree);
    renderComponents(data);
  }

  function renderRepoHeader(data) {
    const r = data.repo;
    DOM.repoLink.textContent = r.full_name;
    DOM.repoLink.href = r.html_url;
    DOM.repoDesc.textContent = r.description || 'No description';

    DOM.repoMeta.innerHTML = '';
    if (r.language) {
      DOM.repoMeta.innerHTML += `<span class="meta-item">${r.language}</span>`;
    }
    if (r.topics && r.topics.length > 0) {
      DOM.repoMeta.innerHTML += `<span class="meta-item">${r.topics.slice(0, 5).join(', ')}</span>`;
    }

    DOM.statFiles.textContent = data.totalFiles.toLocaleString();
    DOM.statDirs.textContent = data.totalDirs.toLocaleString();
    DOM.statStars.textContent = r.stars.toLocaleString();

    DOM.techBadges.innerHTML = '';
    const projectBadge = document.createElement('span');
    projectBadge.className = 'tech-badge';
    projectBadge.textContent = data.projectType;
    DOM.techBadges.appendChild(projectBadge);

    for (const fw of data.frameworks) {
      const badge = document.createElement('span');
      badge.className = `tech-badge ${fw.type}`;
      badge.textContent = fw.name;
      DOM.techBadges.appendChild(badge);
    }
  }

  function renderNarrative(data) {
    DOM.narrativeContainer.innerHTML = '';

    if (!data.narrative || data.narrative.length === 0) {
      const fallback = document.createElement('div');
      fallback.className = 'card';
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.innerHTML = '<span class="card-icon">&#9670;</span> Architecture Overview';
      fallback.appendChild(title);
      const content = document.createElement('div');
      content.className = 'summary-content';
      content.innerHTML = (data.summary || 'No summary available.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      fallback.appendChild(content);
      DOM.narrativeContainer.appendChild(fallback);
      return;
    }

    for (const section of data.narrative) {
      const card = document.createElement('div');
      card.className = 'card narrative-card';

      const h3 = document.createElement('h3');
      h3.className = 'card-title';
      h3.innerHTML = `<span class="card-icon">&#9670;</span> ${section.icon} ${section.heading}`;
      card.appendChild(h3);

      const content = document.createElement('div');
      content.className = 'summary-content';

      const lines = section.content.split('\n');
      let inList = false;
      let listEl = null;

      for (const line of lines) {
        if (!line.trim() && inList) {
          inList = false;
          listEl = null;
          continue;
        }
        if (line.trim().startsWith('- ')) {
          if (!inList) {
            listEl = document.createElement('ul');
            listEl.className = 'narrative-list';
            content.appendChild(listEl);
            inList = true;
          }
          const li = document.createElement('li');
          li.innerHTML = line.trim().slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          listEl.appendChild(li);
        } else {
          inList = false;
          listEl = null;
          const p = document.createElement('p');
          p.innerHTML = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
          if (p.textContent.trim()) content.appendChild(p);
        }
      }

      card.appendChild(content);
      DOM.narrativeContainer.appendChild(card);
    }
  }

  function renderLanguages(data) {
    DOM.langBars.innerHTML = '';
    if (!data.languages || data.languages.length === 0) {
      DOM.langBars.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No language data available.</p>';
      return;
    }

    const maxCount = data.languages[0].count;
    for (const lang of data.languages) {
      const row = document.createElement('div');
      row.className = 'lang-bar-row';

      const label = document.createElement('span');
      label.className = 'lang-bar-label';
      label.textContent = LANGUAGE_NAMES[lang.ext] || lang.ext.toUpperCase();
      row.appendChild(label);

      const track = document.createElement('div');
      track.className = 'lang-bar-track';

      const fill = document.createElement('div');
      fill.className = 'lang-bar-fill';
      const pct = maxCount > 0 ? (lang.count / maxCount) * 100 : 0;
      fill.style.width = `${pct}%`;
      fill.style.background = LANG_COLORS[lang.ext] || 'var(--accent)';
      track.appendChild(fill);
      row.appendChild(track);

      const count = document.createElement('span');
      count.className = 'lang-bar-count';
      count.textContent = lang.count;
      row.appendChild(count);

      DOM.langBars.appendChild(row);
    }
  }

  function renderFileTree(node, container) {
    DOM.fileTree.innerHTML = '';
    treeState = {};

    if (!node || !node.children || node.children.length === 0) {
      DOM.fileTree.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No files to display.</p>';
      return;
    }

    const sorted = [...node.children].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const child of sorted) {
      const el = createTreeNode(child);
      DOM.fileTree.appendChild(el);
    }
  }

  function createTreeNode(node, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.paddingLeft = `${depth * 20 + 6}px`;

    const toggle = document.createElement('span');
    if (node.type === 'dir') {
      toggle.className = 'tree-toggle expanded';
      toggle.textContent = '\u25B6';
    } else {
      toggle.className = 'tree-toggle-placeholder';
    }
    row.appendChild(toggle);

    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = node.icon || (node.type === 'dir' ? '\uD83D\uDCC1' : '\uD83D\uDCC4');
    row.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name;
    row.appendChild(name);

    if (node.type === 'file' && node.lang && node.lang !== 'Unknown') {
      const lang = document.createElement('span');
      lang.className = 'tree-lang';
      lang.textContent = node.lang;
      row.appendChild(lang);
    }

    wrapper.appendChild(row);

    if (node.type === 'dir' && node.children && node.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';

      const sorted = [...node.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const child of sorted) {
        children.appendChild(createTreeNode(child, depth + 1));
      }
      wrapper.appendChild(children);

      let expanded = true;
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        expanded = !expanded;
        children.classList.toggle('hidden', !expanded);
        toggle.classList.toggle('expanded', expanded);
      });

      row.addEventListener('click', () => {
        expanded = !expanded;
        children.classList.toggle('hidden', !expanded);
        toggle.classList.toggle('expanded', expanded);
      });
    }

    return wrapper;
  }

  function expandAll(node) {
    if (!node) node = DOM.fileTree;
    const toggles = node.querySelectorAll('.tree-toggle');
    const children = node.querySelectorAll('.tree-children');
    toggles.forEach(t => t.classList.add('expanded'));
    children.forEach(c => c.classList.remove('hidden'));
  }

  function collapseAll(node) {
    if (!node) node = DOM.fileTree;
    const toggles = node.querySelectorAll('.tree-toggle');
    const children = node.querySelectorAll('.tree-children');
    toggles.forEach(t => t.classList.remove('expanded'));
    children.forEach(c => c.classList.add('hidden'));
  }

  function renderComponents(data) {
    DOM.componentsGrid.innerHTML = '';
    if (!data.components || data.components.length === 0) {
      DOM.componentsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No key components identified.</p>';
      return;
    }

    for (const comp of data.components.slice(0, 24)) {
      const card = document.createElement('div');
      card.className = 'component-card';

      const icon = document.createElement('div');
      icon.className = 'component-icon';
      icon.textContent = comp.icon || '\uD83D\uDCC4';
      card.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'component-name';
      name.textContent = comp.name;
      card.appendChild(name);

      const path = document.createElement('div');
      path.className = 'component-path';
      path.textContent = comp.path;
      card.appendChild(path);

      if (comp.lang && comp.lang !== 'Unknown') {
        const lang = document.createElement('span');
        lang.className = 'component-lang';
        lang.textContent = comp.lang;
        card.appendChild(lang);
      }

      DOM.componentsGrid.appendChild(card);
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

  DOM.analyzeBtn.addEventListener('click', () => {
    const raw = DOM.repoUrl.value;
    const url = extractUrl(raw);
    if (!url) {
      showError('Enter a valid GitHub repo URL (e.g., https://github.com/owner/repo)');
      return;
    }
    DOM.repoUrl.value = url;
    analyze(url);
  });

  DOM.repoUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') DOM.analyzeBtn.click();
  });

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

  DOM.expandAllBtn.addEventListener('click', () => expandAll());
  DOM.collapseAllBtn.addEventListener('click', () => collapseAll());

  let dragCounter = 0;
  DOM.dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    DOM.dropZone.classList.add('dragover');
  });
  DOM.dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) DOM.dropZone.classList.remove('dragover');
  });
  DOM.dropZone.addEventListener('dragover', (e) => e.preventDefault());
  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    DOM.dropZone.classList.remove('dragover');
    const text = e.dataTransfer.getData('text');
    if (text) {
      DOM.repoUrl.value = text;
      DOM.analyzeBtn.click();
    }
  });
})();
