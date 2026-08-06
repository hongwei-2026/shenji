/**
 * Agent 客户端动作执行 — 页面跳转、提示等（claw-code 风格）
 * 在 FinanceOS 桌面 iframe 内优先通过 parent 打开应用窗口。
 */
window.handleAgentResponse = function handleAgentResponse(data) {
  if (!data) return;
  const actions = data.actions || [];
  for (const a of actions) {
    if (a.action === 'navigate' && a.url) {
      const reason = a.reason || '正在为您打开页面…';
      if (typeof showToast === 'function') showToast(reason, 'info');
      try {
        if (window.parent && window.parent !== window && window.parent.FinanceOS) {
          window.parent.postMessage({
            source: 'financeos-agent',
            type: 'open_url',
            url: a.url,
            reason,
          }, '*');
          continue;
        }
      } catch { /* cross-origin ignore */ }
      const delay = a.delay_ms != null ? a.delay_ms : 800;
      setTimeout(() => { window.location.href = a.url; }, delay);
    }
    if (a.action === 'open_app' && a.app_id) {
      try {
        window.parent.postMessage({
          source: 'financeos-agent',
          type: 'open_app',
          app_id: a.app_id,
        }, '*');
      } catch { /* ignore */ }
    }
  }
};

window.formatAgentReply = function formatAgentReply(text, data) {
  let html = String(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  if (data?.actions?.length) {
    const nav = data.actions.filter(a => a.action === 'navigate' || a.action === 'open_app');
    if (nav.length) {
      html += '<div class="agent-nav-hint small text-muted mt-2"><i class="bi bi-box-arrow-up-right"></i> ' +
        nav.map(a => a.app_id ? `打开 ${a.app_id}` : `将跳转至 ${a.url}`).join('；') + '</div>';
    }
  }
  if (data?.steps?.length) {
    html += '<div class="agent-steps small text-muted mt-1"><i class="bi bi-tools"></i> ' +
      data.steps.map(s => `${s.tool}${s.ok ? ' ✓' : ' ✗'}`).join(' → ') + '</div>';
  }
  return html;
};
