const FALLBACK_APPS = [
  { id: 'vouchers', name: '凭证', description: '记账凭证', path: '/finance/vouchers', url: '/finance/vouchers?chrome=os', icon: '记', category: 'finance', category_label: '财务' },
  { id: 'receivables', name: '应收', description: '应收账款', path: '/finance/receivables', url: '/finance/receivables?chrome=os', icon: '收', category: 'finance', category_label: '财务' },
  { id: 'payables', name: '应付', description: '应付账款', path: '/finance/payables', url: '/finance/payables?chrome=os', icon: '付', category: 'finance', category_label: '财务' },
  { id: 'invoices', name: '发票', description: '发票管理', path: '/finance/invoices', url: '/finance/invoices?chrome=os', icon: '票', category: 'finance', category_label: '财务' },
  { id: 'audit', name: '审计', description: '审计概览', path: '/dashboard', url: '/dashboard?chrome=os', icon: '审', category: 'audit', category_label: '审计' },
  { id: 'chat', name: '消息', description: '即时消息', path: '/chat', url: '/chat?chrome=os', icon: '讯', category: 'collab', category_label: '协作' },
  { id: 'settings', name: '设置', description: '个人设置', path: '/profile', url: '/profile?chrome=os', icon: '设', category: 'system', category_label: '系统' },
];

const ICON_GLYPH = {
  'journal-text': '记',
  'cash-coin': '收',
  'credit-card': '付',
  receipt: '票',
  'clipboard2-check': '审',
  'chat-left-text': '讯',
  gear: '设',
};

let apiBase = 'http://127.0.0.1:5000';
let apps = [];

function toast(msg) {
  const el = document.getElementById('statusToast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

function glyphFor(app) {
  if (app.icon && app.icon.length <= 2) return app.icon;
  return ICON_GLYPH[app.icon] || (app.name || '?').slice(0, 1);
}

function tickClock() {
  const d = new Date();
  document.getElementById('clock').textContent = d.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit',
  });
}

async function resolveApiBase() {
  if (window.financeOS?.getApiBase) {
    apiBase = await window.financeOS.getApiBase();
  } else {
    const q = new URLSearchParams(location.search).get('api');
    if (q) apiBase = q.replace(/\/$/, '');
  }
}

async function fetchApps() {
  try {
    const res = await fetch(`${apiBase}/api/financeos/apps`, { credentials: 'include' });
    if (res.status === 401) {
      apps = FALLBACK_APPS.filter((a) => a.id === 'settings');
      toast('请先登录以加载你的应用');
      render();
      return;
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '加载失败');
    apps = (data.apps || []).map((a) => ({
      ...a,
      url: a.url?.startsWith('http') ? a.url : `${apiBase}${a.url}`,
    }));
    if (!apps.length) toast('当前账号无可显示应用');
    render();
  } catch (err) {
    apps = FALLBACK_APPS.map((a) => ({
      ...a,
      url: `${apiBase}${a.url.startsWith('/') ? a.url : '/' + a.url}`,
    }));
    toast('服务未就绪，显示默认应用列表');
    render();
  }
}

function openApp(app) {
  const meta = {
    id: app.id,
    name: app.name,
    path: app.path,
    url: app.url?.startsWith('http') ? app.url : `${apiBase}${app.url || app.path}`,
  };
  if (window.financeOS?.openApp) {
    window.financeOS.openApp(meta);
  } else {
    window.open(meta.url, '_blank');
  }
  pinTask(app);
}

function pinTask(app) {
  const bar = document.getElementById('taskApps');
  if (bar.querySelector(`[data-id="${app.id}"]`)) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'task-btn';
  btn.dataset.id = app.id;
  btn.textContent = app.name;
  btn.onclick = () => openApp(app);
  bar.appendChild(btn);
}

function renderIcons() {
  const grid = document.getElementById('iconGrid');
  if (!apps.length) {
    grid.innerHTML = `<div class="empty-hint">暂无桌面应用。请确认 financeosd 已启动，并使用有财务/审计权限的账号登录。</div>`;
    return;
  }
  grid.innerHTML = apps.map((app) => `
    <button type="button" class="desk-icon" data-id="${app.id}">
      <span class="glyph">${glyphFor(app)}</span>
      <span class="label">${app.name}</span>
    </button>
  `).join('');
  grid.querySelectorAll('.desk-icon').forEach((btn) => {
    btn.addEventListener('dblclick', () => {
      const app = apps.find((a) => a.id === btn.dataset.id);
      if (app) openApp(app);
    });
    btn.addEventListener('click', () => {
      const app = apps.find((a) => a.id === btn.dataset.id);
      if (app) openApp(app);
    });
  });
}

function renderStartMenu() {
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
        <span class="glyph">${glyphFor(app)}</span>
        <span class="meta"><strong>${app.name}</strong><small>${app.description || ''}</small></span>
      </button>
    `).join('')}
  `).join('') || '<div class="start-cat">无可用应用</div>';
  list.querySelectorAll('.start-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const app = apps.find((a) => a.id === btn.dataset.id);
      if (app) {
        openApp(app);
        document.getElementById('startMenu').hidden = true;
      }
    });
  });
}

function render() {
  renderIcons();
  renderStartMenu();
}

document.getElementById('btnStart').addEventListener('click', () => {
  const menu = document.getElementById('startMenu');
  menu.hidden = !menu.hidden;
});

document.getElementById('btnLogin').addEventListener('click', () => {
  if (window.financeOS?.openLogin) window.financeOS.openLogin();
  else window.open(`${apiBase}/login?chrome=os`, '_blank');
});

document.getElementById('btnRefresh').addEventListener('click', () => fetchApps());
document.getElementById('btnQuit').addEventListener('click', () => {
  if (window.financeOS?.quit) window.financeOS.quit();
  else window.close();
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('startMenu');
  if (menu.hidden) return;
  if (e.target.closest('#startMenu') || e.target.closest('#btnStart')) return;
  menu.hidden = true;
});

(async function init() {
  await resolveApiBase();
  tickClock();
  setInterval(tickClock, 1000);
  await fetchApps();
})();
