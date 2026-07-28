/**
 * 财务核算拖拽：模块卡片排序 + 全页拖入文件导入
 */
(function () {
  const FINANCE_PATH = /^\/finance(\/|$)/;

  function isFinancePage() {
    return FINANCE_PATH.test(location.pathname);
  }

  function initFinanceDropZone() {
    if (!isFinancePage()) return;
    if (document.getElementById('financeDropOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'financeDropOverlay';
    overlay.className = 'finance-drop-overlay';
    overlay.innerHTML = `
      <div class="finance-drop-card">
        <div class="finance-drop-mascot" aria-hidden="true">📊✨</div>
        <h5>拖放到此处导入</h5>
        <p>支持 Excel / CSV / 图片票据，松手即上传并进入审计流程</p>
      </div>`;
    document.body.appendChild(overlay);

    let dragDepth = 0;

    function hasFiles(e) {
      const types = e.dataTransfer && e.dataTransfer.types;
      return types && (types.contains ? types.contains('Files') : [...types].includes('Files'));
    }

    window.addEventListener('dragenter', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth += 1;
      overlay.classList.add('show');
    });

    window.addEventListener('dragleave', (e) => {
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) overlay.classList.remove('show');
    });

    window.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('drop', async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      overlay.classList.remove('show');
      const files = e.dataTransfer.files;
      if (!files || !files.length) return;
      await uploadFinanceFiles(files);
    });
  }

  async function uploadFinanceFiles(fileList) {
    const files = [...fileList];
    if (typeof showAnimeLoader === 'function') showAnimeLoader('导入财务数据…');
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const isImg = /^image\//.test(file.type);
        const url = isImg ? '/api/upload-image' : '/api/upload';
        const res = await fetch(url, { method: 'POST', body: fd });
        const data = await res.json();
        if (!data.success) {
          if (typeof showToast === 'function') showToast(data.error || '上传失败', 'error');
          else alert(data.error || '上传失败');
          continue;
        }
        if (typeof showToast === 'function') {
          showToast(`${file.name} 已导入`, 'success');
        }
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || '上传失败', 'error');
      else alert(err.message || '上传失败');
    } finally {
      if (typeof hideAnimeLoader === 'function') hideAnimeLoader();
    }
  }

  /** 财务总览：KPI / 面板可拖拽排序 */
  function initFinanceBoardSort() {
    const board = document.getElementById('financeDragBoard');
    if (!board) return;

    const STORAGE_KEY = 'financeBoardOrder';
    const items = [...board.querySelectorAll('[data-fin-drag]')];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        order.forEach((id) => {
          const el = board.querySelector(`[data-fin-drag="${id}"]`);
          if (el) board.appendChild(el);
        });
      } catch (_) { /* ignore */ }
    }

    let dragEl = null;

    items.forEach((el) => {
      el.setAttribute('draggable', 'true');
      const handle = el.querySelector('.fin-drag-handle') || el;
      handle.style.cursor = 'grab';

      el.addEventListener('dragstart', (e) => {
        dragEl = el;
        el.classList.add('fin-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', el.dataset.finDrag);
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('fin-dragging');
        board.querySelectorAll('.fin-drag-over').forEach((x) => x.classList.remove('fin-drag-over'));
        dragEl = null;
        const order = [...board.querySelectorAll('[data-fin-drag]')].map((x) => x.dataset.finDrag);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        if (typeof showToast === 'function') showToast('布局已保存', 'success');
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragEl || dragEl === el) return;
        el.classList.add('fin-drag-over');
        const rect = el.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (before) board.insertBefore(dragEl, el);
        else board.insertBefore(dragEl, el.nextSibling);
      });

      el.addEventListener('dragleave', () => el.classList.remove('fin-drag-over'));
    });
  }

  /** 侧栏「财务核算」菜单项可拖拽重排（仅本地） */
  function initFinanceNavSort() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const label = [...nav.querySelectorAll('.nav-section-label')].find((el) => el.textContent.includes('财务核算'));
    if (!label) return;

    const items = [];
    let n = label.nextElementSibling;
    while (n && !n.classList.contains('nav-section-label')) {
      if (n.classList.contains('nav-item') && n.dataset.path && n.dataset.path.startsWith('/finance')) {
        items.push(n);
      }
      n = n.nextElementSibling;
    }
    if (items.length < 2) return;

    const KEY = 'financeNavOrder';
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        order.slice().reverse().forEach((path) => {
          const el = items.find((i) => i.dataset.path === path);
          if (el) label.after(el);
        });
      } catch (_) { /* ignore */ }
    }

    let dragNav = null;
    items.forEach((el) => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        dragNav = el;
        el.classList.add('nav-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('nav-dragging');
        dragNav = null;
        const ordered = [];
        let cur = label.nextElementSibling;
        while (cur && !cur.classList.contains('nav-section-label')) {
          if (cur.classList.contains('nav-item') && cur.dataset.path) ordered.push(cur.dataset.path);
          cur = cur.nextElementSibling;
        }
        localStorage.setItem(KEY, JSON.stringify(ordered));
      });
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragNav || dragNav === el) return;
        const rect = el.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (before) el.parentNode.insertBefore(dragNav, el);
        else el.parentNode.insertBefore(dragNav, el.nextSibling);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFinanceDropZone();
    initFinanceBoardSort();
    initFinanceNavSort();
  });
})();
