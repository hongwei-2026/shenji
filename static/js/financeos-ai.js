(() => {
  const msgs = document.getElementById('aiMsgs');
  const suggest = document.getElementById('aiSuggest');
  const input = document.getElementById('aiInput');

  const QUICK = [
    'open vouchers',
    '打开审计',
    'open files',
    'open terminal',
    'help me with invoices',
    '打开银行对账',
  ];

  function bubble(text, who) {
    const el = document.createElement('div');
    el.className = `bubble ${who}`;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function postToDesktop(type, payload) {
    try {
      window.parent.postMessage({ source: 'financeos-ai', type, ...payload }, '*');
    } catch { /* ignore */ }
  }

  function openAppId(id) {
    postToDesktop('open_app', { app_id: id });
  }

  function renderSuggest() {
    suggest.innerHTML = QUICK.map((q) => `<button type="button" data-q="${q}">${q}</button>`).join('');
    suggest.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        input.value = b.dataset.q;
        send();
      };
    });
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    bubble(text, 'user');
    input.value = '';
    postToDesktop('ai_command', { text });

    // also try agent API for richer reply
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: text, context: { surface: 'financeos' } }),
      });
      const data = await res.json();
      const reply = data.reply || data.message || data.error || 'Done.';
      bubble(reply, 'bot');
      const actions = data.actions || [];
      for (const a of actions) {
        if (a.action === 'navigate' && a.url) {
          postToDesktop('open_url', { url: a.url, reason: a.reason || '' });
        }
        if (a.action === 'open_app' && a.app_id) {
          openAppId(a.app_id);
        }
      }
    } catch {
      bubble('Opened via desktop command.', 'bot');
    }
  }

  document.getElementById('aiForm').onsubmit = (e) => {
    e.preventDefault();
    send();
  };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = document.getElementById('aiMic');
  if (SR) {
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.onresult = (ev) => {
      input.value = ev.results[0][0].transcript;
      send();
    };
    mic.onclick = () => { try { rec.start(); } catch { /* ignore */ } };
  } else {
    mic.onclick = () => bubble('Voice not supported here.', 'bot');
  }

  bubble('Hi — I am FinanceOS AI. Tell me which app to open, or what finance task you need.', 'bot');
  renderSuggest();
})();
