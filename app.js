const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const SERIES_PRESETS = {
  harmonic: {
    label: '调和级数 Σ1/n',
    term: n => 1 / n,
    formula: '\\sum_{n=1}^{\\infty}\\frac{1}{n}',
    verdict: '发散（p=1）'
  },
  p2: {
    label: 'Σ1/n²',
    term: n => 1 / (n * n),
    formula: '\\sum_{n=1}^{\\infty}\\frac{1}{n^2}',
    verdict: '收敛（p=2）'
  },
  geometric: {
    label: '几何级数 Σ(1/2)ⁿ',
    term: n => Math.pow(0.5, n),
    formula: '\\sum_{n=1}^{\\infty}\\left(\\frac{1}{2}\\right)^n',
    verdict: '收敛（|r|<1）'
  },
  alternating: {
    label: '交错 Σ(-1)ⁿ/n',
    term: n => Math.pow(-1, n) / n,
    formula: '\\sum_{n=1}^{\\infty}\\frac{(-1)^n}{n}',
    verdict: '条件收敛'
  }
};

const SERIES_FLOW = [
  {
    q: '通项 aₙ 是否趋于 0？',
    yes: { next: 1, note: '继续判别。必要条件满足，但不一定收敛。' },
    no: { end: '立即判定：发散（必要条件不满足）' }
  },
  {
    q: '级数类型？',
    options: [
      { label: '正项级数', next: 2, note: '选比较 / 比值 / 根值法。' },
      { label: '交错级数', end: '用莱布尼茨：单调递减且 aₙ→0 ⇒ 收敛' },
      { label: '一般项（非全正非交错）', next: 3, note: '先判绝对收敛。' }
    ]
  },
  {
    q: '正项级数：通项含 n! 或 xⁿ？',
    yes: { end: '优先用比值判别法 ρ=lim|aₙ₊₁/aₙ|' },
    no: { end: '优先比较 / 极限比较法（找 p 级数或几何级数对照）' }
  },
  {
    q: 'Σ|aₙ| 是否收敛？',
    yes: { end: '绝对收敛 ⇒ 原级数收敛' },
    no: { end: '若原级数仍收敛 ⇒ 条件收敛；否则发散' }
  }
];

const SERIES_FORMULAS = [
  { title: '必要条件', tex: '\\lim_{n\\to\\infty} a_n = 0 \\quad (\\text{收敛则必满足})' },
  { title: '几何级数', tex: '\\sum ar^n = \\frac{a}{1-r},\\ |r|<1' },
  { title: 'p 级数', tex: '\\sum \\frac{1}{n^p}:\\ p>1\\text{ 收敛},\\ p\\le 1\\text{ 发散}' },
  { title: '比值法', tex: '\\rho=\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|,\\ \\rho<1\\Rightarrow\\text{收敛}' },
  { title: '收敛半径', tex: 'R=\\frac{1}{\\rho},\\ \\rho=\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|' }
];

const SYSTEM_PRESETS = {
  unique: {
    label: '唯一解',
    lines: [{ a: 1, b: 1, c: 3 }, { a: 1, b: -1, c: 1 }],
    type: '唯一解（两线相交）',
    rank: 'r(A)=r([A|b])=n'
  },
  infinite: {
    label: '无穷多解',
    lines: [{ a: 1, b: 2, c: 4 }, { a: 2, b: 4, c: 8 }],
    type: '无穷多解（两线重合）',
    rank: 'r(A)=r([A|b])<n'
  },
  none: {
    label: '无解',
    lines: [{ a: 1, b: 1, c: 2 }, { a: 1, b: 1, c: 5 }],
    type: '无解（平行不相交）',
    rank: 'r(A)<r([A|b])'
  }
};

const LINEAR_FORMULAS = [
  { title: '二阶行列式', tex: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}=ad-bc' },
  { title: '二阶逆矩阵', tex: 'A^{-1}=\\frac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}' },
  { title: '秩判解', tex: 'r(A)=r([A|b])=n\\Rightarrow\\text{唯一解}' },
  { title: '齐次非零解', tex: 'Ax=0\\text{ 有非零解}\\Leftrightarrow r(A)<n' },
  { title: '线性相关', tex: 'n\\text{ 个 }n\\text{ 维向量：相关}\\Leftrightarrow |A|=0' }
];

let seriesKey = 'harmonic';
let flowStep = 0;
let detMatrix = [[2, 1], [1, 3]];
let systemKey = 'unique';

