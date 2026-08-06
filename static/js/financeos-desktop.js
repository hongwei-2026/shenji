(() => {
  const FALLBACK = [
    { id: 'ai-agent', name: 'AI', aliases: ['agent', '助手', 'ai'], path: '/os-ai', glyph: 'AI', color: '#6366f1', pinned: true, kind: 'ai' },
    { id: 'audit', name: '仪表盘', aliases: ['仪表盘', 'dashboard', '审计'], path: '/dashboard', glyph: '盘', color: '#1d4ed8', pinned: true },
    { id: 'edit', name: '表格编辑', aliases: ['编辑', '表格', 'edit'], path: '/edit', glyph: '编', color: '#0d9488', pinned: true },
    { id: 'files', name: 'Files', aliases: ['文件', 'files'], path: '/files', glyph: '📁', color: '#ca8a04', pinned: true, kind: 'files' },
    { id: 'terminal', name: 'Terminal', aliases: ['终端', 'terminal'], path: '/terminal', glyph: '>_', color: '#111827', pinned: true, kind: 'terminal' },
    { id: 'browser', name: 'Browser', aliases: ['浏览器', 'browser'], path: '/browser', glyph: 'B', color: '#0078d4', pinned: true, kind: 'browser' },
    { id: 'settings', name: 'Settings', aliases: ['设置'], path: '/profile', glyph: 'S', color: '#64748b' },
  ];

  let apps = [];
  let shortcuts = [];
  let zTop = 10;
  const windows = new Map();
  let recognition = null;
  let assistTimer = null;

  function toast(msg) {
    const el = document.getElementById('statusToast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function glyph(app) {
    return app.glyph || (app.name || '?').slice(0, 1);
  }

  function color(app) {
    return app.color || '#0078d4';
  }

  function appUrl(app) {
    const kind = app.kind || '';
    const path = app.url || app.path || '/';
    if (['browser', 'files', 'terminal', 'ai'].includes(kind)
      || path.startsWith('/browser') || path.startsWith('/files')
      || path.startsWith('/terminal') || path.startsWith('/os-ai')) {
      return path;
    }
    if (path.startsWith('http')) return path;
    const sep = path.includes('?') ? '&' : '?';
    return path.includes('chrome=os') ? path : `${path}${sep}chrome=os`;
  }

  function findApp(id) {
    return apps.find((a) => a.id === id || a.app_id === id);
  }

  function openAppById(id) {
    const app = findApp(id);
    if (app) openApp(app);
    else toast(`App not found: ${id}`);
  }

  window.FinanceOS = {
    openApp: (idOrApp) => {
      if (typeof idOrApp === 'string') openAppById(idOrApp);
      else if (idOrApp) openApp(idOrApp);
    },
    apps: () => apps.slice(),
  };

  function tickClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit',
    });
    document.getElementById('clockDate').textContent = now.toLocaleDateString('zh-CN');
  }

  async function checkHealth() {
    const dot = document.getElementById('svcDot');
    try {
      const r = await fetch('/api/financeos/health');
      const d = await r.json();
      dot.className = 'svc-dot ' + (d.success ? 'ok' : 'bad');
    } catch {
      dot.className = 'svc-dot bad';
    }
  }

  async function fetchShortcuts() {
    try {
      const res = await fetch('/api/fos/shortcuts', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.success) shortcuts = data.items || [];
    } catch {
      shortcuts = [];
    }
  }

  async function fetchApps() {
    try {
      const res = await fetch('/api/financeos/apps', { credentials: 'same-origin' });
      if (res.status === 401) {
        location.href = '/login?next=/os';
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'failed');
      apps = data.apps || [];
    } catch {
      apps = FALLBACK.slice();
    }
    await fetchShortcuts();
    render();
    // 登录后只显示桌面快捷方式，不自动打开任何窗口
  }

  function focusWin(id) {
    windows.forEach((w, wid) => {
      w.el.classList.toggle('active', wid === id);
      document.querySelector(`.task-btn[data-id="${wid}"]`)?.classList.toggle('active', wid === id);
    });
    const w = windows.get(id);
    if (!w) return;
    w.el.classList.remove('minimized');
    w.el.style.zIndex = String(++zTop);
  }

  function ensureTaskBtn(app) {
    const bar = document.getElementById('taskApps');
    let btn = bar.querySelector(`[data-id="${app.id}"]`);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'task-btn';
    btn.dataset.id = app.id;
    btn.title = app.name;
    btn.innerHTML = `<span class="tb-glyph" style="background:${color(app)}">${glyph(app)}</span>`;
    btn.onclick = () => {
      const w = windows.get(app.id);
      if (!w) return openApp(app);
      if (w.el.classList.contains('minimized')) {
        w.el.classList.remove('minimized');
        focusWin(app.id);
      } else if (w.el.classList.contains('active')) {
        w.el.classList.add('minimized');
        w.el.classList.remove('active');
        btn.classList.remove('active');
      } else {
        focusWin(app.id);
      }
    };
    bar.appendChild(btn);
    return btn;
  }

  async function runAssist(appId) {
    clearTimeout(assistTimer);
    const bar = document.getElementById('assistBar');
    try {
      const res = await fetch(`/api/fos/assist?app_id=${encodeURIComponent(appId)}`, { credentials: 'same-origin' });
      const data = await res.json();
      // 不自动打开任何辅助窗；也不再推荐弹出 AI（避免一登录/一点应用就弹 AI）
      const suggestions = (data.suggestions || []).filter(
        (s) => s.app_id !== 'ai-agent' && findApp(s.app_id) && !windows.has(s.app_id)
      );
      if (!suggestions.length) {
        bar.hidden = true;
        return;
      }
      bar.hidden = false;
      bar.innerHTML = `<span class="assist-msg">Assist:</span>` +
        suggestions.map((s) => {
          const a = findApp(s.app_id);
          return `<button type="button" data-id="${s.app_id}" title="${s.reason}">${a ? a.name : s.app_id}</button>`;
        }).join('') +
        `<button type="button" class="ghost" data-dismiss="1">Dismiss</button>`;
      bar.querySelectorAll('button').forEach((btn) => {
        if (btn.dataset.dismiss) {
          btn.onclick = () => { bar.hidden = true; };
          return;
        }
        btn.onclick = () => {
          openAppById(btn.dataset.id);
          bar.hidden = true;
        };
      });
      assistTimer = setTimeout(() => { bar.hidden = true; }, 12000);
    } catch {
      bar.hidden = true;
    }
  }

  function openApp(app, opts = {}) {
    const existing = windows.get(app.id);
    if (existing) {
      existing.el.classList.remove('minimized');
      focusWin(app.id);
      return;
    }
    const layer = document.getElementById('windowLayer');
    const offset = (windows.size % 6) * 26;
    const el = document.createElement('div');
    el.className = 'fos-window' + (opts.maximize ? ' maximized' : '');
    el.style.left = `${48 + offset}px`;
    el.style.top = `${24 + offset}px`;
    el.innerHTML = `
      <div class="fos-titlebar">
        <span class="app-dot" style="background:${color(app)}"></span>
        <span class="title">${app.name}</span>
        <div class="ops">
          <button type="button" data-act="min" title="Minimize">─</button>
          <button type="button" data-act="max" title="Maximize">▢</button>
          <button type="button" class="close" data-act="close" title="Close">✕</button>
        </div>
      </div>
      <iframe class="fos-frame" src="${appUrl(app)}" title="${app.name}" allow="clipboard-read; clipboard-write; microphone"></iframe>
    `;
    layer.appendChild(el);
    windows.set(app.id, { el, app });
    ensureTaskBtn(app);
    focusWin(app.id);
    bindWindowChrome(app.id, el);
    if (!opts.silentAssist && app.kind !== 'ai') {
      runAssist(app.id);
    }
  }

  function openFileShortcut(sc) {
    openApp({
      id: `file:${sc.file}`,
      name: sc.name || sc.file,
      path: `/files`,
      glyph: sc.glyph || '📄',
      color: sc.color || '#64748b',
      kind: 'files',
    });
    toast(`Open Files → ${sc.file}`);
  }

  function openShortcut(sc) {
    if (sc.kind === 'file') return openFileShortcut(sc);
    const app = findApp(sc.app_id || sc.id);
    if (app) {
      openApp({ ...app, name: sc.name || app.name, path: sc.path || app.path });
      return;
    }
    if (sc.path || sc.app_id) {
      openApp({
        id: sc.app_id || sc.id,
        name: sc.name,
        path: sc.path || (sc.app_id === 'audit' ? '/dashboard' : sc.app_id === 'edit' ? '/edit' : '/'),
        glyph: sc.glyph,
        color: sc.color,
        kind: sc.kind || 'app',
      });
    }
  }

  function bindWindowChrome(id, el) {
    const bar = el.querySelector('.fos-titlebar');
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || el.classList.contains('maximized')) return;
      focusWin(id);
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const ox = rect.left;
      const oy = rect.top;
      function onMove(ev) {
        el.style.left = `${ox + ev.clientX - startX}px`;
        el.style.top = `${Math.max(0, oy + ev.clientY - startY)}px`;
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    el.addEventListener('mousedown', () => focusWin(id));
    el.querySelector('[data-act="min"]').onclick = () => {
      el.classList.add('minimized');
      el.classList.remove('active');
      document.querySelector(`.task-btn[data-id="${id}"]`)?.classList.remove('active');
    };
    el.querySelector('[data-act="max"]').onclick = () => {
      el.classList.toggle('maximized');
      focusWin(id);
    };
    el.querySelector('[data-act="close"]').onclick = () => {
      el.remove();
      windows.delete(id);
      document.querySelector(`.task-btn[data-id="${id}"]`)?.remove();
    };
  }

  /** Match natural language / voice to an app and open it. */
  function resolveApp(text) {
    const q = (text || '').trim().toLowerCase();
    if (!q) return null;
    const cleaned = q
      .replace(/^(请|帮我|给我|我想|我要|麻烦|打开|开启|启动|进入|open|launch|start|run|go\s+to)\s*/gi, '')
      .replace(/\s*(应用|程序|软件|app|please)$/gi, '')
      .trim() || q;

    const score = (app) => {
      const names = [
        app.name, app.id, app.description,
        ...(app.aliases || []),
      ].filter(Boolean).map((s) => String(s).toLowerCase());
      let best = 0;
      for (const n of names) {
        if (!n) continue;
        if (cleaned === n || q === n) best = Math.max(best, 100);
        else if (cleaned.includes(n) || n.includes(cleaned)) best = Math.max(best, 80);
        else if (q.includes(n)) best = Math.max(best, 70);
      }
      return best;
    };

    let bestApp = null;
    let bestScore = 0;
    for (const app of apps) {
      const s = score(app);
      if (s > bestScore) {
        bestScore = s;
        bestApp = app;
      }
    }
    return bestScore >= 70 ? bestApp : null;
  }

  function handleAiCommand(raw) {
    const text = (raw || '').trim();
    if (!text) return;
    const app = resolveApp(text);
    if (!app) {
      toast('No matching app');
      return;
    }
    closeStart();
    openApp(app);
    toast(`Opened ${app.name}`);
    document.getElementById('aiCmdInput').value = '';
  }

  let viewMode = 'category'; // category | list
  let startOpen = false;

  function filteredApps(q) {
    const s = (q || '').trim().toLowerCase();
    if (!s) return apps;
    return apps.filter((a) =>
      [a.name, a.id, ...(a.aliases || [])].join(' ').toLowerCase().includes(s)
    );
  }

  function groupByCategory(list) {
    const order = ['finance', 'workflow', 'data', 'audit', 'ai', 'collab', 'system'];
    const groups = {};
    list.forEach((a) => {
      const key = a.category || 'system';
      (groups[key] ||= { key, label: a.category_label || key, apps: [] }).apps.push(a);
    });
    return order
      .filter((k) => groups[k])
      .map((k) => groups[k])
      .concat(Object.values(groups).filter((g) => !order.includes(g.key)));
  }

  /** 桌面必显：仪表盘、表格编辑（不依赖接口/权限缓存） */
  const MUST_DESKTOP = [
    { id: 'app-audit', kind: 'app', app_id: 'audit', name: '仪表盘', glyph: '盘', color: '#1d4ed8', path: '/dashboard' },
    { id: 'app-edit', kind: 'app', app_id: 'edit', name: '表格编辑', glyph: '编', color: '#0d9488', path: '/edit' },
  ];

  function renderIcons() {
    const grid = document.getElementById('iconGrid');
    const map = new Map();
    MUST_DESKTOP.forEach((sc) => map.set(sc.app_id, { ...sc }));
    (shortcuts.length ? shortcuts : []).forEach((sc) => {
      if (sc.kind === 'app' && (sc.app_id === 'audit' || sc.app_id === 'edit')) {
        const base = map.get(sc.app_id) || MUST_DESKTOP.find((m) => m.app_id === sc.app_id);
        map.set(sc.app_id, { ...base, ...sc, name: base.name, glyph: base.glyph, path: base.path });
        return;
      }
      const key = sc.app_id || sc.id;
      if (!map.has(key)) map.set(key, sc);
    });
    // 若接口快捷方式为空，用 pinned / FALLBACK 补齐（仍保留仪表盘/表格编辑在最前）
    if (shortcuts.length === 0) {
      const pinned = (apps.filter((a) => a.pinned).length ? apps.filter((a) => a.pinned) : apps.slice(0, 8));
      pinned.forEach((a) => {
        if (!map.has(a.id)) {
          map.set(a.id, {
            id: `app-${a.id}`, kind: 'app', app_id: a.id, name: a.name,
            glyph: a.glyph, color: a.color, path: a.path,
          });
        }
      });
    }
    const order = ['audit', 'edit', 'ai-agent', 'files', 'terminal', 'browser', 'upload'];
    const deskItems = Array.from(map.values()).sort((a, b) => {
      const ia = order.indexOf(a.app_id);
      const ib = order.indexOf(b.app_id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (!deskItems.length) {
      grid.innerHTML = `<div class="empty-hint">No shortcuts</div>`;
      return;
    }
    grid.innerHTML = deskItems.map((sc) => `
      <button type="button" class="desk-icon" data-sc="${sc.id}" data-app="${sc.app_id || ''}" title="${sc.name}">
        <span class="glyph" style="background:${sc.color || '#0078d4'}">${sc.glyph || '•'}</span>
        <span class="label">${sc.name}</span>
      </button>
    `).join('');
    grid.querySelectorAll('.desk-icon').forEach((btn) => {
      btn.onclick = () => {
        const sc = deskItems.find((x) => x.id === btn.dataset.sc)
          || MUST_DESKTOP.find((x) => x.app_id === btn.dataset.app);
        if (sc) openShortcut(sc);
      };
    });
  }

  function openFromId(id) {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    openApp(app);
    closeStart();
  }

  function openFolder(catKey, label, items) {
    const fly = document.getElementById('folderFlyout');
    const menu = document.getElementById('startMenu');
    document.getElementById('folderTitle').textContent = label;
    document.getElementById('folderGrid').innerHTML = items.map((app) => `
      <button type="button" class="start-pin" data-id="${app.id}" title="${app.name}">
        <span class="glyph" style="background:${color(app)}">${glyph(app)}</span>
        <span class="label">${app.name}</span>
      </button>
    `).join('');
    document.getElementById('folderGrid').querySelectorAll('.start-pin').forEach((btn) => {
      btn.onclick = () => openFromId(btn.dataset.id);
    });
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    fly.classList.add('is-open');
    fly.setAttribute('aria-hidden', 'false');
    document.getElementById('startSmoke').classList.add('is-on');
  }

  function closeFolder() {
    const fly = document.getElementById('folderFlyout');
    fly.classList.remove('is-open');
    fly.setAttribute('aria-hidden', 'true');
  }

  function renderStart(q) {
    const list = document.getElementById('startList');
    const pinned = document.getElementById('startPinned');
    const cats = document.getElementById('startCategories');
    const visible = filteredApps(q);
    const pins = (visible.filter((a) => a.pinned).length
      ? visible.filter((a) => a.pinned)
      : visible).slice(0, 12);

    pinned.innerHTML = pins.map((app) => `
      <button type="button" class="start-pin" data-id="${app.id}" title="${app.name}">
        <span class="glyph" style="background:${color(app)}">${glyph(app)}</span>
        <span class="label">${app.name}</span>
      </button>
    `).join('');
    pinned.querySelectorAll('.start-pin').forEach((btn) => {
      btn.onclick = () => openFromId(btn.dataset.id);
    });

    const searching = !!(q || '').trim();
    const modeBtn = document.getElementById('btnViewMode');
    if (searching || viewMode === 'list') {
      cats.classList.add('is-hidden');
      list.classList.remove('is-hidden');
      if (modeBtn) modeBtn.textContent = 'View: List';
      list.innerHTML = visible.map((app) => `
        <button type="button" class="start-item" data-id="${app.id}">
          <span class="glyph" style="background:${color(app)}">${glyph(app)}</span>
          <span class="meta"><strong>${app.name}</strong></span>
        </button>
      `).join('') || '<div style="padding:12px;opacity:.5">No results</div>';
      list.querySelectorAll('.start-item').forEach((btn) => {
        btn.onclick = () => openFromId(btn.dataset.id);
      });
    } else {
      list.classList.add('is-hidden');
      cats.classList.remove('is-hidden');
      if (modeBtn) modeBtn.textContent = 'View: Category';
      const groups = groupByCategory(visible);
      cats.innerHTML = groups.map((g) => {
        const preview = g.apps.slice(0, 4);
        while (preview.length < 4) preview.push(null);
        return `
          <button type="button" class="cat-folder" data-cat="${g.key}">
            <div class="mini-grid">
              ${preview.map((app) => app
                ? `<span class="mini" style="background:${color(app)}">${glyph(app)}</span>`
                : `<span class="mini empty"></span>`
              ).join('')}
            </div>
            <span class="cat-name">${g.label}</span>
            <span class="cat-count">${g.apps.length}</span>
          </button>
        `;
      }).join('') || '<div style="padding:12px;opacity:.5">No apps</div>';
      cats.querySelectorAll('.cat-folder').forEach((btn) => {
        btn.onclick = () => {
          const g = groups.find((x) => x.key === btn.dataset.cat);
          if (g) openFolder(g.key, g.label, g.apps);
        };
      });
    }
  }

  function render() {
    renderIcons();
    renderStart(document.getElementById('startFilter')?.value || '');
  }

  function openStart() {
    startOpen = true;
    closeFolder();
    const menu = document.getElementById('startMenu');
    const smoke = document.getElementById('startSmoke');
    const btn = document.getElementById('btnStart');
    document.getElementById('startFilter').value = '';
    viewMode = 'category';
    renderStart('');
    // force reflow so open transition always plays
    menu.classList.remove('is-open');
    void menu.offsetWidth;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    smoke.classList.add('is-on');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.getElementById('startFilter')?.focus(), 80);
  }

  function closeStart() {
    startOpen = false;
    const menu = document.getElementById('startMenu');
    const smoke = document.getElementById('startSmoke');
    const btn = document.getElementById('btnStart');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    smoke.classList.remove('is-on');
    btn.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
    closeFolder();
  }

  function toggleStart() {
    if (startOpen || document.getElementById('folderFlyout').classList.contains('is-open')) {
      closeStart();
    } else {
      openStart();
    }
  }

  function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = document.getElementById('btnVoice');
    if (!SR) {
      mic.onclick = () => toast('Voice not supported in this browser');
      return;
    }
    recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => mic.classList.add('listening');
    recognition.onend = () => mic.classList.remove('listening');
    recognition.onerror = () => {
      mic.classList.remove('listening');
      toast('Voice failed');
    };
    recognition.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      document.getElementById('aiCmdInput').value = text;
      handleAiCommand(text);
    };
    mic.onclick = () => {
      try {
        recognition.start();
      } catch {
        try { recognition.stop(); } catch { /* ignore */ }
      }
    };
  }

  document.getElementById('btnStart').onclick = (e) => {
    e.stopPropagation();
    toggleStart();
  };
  document.getElementById('startSmoke').onclick = () => closeStart();
  document.getElementById('btnRefresh').onclick = () => fetchApps();
  document.getElementById('startFilter').oninput = (e) => renderStart(e.target.value);
  document.getElementById('btnViewMode').onclick = () => {
    viewMode = viewMode === 'category' ? 'list' : 'category';
    renderStart(document.getElementById('startFilter').value);
  };
  document.getElementById('btnAllApps').onclick = () => {
    viewMode = 'list';
    document.getElementById('startFilter').value = '';
    renderStart('');
  };
  document.getElementById('folderBack').onclick = (e) => {
    e.stopPropagation();
    closeFolder();
    openStart();
  };

  document.getElementById('aiCmdForm').onsubmit = (e) => {
    e.preventDefault();
    handleAiCommand(document.getElementById('aiCmdInput').value);
  };

  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (!d.source || !String(d.source).startsWith('financeos-')) return;
    if (d.type === 'open_app' && d.app_id) openAppById(d.app_id);
    if (d.type === 'open_url' && d.url) {
      const raw = String(d.url).split('?')[0];
      const matched = apps.find((a) => {
        const p = String(a.path || '').split('?')[0];
        return p && (raw === p || raw.startsWith(p) || p.startsWith(raw));
      });
      if (matched) openApp(matched);
      else openApp({ id: `url-${Date.now()}`, name: d.reason || 'App', path: d.url, color: '#0078d4', glyph: '↗' });
    }
    if (d.type === 'ai_command' && d.text && !d.from_agent) handleAiCommand(d.text);
    if (d.type === 'refresh_desktop') fetchShortcuts().then(() => renderIcons());
    if (d.type === 'toast' && d.message) toast(d.message);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStart();
    if (e.ctrlKey && e.key === 'Escape') {
      e.preventDefault();
      toggleStart();
    }
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      document.getElementById('aiCmdInput')?.focus();
    }
  });

  setupVoice();
  tickClock();
  setInterval(tickClock, 1000);
  checkHealth();
  setInterval(checkHealth, 15000);

  // HTML 预置图标：在 API 返回前也可打开仪表盘 / 表格编辑
  document.querySelectorAll('[data-boot-app]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.bootApp;
      const sc = MUST_DESKTOP.find((x) => x.app_id === id);
      if (sc) openShortcut(sc);
    };
  });

  fetchApps();
})();
