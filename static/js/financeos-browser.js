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

  async function navigate(raw, { push = true, restore = false } = {}) {
    const tab = activeTab();
    if (!tab) return;
    setState('加载中…');
    let url = (raw || '').trim() || 'about:home';
    addrInput.value = url === 'about:home' ? '' : url;

    try {
      if (engine === 'blink') {
        if (url === 'about:home') {
          blinkView.src = '/api/browser/home';
        } else if (url.startsWith('/')) {
          const sep = url.includes('?') ? '&' : '?';
          blinkView.src = url.includes('chrome=os') ? url : `${url}${sep}chrome=os`;
        } else {
          // 外链：Blink 直接 iframe（部分站点可能拒绝嵌入）
          if (!/^https?:\/\//i.test(url) && !url.startsWith('about:')) {
            url = `https://${url}`;
            addrInput.value = url;
          }
          blinkView.src = url;
        }
        tab.title = url === 'about:home' ? '主页' : (new URL(url, location.origin)).hostname || '页面';
      } else {
        // Gecko 模式：同源走 chrome=os，外链走 Gecko 代理
        if (url === 'about:home') {
          geckoView.srcdoc = '';
          geckoView.src = '/api/browser/home?engine=gecko';
          tab.title = '主页';
        } else if (url.startsWith('/')) {
          const sep = url.includes('?') ? '&' : '?';
          geckoView.src = url.includes('chrome=os') ? url : `${url}${sep}chrome=os`;
          tab.title = url;
        } else {
          setState('Gecko 抓取中…');
          const res = await fetch(`/api/browser/gecko?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Gecko 加载失败');
          geckoView.removeAttribute('src');
          geckoView.srcdoc = data.html || '';
          url = data.url || url;
          addrInput.value = url;
          tab.title = data.title || 'Gecko';
        }
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
      if (engine === 'gecko') {
        geckoView.srcdoc = `<html><body style="font-family:sans-serif;padding:24px;color:#b91c1c">${e.message}</body></html>`;
      }
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

  createTab('about:home', '主页');
})();
