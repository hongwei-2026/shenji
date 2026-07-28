/**
 * Power BI 风格仪表盘
 * - 12 列网格磁贴：拖动 / 缩放
 * - 右侧可视化面板：拖入新图形
 * - 布局本地持久化（含动态添加的磁贴）
 */
(function (global) {
  const DEFAULTS = { cols: 12, rowH: 88, gap: 10, minW: 2, minH: 2 };

  const VIZ_TYPES = [
    { type: 'bar', label: '柱状图', icon: 'bi-bar-chart-fill', w: 6, h: 4 },
    { type: 'line', label: '折线图', icon: 'bi-graph-up', w: 6, h: 4 },
    { type: 'area', label: '面积图', icon: 'bi-graph-up-arrow', w: 6, h: 4 },
    { type: 'pie', label: '饼图', icon: 'bi-pie-chart-fill', w: 5, h: 4 },
    { type: 'doughnut', label: '环形图', icon: 'bi-circle', w: 5, h: 4 },
    { type: 'hbar', label: '条形图', icon: 'bi-bar-chart-steps', w: 6, h: 4 },
    { type: 'card', label: '卡片', icon: 'bi-card-heading', w: 3, h: 2 },
    { type: 'kpi', label: 'KPI', icon: 'bi-speedometer2', w: 4, h: 2 },
    { type: 'table', label: '表格', icon: 'bi-table', w: 6, h: 4 },
    { type: 'scatter', label: '散点图', icon: 'bi-bounding-box-circles', w: 6, h: 4 },
  ];

  const DEMO = {
    labels: ['一月', '二月', '三月', '四月', '五月', '六月'],
    values: [42, 55, 38, 67, 49, 72],
    pieLabels: ['高风险', '中风险', '低风险'],
    pieValues: [12, 28, 60],
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function parseIntAttr(el, name, fallback) {
    const v = parseInt(el.getAttribute(name), 10);
    return Number.isFinite(v) ? v : fallback;
  }
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  const COLORS = ['#ff6b00', '#2563eb', '#059669', '#e11d48', '#7c3aed', '#d97706', '#0891b2'];

  class PbiDashboard {
    constructor(root, options = {}) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      if (!this.root) throw new Error('PbiDashboard: root not found');
      this.opts = { ...DEFAULTS, ...options };
      this.storageKey = options.storageKey || this.root.dataset.pbiKey || 'pbi-layout';
      this.editMode = !!options.editMode;
      this.dataProvider = options.dataProvider || null; // () => { datasets... }
      this.widgets = [];
      this._charts = {};
      this._drag = null;
      this._resize = null;
      this._paletteDrag = null;
      this._ghost = null;
      this._workspace = null;
      this._pane = null;

      this._ensureWorkspace();
      this.root.classList.add('pbi-canvas');
      this.root.style.setProperty('--pbi-cols', String(this.opts.cols));
      this.root.style.setProperty('--pbi-row-h', `${this.opts.rowH}px`);
      this.root.style.setProperty('--pbi-gap', `${this.opts.gap}px`);

      this._ghost = document.createElement('div');
      this._ghost.className = 'pbi-ghost';
      this.root.appendChild(this._ghost);

      this._buildVizPane();
      this._collectWidgets();
      this._restoreDynamicWidgets();
      this._loadLayout();
      this._bind();
      this.setEditMode(this.editMode);
      this.render();
      requestAnimationFrame(() => {
        this.render();
        this._paintAllDynamic();
        this._notifyResize();
      });
    }

    _ensureWorkspace() {
      if (this.root.parentElement && this.root.parentElement.classList.contains('pbi-workspace-main')) {
        this._workspace = this.root.closest('.pbi-workspace');
        return;
      }
      const wrap = document.createElement('div');
      wrap.className = 'pbi-workspace';
      const main = document.createElement('div');
      main.className = 'pbi-workspace-main';
      const parent = this.root.parentNode;
      parent.insertBefore(wrap, this.root);
      main.appendChild(this.root);
      wrap.appendChild(main);
      this._workspace = wrap;
    }

    _buildVizPane() {
      if (this._workspace.querySelector('.pbi-viz-pane')) {
        this._pane = this._workspace.querySelector('.pbi-viz-pane');
        return;
      }
      const pane = document.createElement('aside');
      pane.className = 'pbi-viz-pane';
      pane.innerHTML = `
        <div class="pbi-viz-pane-head">
          <strong>可视化</strong>
          <small>拖到画布添加</small>
        </div>
        <div class="pbi-viz-grid">
          ${VIZ_TYPES.map((v) => `
            <button type="button" class="pbi-viz-item" draggable="true"
              data-viz-type="${v.type}" data-viz-w="${v.w}" data-viz-h="${v.h}" title="${v.label}">
              <i class="bi ${v.icon}"></i>
              <span>${v.label}</span>
            </button>`).join('')}
        </div>
        <div class="pbi-viz-pane-foot">
          <div class="small text-muted mb-1">字段 / 数据</div>
          <select class="form-select form-select-sm" data-pbi-dataset>
            <option value="auto">自动匹配当前数据</option>
            <option value="demo">示例数据</option>
          </select>
          <p class="pbi-viz-tip">进入「编辑布局」后，从右侧拖图形到画布；也可点击图标直接添加。</p>
        </div>`;
      this._workspace.appendChild(pane);
      this._pane = pane;

      pane.querySelectorAll('.pbi-viz-item').forEach((btn) => {
        btn.addEventListener('dragstart', (e) => {
          const type = btn.dataset.vizType;
          e.dataTransfer.setData('application/x-pbi-viz', type);
          e.dataTransfer.setData('text/plain', type);
          e.dataTransfer.effectAllowed = 'copy';
          btn.classList.add('is-dragging');
          this.setEditMode(true);
        });
        btn.addEventListener('dragend', () => btn.classList.remove('is-dragging'));
        btn.addEventListener('click', () => {
          this.setEditMode(true);
          this.addVisual(btn.dataset.vizType);
        });
      });
    }

    _collectWidgets() {
      this.widgets = [...this.root.querySelectorAll('.pbi-widget')].map((el) => {
        const id = el.dataset.id || uid('w');
        el.dataset.id = id;
        if (!el.querySelector('.pbi-widget-chrome')) this._wrapChrome(el);
        return {
          id,
          el,
          x: parseIntAttr(el, 'data-x', 0),
          y: parseIntAttr(el, 'data-y', 0),
          w: parseIntAttr(el, 'data-w', 6),
          h: parseIntAttr(el, 'data-h', 4),
          dynamic: el.dataset.dynamic === '1',
          vizType: el.dataset.vizType || null,
        };
      });
    }

    _wrapChrome(el) {
      const title = el.dataset.title || '可视化';
      const bodyKids = [...el.childNodes];
      el.innerHTML = '';
      const chrome = document.createElement('div');
      chrome.className = 'pbi-widget-chrome';
      chrome.innerHTML = `
        <div class="pbi-widget-header" data-pbi-drag>
          <span class="pbi-widget-title">${title}</span>
          <span class="pbi-widget-actions">
            <button type="button" class="pbi-icon-btn" data-pbi-focus title="置于顶层"><i class="bi bi-layers"></i></button>
            <button type="button" class="pbi-icon-btn pbi-danger" data-pbi-remove title="删除"><i class="bi bi-trash"></i></button>
          </span>
        </div>
        <div class="pbi-widget-body"></div>
        <div class="pbi-resize-handle" data-pbi-resize title="拖拽缩放"></div>`;
      const body = chrome.querySelector('.pbi-widget-body');
      bodyKids.forEach((n) => body.appendChild(n));
      el.appendChild(chrome);
    }

    _cellSize() {
      const rect = this.root.getBoundingClientRect();
      const width = Math.max(rect.width, this.root.clientWidth, 320);
      const gap = this.opts.gap;
      const cols = this.opts.cols;
      const cellW = (width - gap * (cols - 1)) / cols;
      return { cellW, cellH: this.opts.rowH, gap };
    }

    _toPx(w) {
      const { cellW, cellH, gap } = this._cellSize();
      return {
        left: w.x * (cellW + gap),
        top: w.y * (cellH + gap),
        width: w.w * cellW + (w.w - 1) * gap,
        height: w.h * cellH + (w.h - 1) * gap,
      };
    }

    _clientToGrid(clientX, clientY) {
      const rect = this.root.getBoundingClientRect();
      const { cellW, cellH, gap } = this._cellSize();
      return {
        x: (clientX - rect.left) / (cellW + gap),
        y: (clientY - rect.top) / (cellH + gap),
      };
    }

    _findBottom() {
      return this.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    }

    render() {
      let maxY = 0;
      this.widgets.forEach((w) => {
        w.x = clamp(w.x, 0, this.opts.cols - w.w);
        w.y = Math.max(0, w.y);
        w.w = clamp(w.w, this.opts.minW, this.opts.cols);
        w.h = Math.max(this.opts.minH, w.h);
        if (w.x + w.w > this.opts.cols) w.x = this.opts.cols - w.w;
        const px = this._toPx(w);
        w.el.style.left = `${px.left}px`;
        w.el.style.top = `${px.top}px`;
        w.el.style.width = `${px.width}px`;
        w.el.style.height = `${px.height}px`;
        w.el.setAttribute('data-x', w.x);
        w.el.setAttribute('data-y', w.y);
        w.el.setAttribute('data-w', w.w);
        w.el.setAttribute('data-h', w.h);
        maxY = Math.max(maxY, w.y + w.h);
      });
      const { cellH, gap } = this._cellSize();
      this.root.style.minHeight = `${Math.max(8, maxY + 2) * (cellH + gap)}px`;
      this._hideGhost();
    }

    _showGhost(x, y, w, h) {
      const px = this._toPx({ x, y, w, h });
      Object.assign(this._ghost.style, {
        display: 'block', left: `${px.left}px`, top: `${px.top}px`,
        width: `${px.width}px`, height: `${px.height}px`,
      });
    }
    _hideGhost() { this._ghost.style.display = 'none'; }

    _resolveOverlap(moving) {
      let guard = 0;
      while (guard++ < 50) {
        const hit = this.widgets.find(
          (o) =>
            o !== moving &&
            moving.x < o.x + o.w && moving.x + moving.w > o.x &&
            moving.y < o.y + o.h && moving.y + moving.h > o.y,
        );
        if (!hit) break;
        moving.y = hit.y + hit.h;
      }
    }

    setEditMode(on) {
      this.editMode = !!on;
      this.root.classList.toggle('pbi-edit', this.editMode);
      this._workspace.classList.toggle('pbi-editing', this.editMode);
      this.widgets.forEach((w) => w.el.classList.toggle('pbi-editable', this.editMode));
      if (this._pane) this._pane.classList.toggle('is-active', true); // 始终可见
      const toolbar = document.querySelector(`[data-pbi-toolbar="${this.storageKey}"]`);
      if (toolbar) {
        toolbar.classList.toggle('is-editing', this.editMode);
        const btn = toolbar.querySelector('[data-pbi-toggle-edit]');
        if (btn) {
          btn.innerHTML = this.editMode
            ? '<i class="bi bi-check2"></i> 完成编辑'
            : '<i class="bi bi-pencil-square"></i> 编辑布局';
          btn.classList.toggle('btn-primary', this.editMode);
          btn.classList.toggle('btn-outline-primary', !this.editMode);
        }
      }
    }

    toggleEditMode() {
      this.setEditMode(!this.editMode);
      if (!this.editMode) this.saveLayout();
    }

    /** 添加可视化磁贴 */
    addVisual(type, atX, atY) {
      const meta = VIZ_TYPES.find((v) => v.type === type) || VIZ_TYPES[0];
      const id = uid(type);
      const x = Number.isFinite(atX) ? atX : 0;
      const y = Number.isFinite(atY) ? atY : this._findBottom();
      const el = document.createElement('div');
      el.className = 'pbi-widget';
      el.dataset.id = id;
      el.dataset.title = meta.label;
      el.dataset.dynamic = '1';
      el.dataset.vizType = meta.type;
      el.setAttribute('data-x', x);
      el.setAttribute('data-y', y);
      el.setAttribute('data-w', meta.w);
      el.setAttribute('data-h', meta.h);
      el.setAttribute('data-default-x', x);
      el.setAttribute('data-default-y', y);
      el.setAttribute('data-default-w', meta.w);
      el.setAttribute('data-default-h', meta.h);

      const bodyInner = document.createElement('div');
      bodyInner.className = 'pbi-dynamic-body';
      bodyInner.dataset.vizHost = id;
      el.appendChild(bodyInner);
      this.root.appendChild(el);
      this._wrapChrome(el);

      const w = {
        id, el, x, y, w: meta.w, h: meta.h, dynamic: true, vizType: meta.type,
      };
      this._resolveOverlap(w);
      this.widgets.push(w);
      this.render();
      this._paintVisual(w);
      this.saveLayout();
      this._notifyResize();
      if (typeof showToast === 'function') showToast(`已添加「${meta.label}」`, 'success');
      return w;
    }

    removeWidget(id) {
      const idx = this.widgets.findIndex((w) => w.id === id);
      if (idx < 0) return;
      const w = this.widgets[idx];
      if (this._charts[id]) {
        try { this._charts[id].destroy(); } catch (_) {}
        delete this._charts[id];
      }
      w.el.remove();
      this.widgets.splice(idx, 1);
      this.saveLayout();
      this.render();
    }

    _getDatasetMode() {
      const sel = this._pane && this._pane.querySelector('[data-pbi-dataset]');
      return (sel && sel.value) || 'auto';
    }

    _resolveChartData(vizType) {
      const mode = this._getDatasetMode();
      const provided = typeof this.dataProvider === 'function' ? this.dataProvider() : null;
      if (mode !== 'demo' && provided) {
        // 优先匹配类型
        if ((vizType === 'pie' || vizType === 'doughnut') && provided.pie) return provided.pie;
        if ((vizType === 'bar' || vizType === 'hbar' || vizType === 'line' || vizType === 'area') && provided.series) {
          return provided.series;
        }
        if (vizType === 'scatter' && provided.scatter) return provided.scatter;
        if ((vizType === 'card' || vizType === 'kpi') && provided.card) return provided.card;
        if (vizType === 'table' && provided.table) return provided.table;
        if (provided.series) return provided.series;
        if (provided.pie) return provided.pie;
      }
      // demo
      if (vizType === 'pie' || vizType === 'doughnut') {
        return { labels: DEMO.pieLabels, values: DEMO.pieValues };
      }
      if (vizType === 'scatter') {
        return {
          points: DEMO.labels.map((_, i) => ({ x: DEMO.values[i], y: DEMO.values[(i + 2) % DEMO.values.length] })),
        };
      }
      if (vizType === 'card' || vizType === 'kpi') {
        return { value: '¥128.6万', label: '示例指标', delta: '+12.4%' };
      }
      if (vizType === 'table') {
        return {
          headers: ['项目', '金额', '占比'],
          rows: DEMO.labels.map((l, i) => [l, DEMO.values[i], `${(DEMO.values[i] / 3.2).toFixed(1)}%`]),
        };
      }
      return { labels: DEMO.labels, values: DEMO.values };
    }

    _paintVisual(w) {
      const body = w.el.querySelector('.pbi-widget-body');
      if (!body) return;
      const host = body.querySelector('.pbi-dynamic-body') || body;
      const data = this._resolveChartData(w.vizType);
      if (this._charts[w.id]) {
        try { this._charts[w.id].destroy(); } catch (_) {}
        delete this._charts[w.id];
      }

      if (w.vizType === 'card' || w.vizType === 'kpi') {
        host.innerHTML = `<div class="pbi-card-viz">
          <div class="pbi-card-value">${data.value}</div>
          <div class="pbi-card-label">${data.label || ''}</div>
          ${data.delta ? `<div class="pbi-card-delta">${data.delta}</div>` : ''}
        </div>`;
        return;
      }
      if (w.vizType === 'table') {
        const th = (data.headers || []).map((h) => `<th>${h}</th>`).join('');
        const tr = (data.rows || []).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
        host.innerHTML = `<div class="table-responsive h-100"><table class="table table-sm mb-0"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
        return;
      }

      host.innerHTML = '<canvas></canvas>';
      const canvas = host.querySelector('canvas');
      if (!canvas || typeof Chart === 'undefined') {
        host.innerHTML = '<div class="text-muted small p-2">Chart.js 未加载</div>';
        return;
      }
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      let cfg;
      if (w.vizType === 'pie' || w.vizType === 'doughnut') {
        cfg = {
          type: w.vizType,
          data: {
            labels: data.labels,
            datasets: [{ data: data.values, backgroundColor: COLORS }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };
      } else if (w.vizType === 'scatter') {
        cfg = {
          type: 'scatter',
          data: {
            datasets: [{
              label: '散点',
              data: data.points || [],
              backgroundColor: COLORS[0],
            }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };
      } else if (w.vizType === 'hbar') {
        cfg = {
          type: 'bar',
          data: {
            labels: data.labels,
            datasets: [{ label: '数值', data: data.values, backgroundColor: COLORS[1] }],
          },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false },
        };
      } else if (w.vizType === 'area') {
        cfg = {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [{
              label: '数值', data: data.values, borderColor: COLORS[0],
              backgroundColor: 'rgba(255,107,0,.25)', fill: true, tension: 0.3,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };
      } else {
        cfg = {
          type: w.vizType === 'line' ? 'line' : 'bar',
          data: {
            labels: data.labels,
            datasets: [{
              label: '数值',
              data: data.values,
              backgroundColor: w.vizType === 'line' ? undefined : COLORS[0],
              borderColor: COLORS[0],
              fill: false,
              tension: 0.3,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };
      }
      this._charts[w.id] = new Chart(canvas, cfg);
    }

    _paintAllDynamic() {
      this.widgets.filter((w) => w.dynamic).forEach((w) => this._paintVisual(w));
    }

    refreshData() {
      this._paintAllDynamic();
      this._notifyResize();
    }

    saveLayout() {
      const layout = { positions: {}, dynamics: [] };
      this.widgets.forEach((w) => {
        layout.positions[w.id] = { x: w.x, y: w.y, w: w.w, h: w.h };
        if (w.dynamic) {
          layout.dynamics.push({
            id: w.id, vizType: w.vizType, title: w.el.dataset.title,
            x: w.x, y: w.y, w: w.w, h: w.h,
          });
        }
      });
      localStorage.setItem(this.storageKey, JSON.stringify(layout));
    }

    _loadLayout() {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      try {
        const layout = JSON.parse(raw);
        const positions = layout.positions || layout;
        this.widgets.forEach((w) => {
          const L = positions[w.id];
          if (!L) return;
          w.x = L.x; w.y = L.y; w.w = L.w; w.h = L.h;
        });
      } catch (_) { /* ignore */ }
    }

    _restoreDynamicWidgets() {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      try {
        const layout = JSON.parse(raw);
        const dynamics = layout.dynamics || [];
        dynamics.forEach((d) => {
          if (this.widgets.some((w) => w.id === d.id)) return;
          const meta = VIZ_TYPES.find((v) => v.type === d.vizType) || VIZ_TYPES[0];
          const el = document.createElement('div');
          el.className = 'pbi-widget';
          el.dataset.id = d.id;
          el.dataset.title = d.title || meta.label;
          el.dataset.dynamic = '1';
          el.dataset.vizType = d.vizType;
          ['x', 'y', 'w', 'h'].forEach((k) => {
            el.setAttribute(`data-${k}`, d[k]);
            el.setAttribute(`data-default-${k}`, d[k]);
          });
          const bodyInner = document.createElement('div');
          bodyInner.className = 'pbi-dynamic-body';
          el.appendChild(bodyInner);
          this.root.appendChild(el);
          this._wrapChrome(el);
          this.widgets.push({
            id: d.id, el, x: d.x, y: d.y, w: d.w, h: d.h,
            dynamic: true, vizType: d.vizType,
          });
        });
      } catch (_) { /* ignore */ }
    }

    resetLayout() {
      // 删除动态磁贴
      [...this.widgets].filter((w) => w.dynamic).forEach((w) => this.removeWidget(w.id));
      localStorage.removeItem(this.storageKey);
      this.widgets.forEach((w) => {
        if (w.el.dataset.defaultX != null) {
          w.x = +w.el.dataset.defaultX;
          w.y = +w.el.dataset.defaultY;
          w.w = +w.el.dataset.defaultW;
          w.h = +w.el.dataset.defaultH;
        }
      });
      this.render();
      this._notifyResize();
      if (typeof showToast === 'function') showToast('已恢复默认布局', 'success');
    }

    _notifyResize() {
      this.widgets.forEach((w) => {
        w.el.querySelectorAll('canvas').forEach((c) => {
          const chart = (typeof Chart !== 'undefined' && Chart.getChart) ? Chart.getChart(c) : null;
          if (chart) chart.resize();
        });
        if (this._charts[w.id]) this._charts[w.id].resize();
      });
    }

    _bind() {
      this.root.addEventListener('pointerdown', (e) => this._onPointerDown(e));
      window.addEventListener('pointermove', (e) => this._onPointerMove(e));
      window.addEventListener('pointerup', () => this._onPointerUp());
      window.addEventListener('resize', () => { this.render(); this._notifyResize(); });

      this.root.addEventListener('dragover', (e) => {
        if (![...e.dataTransfer.types].includes('application/x-pbi-viz') &&
            ![...e.dataTransfer.types].includes('text/plain')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.setEditMode(true);
        const type = this._paletteDrag || 'bar';
        const meta = VIZ_TYPES.find((v) => v.type === type) || VIZ_TYPES[0];
        const g = this._clientToGrid(e.clientX, e.clientY);
        const x = clamp(Math.round(g.x), 0, this.opts.cols - meta.w);
        const y = Math.max(0, Math.round(g.y));
        this._showGhost(x, y, meta.w, meta.h);
      });

      this.root.addEventListener('dragleave', () => this._hideGhost());

      this.root.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/x-pbi-viz') || e.dataTransfer.getData('text/plain');
        if (!type || !VIZ_TYPES.some((v) => v.type === type)) return;
        const meta = VIZ_TYPES.find((v) => v.type === type);
        const g = this._clientToGrid(e.clientX, e.clientY);
        const x = clamp(Math.round(g.x), 0, this.opts.cols - meta.w);
        const y = Math.max(0, Math.round(g.y));
        this._hideGhost();
        this.addVisual(type, x, y);
      });

      // 记录正在拖的类型（dragover 时 dataTransfer.getData 在部分浏览器不可读）
      if (this._pane) {
        this._pane.addEventListener('dragstart', (e) => {
          const item = e.target.closest('.pbi-viz-item');
          if (item) this._paletteDrag = item.dataset.vizType;
        });
        this._pane.addEventListener('dragend', () => { this._paletteDrag = null; });
        this._pane.querySelector('[data-pbi-dataset]')?.addEventListener('change', () => this.refreshData());
      }

      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-pbi-toggle-edit]');
        if (t && t.closest(`[data-pbi-toolbar="${this.storageKey}"]`)) this.toggleEditMode();
        const r = e.target.closest('[data-pbi-reset]');
        if (r && r.closest(`[data-pbi-toolbar="${this.storageKey}"]`)) this.resetLayout();
      });
    }

    _findWidget(el) {
      const node = el.closest('.pbi-widget');
      if (!node) return null;
      return this.widgets.find((w) => w.el === node) || null;
    }

    _onPointerDown(e) {
      if (!this.editMode) return;
      if (e.button !== undefined && e.button !== 0) return;

      const removeBtn = e.target.closest('[data-pbi-remove]');
      if (removeBtn) {
        const w = this._findWidget(removeBtn);
        if (w) this.removeWidget(w.id);
        return;
      }
      const focusBtn = e.target.closest('[data-pbi-focus]');
      if (focusBtn) {
        const w = this._findWidget(focusBtn);
        if (w) {
          this.widgets.forEach((x) => { x.el.style.zIndex = '1'; });
          w.el.style.zIndex = '5';
        }
        return;
      }

      const resizeHandle = e.target.closest('[data-pbi-resize]');
      const dragHandle = e.target.closest('[data-pbi-drag]');
      const w = this._findWidget(e.target);
      if (!w) return;

      if (resizeHandle) {
        e.preventDefault();
        this._resize = { w, startX: e.clientX, startY: e.clientY, origW: w.w, origH: w.h };
        w.el.classList.add('pbi-active');
        return;
      }
      if (dragHandle) {
        e.preventDefault();
        const g = this._clientToGrid(e.clientX, e.clientY);
        this._drag = { w, offsetX: g.x - w.x, offsetY: g.y - w.y };
        w.el.classList.add('pbi-active');
        this.root.classList.add('pbi-dragging');
      }
    }

    _onPointerMove(e) {
      if (this._drag) {
        const { w, offsetX, offsetY } = this._drag;
        const g = this._clientToGrid(e.clientX, e.clientY);
        let nx = clamp(Math.round(g.x - offsetX), 0, this.opts.cols - w.w);
        let ny = Math.max(0, Math.round(g.y - offsetY));
        this._showGhost(nx, ny, w.w, w.h);
        const px = this._toPx({ x: nx, y: ny, w: w.w, h: w.h });
        w.el.style.left = `${px.left}px`;
        w.el.style.top = `${px.top}px`;
        w._pending = { x: nx, y: ny };
        return;
      }
      if (this._resize) {
        const { w, startX, startY, origW, origH } = this._resize;
        const { cellW, cellH, gap } = this._cellSize();
        const dw = Math.round((e.clientX - startX) / (cellW + gap));
        const dh = Math.round((e.clientY - startY) / (cellH + gap));
        const nw = clamp(origW + dw, this.opts.minW, this.opts.cols - w.x);
        const nh = Math.max(this.opts.minH, origH + dh);
        this._showGhost(w.x, w.y, nw, nh);
        const px = this._toPx({ x: w.x, y: w.y, w: nw, h: nh });
        w.el.style.width = `${px.width}px`;
        w.el.style.height = `${px.height}px`;
        w._pendingSize = { w: nw, h: nh };
      }
    }

    _onPointerUp() {
      if (this._drag) {
        const { w } = this._drag;
        if (w._pending) { w.x = w._pending.x; w.y = w._pending.y; delete w._pending; }
        this._resolveOverlap(w);
        w.el.classList.remove('pbi-active');
        this.root.classList.remove('pbi-dragging');
        this._drag = null;
        this.render(); this.saveLayout(); this._notifyResize();
      }
      if (this._resize) {
        const { w } = this._resize;
        if (w._pendingSize) { w.w = w._pendingSize.w; w.h = w._pendingSize.h; delete w._pendingSize; }
        this._resolveOverlap(w);
        w.el.classList.remove('pbi-active');
        this._resize = null;
        this.render(); this.saveLayout(); this._notifyResize();
      }
      this._hideGhost();
    }
  }

  function autoInit() {
    document.querySelectorAll('.pbi-canvas[data-pbi-key]:not([data-pbi-defer])').forEach((el) => {
      if (el._pbi) return;
      el._pbi = new PbiDashboard(el, {
        storageKey: el.dataset.pbiKey,
        editMode: el.dataset.pbiEdit === '1',
      });
    });
  }

  global.PbiDashboard = PbiDashboard;
  global.PbiVizTypes = VIZ_TYPES;
  global.initPbiDashboards = autoInit;
  document.addEventListener('DOMContentLoaded', autoInit);
})(window);
