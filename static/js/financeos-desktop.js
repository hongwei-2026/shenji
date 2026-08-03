(() => {
  const ICON_GLYPH = {
    'journal-text': '记',
    'cash-coin': '收',
    'credit-card': '付',
    receipt: '票',
    'clipboard2-check': '审',
    'chat-left-text': '讯',
    gear: '设',
  };

  const FALLBACK = [
    { id: 'vouchers', name: '凭证', description: '记账凭证', path: '/finance/vouchers', icon: 'journal-text', category_label: '财务' },
    { id: 'receivables', name: '应收', description: '应收账款', path: '/finance/receivables', icon: 'cash-coin', category_label: '财务' },
    { id: 'payables', name: '应付', description: '应付账款', path: '/finance/payables', icon: 'credit-card', category_label: '财务' },
    { id: 'invoices', name: '发票', description: '发票管理', path: '/finance/invoices', icon: 'receipt', category_label: '财务' },
    { id: 'audit', name: '审计', description: '审计概览', path: '/dashboard', icon: 'clipboard2-check', category_label: '审计' },
    { id: 'chat', name: '消息', description: '即时消息', path: '/chat', icon: 'chat-left-text', category_label: '协作' },
    { id: 'settings', name: '设置', description: '个人设置', path: '/profile', icon: 'gear', category_label: '系统' },
  ];

  let apps = [];
  let zTop = 10;
  const windows = new Map();

  function toast(msg) {
    const el = document.getElementById('statusToast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function glyph(app) {
    return ICON_GLYPH[app.icon] || (app.name || '?').slice(0, 1);
  }

  function appUrl(app) {
    if (app.url && app.url.startsWith('http')) return app.url;
    const path = app.url || app.path || '/';
    const sep = path.includes('?') ? '&' : '?';
    return path.includes('chrome=os') ? path : `${path}${sep}chrome=os`;
  }

  function tickClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit',
    });
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

  async function fetchApps() {
    try {
      const res = await fetch('/api/financeos/apps', { credentials: 'same-origin' });
      if (res.status === 401) {
        location.href = '/login?next=/os';
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '加载失败');
      apps = data.apps || [];
      if (!apps.length) toast('当前账号暂无可用应用');
    } catch (e) {
      apps = FALLBACK.slice();
      toast('应用列表加载失败，显示默认图标');
    }
    render();
  }

  function focusWin(id) {
    windows.forEach((w, wid) => {
      w.el.classList.toggle('active', wid === id);
      const btn = document.querySelector(`.task-btn[data-id="${wid}"]`);
      if (btn) btn.classList.toggle('active', wid === id);
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
    btn.textContent = app.name;
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

  function openApp(app) {
    const existing = windows.get(app.id);
    if (existing) {
      existing.el.classList.remove('minimized');
      focusWin(app.id);
      return;
    }

    const layer = document.getElementById('windowLayer');
    const offset = (windows.size % 6) * 28;
    const el = document.createElement('div');
    el.className = 'fos-window';
    el.style.left = `${48 + offset}px`;
    el.style.top = `${36 + offset}px`;
    el.innerHTML = `
      <div class="fos-titlebar">
        <span class="title">${app.name}</span>
        <div class="ops">
          <button type="button" data-act="min" title="最小化">─</button>
          <button type="button" data-act="max" title="最大化">▢</button>
          <button type="button" class="close" data-act="close" title="关闭">✕</button>
        </div>
      </div>
      <iframe class="fos-frame" src="${appUrl(app)}" title="${app.name}"></iframe>
    `;
    layer.appendChild(el);
    windows.set(app.id, { el, app });
    ensureTaskBtn(app);
    focusWin(app.id);
    bindWindowChrome(app.id, el);
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

  function renderIcons() {
    const grid = document.getElementById('iconGrid');
    if (!apps.length) {
      grid.innerHTML = `<div class="empty-hint">暂无桌面应用。请确认账号权限，或点击开始菜单刷新。</div>`;
      return;
    }
    grid.innerHTML = apps.map((app) => `
      <button type="button" class="desk-icon" data-id="${app.id}">
        <span class="glyph">${glyph(app)}</span>
        <span class="label">${app.name}</span>
      </button>
    `).join('');
    grid.querySelectorAll('.desk-icon').forEach((btn) => {
      btn.onclick = () => {
        const app = apps.find((a) => a.id === btn.dataset.id);
        if (app) openApp(app);
      };
    });
  }

  function renderStart() {
    const list = document.getElementById('startList');
    const groups = {};
    apps.forEach((a) => {
      const key = a.category_label || a.category || '应用';
      (groups[key] ||= []).push(a);
    });
    list.innerHTML = Object.entries(groups).map(([cat, items]) => `
      <div class="start-cat">${cat}</div>
      ${items.map((app) => `
        <button type="button" class="start-item" data-id="${app.id}">
          <span class="glyph">${glyph(app)}</span>
          <span class="meta"><strong>${app.name}</strong><small>${app.description || ''}</small></span>
        </button>
      `).join('')}
    `).join('') || '<div class="start-cat">无可用应用</div>';
    list.querySelectorAll('.start-item').forEach((btn) => {
      btn.onclick = () => {
        const app = apps.find((a) => a.id === btn.dataset.id);
        if (app) {
          openApp(app);
          document.getElementById('startMenu').hidden = true;
        }
      };
    });
  }

  function render() {
    renderIcons();
    renderStart();
  }

  document.getElementById('btnStart').onclick = () => {
    const menu = document.getElementById('startMenu');
    menu.hidden = !menu.hidden;
  };
  document.getElementById('btnRefresh').onclick = () => fetchApps();
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('startMenu');
    if (menu.hidden) return;
    if (e.target.closest('#startMenu') || e.target.closest('#btnStart')) return;
    menu.hidden = true;
  });

  tickClock();
  setInterval(tickClock, 1000);
  checkHealth();
  setInterval(checkHealth, 15000);
  fetchApps();
})();
