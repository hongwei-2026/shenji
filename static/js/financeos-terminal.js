(() => {
  const out = document.getElementById('termOut');
  const promptEl = document.getElementById('termPrompt');
  const input = document.getElementById('termInput');
  let cwd = 'Desktop';
  const history = [];
  let histIdx = -1;

  function setPrompt() {
    promptEl.textContent = `fos:/${cwd || ''} $`;
  }

  function append(text, cls) {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  async function run(cmd) {
    append(`fos:/${cwd || ''} $ ${cmd}`, 'cmd');
    history.push(cmd);
    histIdx = history.length;
    const res = await fetch('/api/fos/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ cmd, cwd }),
    });
    const data = await res.json();
    if (data.cwd != null) cwd = data.cwd;
    setPrompt();
    if (data.clear) {
      out.innerHTML = '';
      return;
    }
    if (data.error) append(data.error, 'err');
    if (data.output) append(data.output);
    if (data.open_app) {
      try {
        window.parent.postMessage({ source: 'financeos-terminal', type: 'open_app', app_id: data.open_app }, '*');
      } catch { /* */ }
    }
  }

  document.getElementById('termForm').onsubmit = (e) => {
    e.preventDefault();
    const cmd = input.value;
    input.value = '';
    if (!cmd.trim()) return;
    run(cmd.trim());
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx -= 1;
        input.value = history[histIdx] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      input.value = history[histIdx] || '';
    }
  });

  append('FinanceOS Terminal — type help');
  setPrompt();
})();
