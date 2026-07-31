/**
 * 同公司业务同步：轮询 /api/company/sync，通知对应功能页刷新
 */
(function (global) {
  const PATH_FEATURE = [
    [/^\/finance\/vouchers/, 'vouchers'],
    [/^\/finance\/invoices/, 'invoices'],
    [/^\/finance\/travel/, 'travel_expense_audit'],
    [/^\/finance\/reconciliation/, 'reconciliation'],
    [/^\/finance(\/)?$/, 'finance'],
    [/^\/finance\/receivables/, 'receivables'],
    [/^\/finance\/payables/, 'payables'],
  ];

  const handlers = {};
  let sinceId = 0;
  let timer = null;
  let myUserId = null;

  function currentFeature() {
    const path = location.pathname;
    for (const [re, feat] of PATH_FEATURE) {
      if (re.test(path)) return feat;
    }
    return null;
  }

  function on(feature, fn) {
    if (!handlers[feature]) handlers[feature] = [];
    handlers[feature].push(fn);
  }

  function notify(feature, event) {
    (handlers[feature] || []).forEach((fn) => {
      try { fn(event); } catch (_) { /* ignore */ }
    });
    (handlers['*'] || []).forEach((fn) => {
      try { fn(event); } catch (_) { /* ignore */ }
    });
  }

  async function poll() {
    if (document.hidden) return;
    try {
      const r = await fetch(`/api/company/sync?since_id=${sinceId}`, { credentials: 'same-origin' });
      if (!r.ok) return;
      const d = await r.json();
      if (!d.success || !d.company) return;
      const events = d.events || [];
      events.forEach((ev) => {
        sinceId = Math.max(sinceId, ev.id);
        if (myUserId && ev.actor_id === myUserId) return;
        const pageFeat = currentFeature();
        const related =
          !pageFeat ||
          ev.feature === pageFeat ||
          (pageFeat === 'finance' && ['vouchers', 'invoices', 'receivables', 'payables', 'reconciliation', 'travel_expense_audit'].includes(ev.feature));
        if (related) {
          if (typeof showToast === 'function') {
            showToast(`${ev.actor_name || '同事'}：${ev.summary || ev.action}`, 'info');
          }
          notify(ev.feature, ev);
          if (pageFeat) notify(pageFeat, ev);
        }
      });
    } catch (_) { /* ignore */ }
  }

  function start() {
    if (timer) return;
    myUserId = global.__currentUserId || null;
    poll();
    timer = setInterval(poll, 5000);
  }

  document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) poll();
  });

  global.CompanySync = { on, poll, start };
})(window);