function renderTex(el, tex, display = true) {
  if (typeof katex === 'undefined') {
    el.textContent = tex;
    return;
  }
  katex.render(tex, el, { displayMode: display, throwOnError: false });
}

function partialSum(termFn, n) {
  let s = 0;
  for (let i = 1; i <= n; i++) s += termFn(i);
  return s;
}

function setupTabs() {
  const switchTo = module => {
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.module === module));
    $('#panel-series').hidden = module !== 'series';
    $('#panel-linear').hidden = module !== 'linear';
    $('#panel-series').classList.toggle('is-active', module === 'series');
    $('#panel-linear').classList.toggle('is-active', module === 'linear');
    history.replaceState(null, '', `#${module}`);
    if (module === 'linear') {
      drawDet();
      drawSystem();
    } else {
      drawSeries();
    }
  };

  $$('.tab').forEach(btn => btn.addEventListener('click', () => switchTo(btn.dataset.module)));
  const hash = location.hash.slice(1);
  if (hash === 'linear' || hash === 'series') switchTo(hash);
}

function setupSeriesPresets() {
  const row = $('#seriesPresets');
  Object.entries(SERIES_PRESETS).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.classList.toggle('is-active', key === seriesKey);
    btn.addEventListener('click', () => {
      seriesKey = key;
      $$('#seriesPresets button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      updateSeries();
    });
    row.appendChild(btn);
  });

  $('#seriesN').addEventListener('input', e => {
    $('#seriesNOut').textContent = e.target.value;
    updateSeries();
  });
}

function drawSeries() {
  const canvas = $('#seriesCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 280;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const preset = SERIES_PRESETS[seriesKey];
  const nMax = +$('#seriesN').value;
  const points = [];
  for (let n = 1; n <= nMax; n++) points.push({ n, s: partialSum(preset.term, n) });

  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const yMin = Math.min(0, ...points.map(p => p.s));
  const yMax = Math.max(...points.map(p => p.s), 0.1);
  const xScale = x => pad.l + ((x - 1) / (nMax - 1 || 1)) * plotW;
  const yScale = y => pad.t + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#ddd6cb';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xScale(p.n);
    const y = yScale(p.s);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#b45309';
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(xScale(p.n), yScale(p.s), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#5c6678';
  ctx.font = '12px Noto Sans SC, sans-serif';
  ctx.fillText('n', w - pad.r - 8, h - 10);
  ctx.save();
  ctx.translate(14, pad.t + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Sₙ', 0, 0);
  ctx.restore();
}

function updateSeries() {
  const preset = SERIES_PRESETS[seriesKey];
  const n = +$('#seriesN').value;
  const sum = partialSum(preset.term, n);
  const term = preset.term(n);
  $('#seriesTerm').textContent = `a${n} = ${term.toFixed(4)}`;
  $('#seriesSum').textContent = sum.toFixed(4);
  $('#seriesVerdict').textContent = preset.verdict;
  drawSeries();
}

function setupSeriesFlow() {
  const container = $('#seriesFlow');
  const result = $('#seriesFlowResult');

  function render() {
    container.innerHTML = '';
    if (flowStep >= SERIES_FLOW.length) return;

    const step = SERIES_FLOW[flowStep];
    const row = document.createElement('div');
    row.className = 'flow-step';
    const label = document.createElement('span');
    label.textContent = `步骤 ${flowStep + 1}`;
    row.appendChild(label);

    if (step.options) {
      step.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          if (opt.end) {
            result.textContent = opt.end;
            flowStep = SERIES_FLOW.length;
            render();
          } else {
            result.textContent = opt.note || '继续下一步。';
            flowStep = opt.next;
            render();
          }
        });
        row.appendChild(btn);
      });
    } else {
      ['是', '否'].forEach((labelText, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = `${labelText} · ${step.q}`;
        btn.addEventListener('click', () => {
          const branch = idx === 0 ? step.yes : step.no;
          if (branch.end) {
            result.textContent = branch.end;
            flowStep = SERIES_FLOW.length;
            render();
          } else {
            result.textContent = branch.note || '继续下一步。';
            flowStep = branch.next;
            render();
          }
        });
        row.appendChild(btn);
      });
    }
    container.appendChild(row);
  }

  $('#seriesFlowReset').addEventListener('click', () => {
    flowStep = 0;
    result.textContent = '从第一步开始。';
    render();
  });
  render();
}

function setupSeriesFormulas() {
  const grid = $('#seriesFormulas');
  SERIES_FORMULAS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'formula-item';
    div.innerHTML = `<strong>${item.title}</strong><div class="tex"></div>`;
    renderTex(div.querySelector('.tex'), item.tex);
    grid.appendChild(div);
  });
}

