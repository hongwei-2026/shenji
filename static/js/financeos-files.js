(() => {
  let cwd = 'Desktop';
  let selected = null;

  const listEl = document.getElementById('fmList');
  const pathEl = document.getElementById('fmPath');
  const preview = document.getElementById('fmPreview');

  function toast(msg) {
    try { window.parent.postMessage({ source: 'financeos-files', type: 'toast', message: msg }, '*'); } catch { /* */ }
  }

  async function load(path) {
    cwd = path || '';
    pathEl.value = '/' + cwd;
    selected = null;
    preview.hidden = true;
    document.querySelectorAll('.fm-side button').forEach((b) => {
      b.classList.toggle('active', b.dataset.path === cwd);
    });
    const res = await fetch(`/api/fos/files?path=${encodeURIComponent(cwd)}`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!data.success) {
      listEl.innerHTML = `<div style="padding:12px">${data.error || 'error'}</div>`;
      return;
    }
    listEl.innerHTML = data.items.map((it) => `
      <button type="button" class="fm-item" data-path="${it.path}" data-type="${it.type}" data-name="${it.name}">
        <span class="ico">${it.type === 'dir' ? '📁' : '📄'}</span>
        <span>${it.name}</span>
      </button>
    `).join('') || '<div style="padding:12px;opacity:.6">Empty</div>';
    listEl.querySelectorAll('.fm-item').forEach((btn) => {
      btn.onclick = () => {
        listEl.querySelectorAll('.fm-item').forEach((x) => x.classList.remove('selected'));
        btn.classList.add('selected');
        selected = { path: btn.dataset.path, type: btn.dataset.type, name: btn.dataset.name };
      };
      btn.ondblclick = async () => {
        if (btn.dataset.type === 'dir') {
          load(btn.dataset.path);
        } else {
          const r = await fetch(`/api/fos/files/read?path=${encodeURIComponent(btn.dataset.path)}`, { credentials: 'same-origin' });
          const d = await r.json();
          if (!d.success) {
            preview.hidden = false;
            preview.textContent = d.error || 'cannot open';
            return;
          }
          preview.hidden = false;
          preview.textContent = d.content;
        }
      };
    });
  }

  document.querySelectorAll('.fm-side button').forEach((b) => {
    b.onclick = () => load(b.dataset.path);
  });
  document.getElementById('btnUp').onclick = () => {
    if (!cwd) return;
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    load(parts.join('/'));
  };
  document.getElementById('btnRefresh').onclick = () => load(cwd);
  document.getElementById('btnNewFile').onclick = async () => {
    const name = prompt('File name', 'note.txt');
    if (!name) return;
    const path = cwd ? `${cwd}/${name}` : name;
    await fetch('/api/fos/files/write', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ path, content: '' }),
    });
    load(cwd);
  };
  document.getElementById('btnNewDir').onclick = async () => {
    const name = prompt('Folder name', 'New Folder');
    if (!name) return;
    const path = cwd ? `${cwd}/${name}` : name;
    await fetch('/api/fos/files/mkdir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ path }),
    });
    load(cwd);
  };
  document.getElementById('btnPin').onclick = async () => {
    if (!selected || selected.type !== 'file') {
      toast('Select a file to pin');
      return;
    }
    const res = await fetch('/api/fos/shortcuts', { credentials: 'same-origin' });
    const data = await res.json();
    const items = data.items || [];
    items.push({
      id: `file-${Date.now()}`,
      kind: 'file',
      name: selected.name,
      glyph: '📄',
      color: '#64748b',
      file: selected.path,
    });
    await fetch('/api/fos/shortcuts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ items }),
    });
    try {
      window.parent.postMessage({ source: 'financeos-files', type: 'refresh_desktop' }, '*');
    } catch { /* */ }
    toast('Pinned to Desktop');
  };

  load('Desktop');
})();
