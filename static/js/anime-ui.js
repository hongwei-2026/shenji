/**
 * 动漫动态 UI：AI 眼睛追光标、加载动效、全局页面加载条
 */
(function () {
  function initAiEyes() {
    const face = document.getElementById('aiAnimeFace');
    if (!face) return;
    const pupils = face.querySelectorAll('.ai-pupil');
    if (!pupils.length) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let blinking = false;

    function track(e) {
      mx = e.clientX;
      my = e.clientY;
    }

    function applyEyes() {
      if (blinking) return;
      const rect = face.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.min(1, Math.hypot(dx, dy) / 180);
      const angle = Math.atan2(dy, dx);
      const max = 4.2;
      const ox = Math.cos(angle) * max * dist;
      const oy = Math.sin(angle) * max * dist;
      pupils.forEach((p) => {
        p.style.transform = `translate(${ox}px, ${oy}px)`;
      });
    }

    function blink() {
      blinking = true;
      face.classList.add('ai-blink');
      setTimeout(() => {
        face.classList.remove('ai-blink');
        blinking = false;
        applyEyes();
      }, 160);
    }

    document.addEventListener('pointermove', track, { passive: true });
    setInterval(applyEyes, 40);
    setInterval(blink, 4200 + Math.random() * 2000);
    // idle bob
    face.classList.add('ai-idle');
  }

  function injectPageLoader() {
    if (document.getElementById('animePageLoader')) return;
    const el = document.createElement('div');
    el.id = 'animePageLoader';
    el.className = 'anime-page-loader';
    el.innerHTML = `
      <div class="anime-loader-card">
        <div class="anime-mascot-spin" aria-hidden="true">
          <div class="anime-coin">¥</div>
          <div class="anime-spark s1"></div>
          <div class="anime-spark s2"></div>
          <div class="anime-spark s3"></div>
        </div>
        <div class="anime-loader-text">算账中…</div>
        <div class="anime-loader-bar"><span></span></div>
      </div>`;
    document.body.appendChild(el);
  }

  window.showAnimeLoader = function (msg) {
    injectPageLoader();
    const el = document.getElementById('animePageLoader');
    const t = el.querySelector('.anime-loader-text');
    if (t && msg) t.textContent = msg;
    el.classList.add('show');
  };

  window.hideAnimeLoader = function () {
    const el = document.getElementById('animePageLoader');
    if (el) el.classList.remove('show');
  };

  /** 把普通 spinner 区域升级为动漫加载 */
  function enhanceLoadingStates() {
    document.querySelectorAll('.loading-state').forEach((box) => {
      if (box.dataset.animeReady) return;
      box.dataset.animeReady = '1';
      if (!box.querySelector('.anime-mascot-spin')) {
        const spin = document.createElement('div');
        spin.className = 'anime-mascot-spin mb-2';
        spin.innerHTML = '<div class="anime-coin">¥</div><div class="anime-spark s1"></div><div class="anime-spark s2"></div><div class="anime-spark s3"></div>';
        const existing = box.querySelector('.spinner-border');
        if (existing) existing.replaceWith(spin);
        else box.prepend(spin);
      }
      box.classList.add('anime-loading');
    });
  }

  // 拦截部分 fetch：财务 API 显示轻量加载条
  function patchFetchLoader() {
    if (window.__animeFetchPatched) return;
    window.__animeFetchPatched = true;
    const orig = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isFinance = /\/api\/finance\//.test(url);
      const isHeavy = /\/api\/(upload|analysis|agent)/.test(url);
      let shown = false;
      if (isHeavy) {
        window.showAnimeLoader('处理中…');
        shown = true;
      } else if (isFinance && (!init || !init.method || init.method === 'GET')) {
        document.body.classList.add('anime-fetching');
      }
      return orig.apply(this, arguments).finally(() => {
        if (shown) window.hideAnimeLoader();
        document.body.classList.remove('anime-fetching');
      });
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAiEyes();
    enhanceLoadingStates();
    patchFetchLoader();
    // 顶部细进度条
    if (!document.getElementById('animeTopBar')) {
      const bar = document.createElement('div');
      bar.id = 'animeTopBar';
      bar.className = 'anime-top-bar';
      document.body.appendChild(bar);
    }
  });
})();