function setupDetInputs() {
  const wrap = $('#detInputs');
  const labels = ['a', 'b', 'c', 'd'];
  labels.forEach((name, i) => {
    const label = document.createElement('label');
    label.textContent = name;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.5';
    input.value = detMatrix[Math.floor(i / 2)][i % 2];
    input.addEventListener('input', () => {
      detMatrix[Math.floor(i / 2)][i % 2] = +input.value || 0;
      updateDet();
    });
    label.appendChild(input);
    wrap.appendChild(label);
  });
}

function drawDet() {
  const canvas = $('#detCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 320;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const [[a, b], [c, d]] = detMatrix;
  const v1 = { x: a, y: c };
  const v2 = { x: b, y: d };
  const origin = { x: w / 2, y: h / 2 + 20 };
  const scale = 36;

  const toScreen = v => ({ x: origin.x + v.x * scale, y: origin.y - v.y * scale });

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#ddd6cb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(w, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, h);
  ctx.stroke();

  const p0 = toScreen({ x: 0, y: 0 });
  const p1 = toScreen(v1);
  const p2 = toScreen({ x: v1.x + v2.x, y: v1.y + v2.y });
  const p3 = toScreen(v2);

  ctx.fillStyle = 'rgba(4, 120, 87, 0.15)';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#047857';
  [[p0, p1], [p0, p3], [p1, p2], [p3, p2]].forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  ctx.fillStyle = '#047857';
  ctx.font = '13px Noto Sans SC, sans-serif';
  ctx.fillText('列1 (a,c)', p1.x + 6, p1.y - 6);
  ctx.fillText('列2 (b,d)', p3.x + 6, p3.y - 6);
}

function updateDet() {
  const [[a, b], [c, d]] = detMatrix;
  const det = a * d - b * c;
  $('#detValue').textContent = det.toFixed(2);
  $('#detMeaning').textContent = Math.abs(det) < 1e-9
    ? '面积为 0 → 两列向量共线'
    : det > 0 ? '有向面积为正' : '有向面积为负（方向翻转）';
  drawDet();
}

function setupSystemPresets() {
  const row = $('#systemPresets');
  Object.entries(SYSTEM_PRESETS).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.classList.toggle('is-active', key === systemKey);
    btn.addEventListener('click', () => {
      systemKey = key;
      $$('#systemPresets button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      updateSystem();
    });
    row.appendChild(btn);
  });
}

function drawSystem() {
  const canvas = $('#systemCanvas');
  const ctx = canvas.getContext('2d');
  const preset = SYSTEM_PRESETS[systemKey];
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 320;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = w / 2;
  const cy = h / 2 + 10;
  const scale = 28;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#ddd6cb';
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();

  const colors = ['#047857', '#b45309'];
  preset.lines.forEach((line, i) => {
    const { a, b, c } = line;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (Math.abs(b) > 1e-9) {
      for (let x = -6; x <= 6; x += 0.1) {
        const y = (c - a * x) / b;
        const sx = cx + x * scale;
        const sy = cy - y * scale;
        if (x === -6) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    } else {
      const x = c / a;
      ctx.moveTo(cx + x * scale, 0);
      ctx.lineTo(cx + x * scale, h);
    }
    ctx.stroke();
  });
}

function updateSystem() {
  const preset = SYSTEM_PRESETS[systemKey];
  const eqs = preset.lines.map(({ a, b, c }, i) => `${a}x ${b >= 0 ? '+' : ''}${b}y = ${c}`).join('；');
  $('#systemEqs').textContent = eqs;
  $('#systemType').textContent = `${preset.type}（${preset.rank}）`;
  drawSystem();
}

function setupLinearFormulas() {
  const grid = $('#linearFormulas');
  LINEAR_FORMULAS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'formula-item';
    div.innerHTML = `<strong>${item.title}</strong><div class="tex"></div>`;
    renderTex(div.querySelector('.tex'), item.tex);
    grid.appendChild(div);
  });
}

function init() {
  setupTabs();
  setupSeriesPresets();
  setupSeriesFlow();
  setupSeriesFormulas();
  setupDetInputs();
  setupSystemPresets();
  setupLinearFormulas();
  updateSeries();
  updateDet();
  updateSystem();

  window.addEventListener('resize', () => {
    drawSeries();
    drawDet();
    drawSystem();
  });
}

document.addEventListener('DOMContentLoaded', init);
