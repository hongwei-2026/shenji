(() => {
  const blinkView = document.getElementById('blinkView');
  const geckoView = document.getElementById('geckoView');
  const addrInput = document.getElementById('addrInput');
  const engineLabel = document.getElementById('engineLabel');
  const loadState = document.getElementById('loadState');
  const tabsEl = document.getElementById('tabs');

  let engine = 'blink';
  let tabId = 1;
  const tabs = [];
  let activeId = null;

  function setState(msg) {
    loadState.textContent = msg;
  }

  function createTab(url = 'about:home', title = '新标签页') {
    const id = tabId++;
    const tab = { id, url, title, history: [url], histIdx: 0 };
    tabs.push(tab);
    activeId = id;
    renderTabs();
    navigate(url, { push: false });
    return tab;
  }

  function activeTab() {
    return tabs.find((t) => t.id === activeId);
  }

  function renderTabs() {
    tabsEl.innerHTML = tabs.map((t) => `
      <button type="button" class="tab ${t.id === activeId ? 'active' : ''}" data-id="${t.id}">
        <span>${t.title}</span>
        <span class="x" data-close="${t.id}">×</span>
      </button>
    `).join('');
    tabsEl.querySelectorAll('.tab').forEach((btn) => {
      btn.onclick = (e) => {
        if (e.target.dataset.close) {
          closeTab(Number(e.target.dataset.close));
          return;
        }
        activeId = Number(btn.dataset.id);
        const t = activeTab();
        renderTabs();
        navigate(t.url, { push: false, restore: true });
      };
    });
  }

  function closeTab(id) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    tabs.splice(idx, 1);
    if (!tabs.length) {
      createTab();
      return;
    }
    if (activeId === id) activeId = tabs[Math.max(0, idx - 1)].id;
    renderTabs();
    navigate(activeTab().url, { push: false, restore: true });
  }

  function setEngine(next) {
    engine = next;
    document.querySelectorAll('.eng').forEach((b) => {
      b.classList.toggle('active', b.dataset.engine === engine);
    });
    blinkView.classList.toggle('active', engine === 'blink');
    geckoView.classList.toggle('active', engine === 'gecko');
    engineLabel.textContent = engine === 'blink'
      ? '内核：Blink（Chromium / Chrome）'
      : '内核：Gecko（Firefox UA 渲染沙箱）';
    const t = activeTab();
    if (t) navigate(t.url, { push: false, restore: true });
  }

  /** 网址 / 域名 → 打开；其余用百度搜索。 */
  function resolveNavInput(raw) {
    const text = (raw || '').trim();
    if (!text || text === 'about:home') return 'about:home';
    if (text.startsWith('about:') || text.startsWith('/')) return text;
    if (/^https?:\/\//i.test(text)) return text;
    if (/^[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(text)) return `https://${text}`;
    return `https://www.baidu.com/s?wd=${encodeURIComponent(text)}`;
  }

  function needsEmbedProxy(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host.endsWith('baidu.com') || host.endsWith('baidu.cn');
    } catch {
      return false;
    }
  }

  function displayAddr(url) {
    if (!url || url === 'about:home') return '';
    try {
      const u = new URL(url, location.origin);
      const wd = u.searchParams.get('wd');
      if ((u.hostname.includes('baidu.com') || u.hostname.includes('baidu.cn')) && wd) {
        return wd;
      }
    } catch { /* ignore */ }
    return url;
  }

  async function loadViaProxy(url, viewEl) {
    setState('百度搜索加载中…');
    const res = await fetch(`/api/browser/gecko?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '加载失败');
    if (data.internal && data.url && data.url.startsWith('/')) {
      viewEl.removeAttribute('srcdoc');
      const sep = data.url.includes('?') ? '&' : '?';
      viewEl.src = data.url.includes('chrome=os') ? data.url : `${data.url}${sep}chrome=os`;
      return data;
    }
    viewEl.removeAttribute('src');
    viewEl.srcdoc = data.html || '';
    return data;
  }

  async function navigate(raw, { push = true, restore = false } = {}) {
    const tab = activeTab();
    if (!tab) return;
    setState('加载中…');
    let url = resolveNavInput(raw);
    addrInput.value = displayAddr(url);

    try {
      const view = engine === 'blink' ? blinkView : geckoView;

      if (url === 'about:home') {
        view.removeAttribute('srcdoc');
        view.src = '/api/browser/home';
        tab.title = '主页';
      } else if (url.startsWith('/')) {
        view.removeAttribute('srcdoc');
        const sep = url.includes('?') ? '&' : '?';
        view.src = url.includes('chrome=os') ? url : `${url}${sep}chrome=os`;
        tab.title = url.startsWith('/search') ? '站内搜索' : '页面';
      } else if (engine === 'gecko' || needsEmbedProxy(url)) {
        // 百度等禁止 iframe 的站点：服务端抓取后渲染
        const data = await loadViaProxy(url, view);
        url = data.url || url;
        addrInput.value = displayAddr(url);
        tab.title = needsEmbedProxy(url) ? '百度' : (data.title || '页面');
      } else {
        // Blink 直接加载可嵌入外链
        view.removeAttribute('srcdoc');
        view.src = url;
        try { tab.title = new URL(url).hostname || '页面'; }
        catch { tab.title = '页面'; }
      }

      tab.url = url;
      if (push && !restore) {
        tab.history = tab.history.slice(0, tab.histIdx + 1);
        tab.history.push(url);
        tab.histIdx = tab.history.length - 1;
      }
      renderTabs();
      setState('完成');
    } catch (e) {
      setState(e.message || '失败');
      const view = engine === 'blink' ? blinkView : geckoView;
      view.removeAttribute('src');
      view.srcdoc = `<html><body style="font-family:sans-serif;padding:24px;color:#b91c1c">${e.message || '失败'}</body></html>`;
    }
  }

  document.getElementById('navForm').onsubmit = (e) => {
    e.preventDefault();
    navigate(addrInput.value);
  };
  document.getElementById('btnBack').onclick = () => {
    const t = activeTab();
    if (!t || t.histIdx <= 0) return;
    t.histIdx -= 1;
    navigate(t.history[t.histIdx], { push: false, restore: true });
  };
  document.getElementById('btnForward').onclick = () => {
    const t = activeTab();
    if (!t || t.histIdx >= t.history.length - 1) return;
    t.histIdx += 1;
    navigate(t.history[t.histIdx], { push: false, restore: true });
  };
  document.getElementById('btnReload').onclick = () => navigate(activeTab()?.url || 'about:home', { push: false, restore: true });
  document.getElementById('btnHome').onclick = () => navigate('about:home');
  document.getElementById('btnNewTab').onclick = () => createTab();
  document.querySelectorAll('.eng').forEach((btn) => {
    btn.onclick = () => setEngine(btn.dataset.engine);
  });

  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.source !== 'financeos-browser-home') return;
    if (d.type === 'navigate' && (d.q || d.url)) navigate(d.q || d.url);
  });

  createTab('about:home', '主页');
})();
