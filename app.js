const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const colors = {
  ink: '#171918', muted: '#68706b', line: '#d9ded9', red: '#e34b3f',
  teal: '#07857d', yellow: '#f4c84a', blue: '#3569d4', paper: '#fbfcfa'
};

const progressKey = 'math-lab-progress-v1';
let progress = new Set(JSON.parse(localStorage.getItem(progressKey) || '[]'));

function saveProgress(id) {
  progress.add(id);
  localStorage.setItem(progressKey, JSON.stringify([...progress]));
  updateProgress();
}

function updateProgress() {
  $('#progressCount').textContent = `${Math.min(progress.size, 6)} / 6`;
}

function setupModules() {
  $$('.module-btn').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.module;
    $$('.module-btn').forEach(item => item.classList.toggle('is-active', item === button));
    const seriesActive = target === 'series';
    $('#seriesModule').hidden = !seriesActive;
    $('#linearModule').hidden = seriesActive;
    $('#seriesModule').classList.toggle('is-active', seriesActive);
    $('#linearModule').classList.toggle('is-active', !seriesActive);
    if (!seriesActive) requestAnimationFrame(drawLinear);
  }));
}

const seriesPresets = {
  harmonic: {
    formula: 'Σ 1 / n', term: n => 1 / n, color: colors.red,
    status: '仍在缓慢增长', title: '项越来越小，但总和仍在走高',
    body: '通项趋于 0 只是必要条件，不能单独保证级数收敛。', question: 'aₙ → 0 吗？'
  },
  square: {
    formula: 'Σ 1 / n²', term: n => 1 / (n * n), color: colors.teal,
    status: '逐渐稳定', title: '后面的项已经很难推动总和',
    body: 'p 级数在指数大于 1 时收敛，部分和会靠近一个有限值。', question: '它像哪个 p 级数？'
  },
  alternating: {
    formula: 'Σ (-1)ⁿ⁻¹ / n', term: n => (n % 2 ? 1 : -1) / n, color: colors.blue,
    status: '上下夹逼', title: '正负项轮流修正总和',
    body: '绝对值递减并趋于 0 时，交错级数可以通过莱布尼茨判别。', question: '|aₙ| 递减吗？'
  }
};

let currentPreset = 'harmonic';

function seriesData(count) {
  const values = [];
  let sum = 0;
  for (let n = 1; n <= count; n += 1) {
    sum += seriesPresets[currentPreset].term(n);
    values.push(sum);
  }
  return values;
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(220, Math.round(rect.height || width * 0.44));
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function drawSeries() {
  const canvas = $('#seriesCanvas');
  const { ctx, width, height } = fitCanvas(canvas);
  const count = Number($('#termSlider').value);
  const values = seriesData(count);
  const pad = { l: 48, r: 22, t: 50, b: 38 };
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const range = Math.max(0.4, max - min);
  const x = i => pad.l + (i / Math.max(1, count - 1)) * (width - pad.l - pad.r);
  const y = value => height - pad.b - ((value - min) / range) * (height - pad.t - pad.b);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.font = '11px Consolas';
  ctx.fillStyle = colors.muted;

  for (let i = 0; i <= 4; i += 1) {
    const gy = pad.t + (i / 4) * (height - pad.t - pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(width - pad.r, gy); ctx.stroke();
    const label = (max - (i / 4) * range).toFixed(2);
    ctx.fillText(label, 6, gy + 4);
  }

  ctx.strokeStyle = seriesPresets[currentPreset].color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)));
  ctx.stroke();

  values.forEach((value, index) => {
    if (count > 40 && index % 2) return;
    ctx.fillStyle = seriesPresets[currentPreset].color;
    ctx.beginPath(); ctx.arc(x(index), y(value), 3, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = colors.ink;
  ctx.font = '12px Consolas';
  ctx.fillText('n = 1', pad.l, height - 13);
  ctx.fillText(`n = ${count}`, width - pad.r - 42, height - 13);

  $('#termCount').textContent = count;
  $('#partialSum').textContent = values.at(-1).toFixed(6);
}

function selectPreset(key) {
  currentPreset = key;
  const preset = seriesPresets[key];
  $$('.preset-btn').forEach(button => button.classList.toggle('is-active', button.dataset.preset === key));
  $('#seriesFormula').textContent = preset.formula;
  $('#seriesStatus').textContent = preset.status;
  $('#seriesStatusDot').style.background = preset.color;
  $('#insightTitle').textContent = preset.title;
  $('#insightBody').textContent = preset.body;
  $('#keyQuestion').textContent = preset.question;
  drawSeries();
}

const decisionDetails = {
  term: ['必要条件', '若 aₙ 不趋于 0，级数一定发散；若趋于 0，还要继续检查。', 'lim aₙ = 0'],
  sign: ['先看符号', '全为正项时比较大小；正负交替时，优先想到莱布尼茨判别。', '(-1)ⁿ bₙ'],
  shape: ['识别通项', '像 1/nᵖ 就看 p；出现阶乘或指数，通常尝试比值判别。', 'Σ 1/nᵖ'],
  result: ['最后分类', '原级数与绝对值级数都收敛叫绝对收敛；只有原级数收敛叫条件收敛。', 'Σ |aₙ|']
};

function setupSeries() {
  $$('.preset-btn').forEach(button => button.addEventListener('click', () => selectPreset(button.dataset.preset)));
  $('#termSlider').addEventListener('input', drawSeries);
  $('#seriesReset').addEventListener('click', () => { $('#termSlider').value = 24; drawSeries(); });
  $$('.rail-step').forEach((button, index) => button.addEventListener('click', () => {
    $$('.rail-step').forEach(item => item.classList.toggle('is-active', item === button));
    saveProgress(`series-step-${index}`);
    if (index > 0) $('#seriesDecision').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  $('#nextSeriesStep').addEventListener('click', () => {
    $$('.rail-step')[1].click();
  });
  $$('.decision-node').forEach(button => button.addEventListener('click', () => {
    $$('.decision-node').forEach(item => item.classList.toggle('is-selected', item === button));
    const [title, body, formula] = decisionDetails[button.dataset.detail];
    $('#decisionDetail').innerHTML = `<strong>${title}</strong><p>${body}</p><span class="formula-chip">${formula}</span>`;
  }));
}

const linearTopics = {
  vector: ['向量 · VECTOR', '一组有方向、有长度的数', '向量不是一列孤立的数字', '在二维平面中，它可以看成从原点出发的一支箭头。', '坐标决定终点'],
  matrix: ['矩阵 · MATRIX', '对空间执行一次线性变换', '矩阵是一台变换机器', '它接收一个向量，再输出改变方向和长度后的新向量。', '列向量告诉你基底去了哪里'],
  determinant: ['行列式 · DETERMINANT', '衡量面积被放大或压缩多少', '行列式是带方向的面积', '绝对值表示面积倍数，正负号表示空间方向是否翻转。', 'det = 0 意味着面积被压扁'],
  relation: ['线性相关 · DEPENDENCE', '检查方向是否发生重复', '相关意味着存在多余方向', '如果一个向量能由其他向量拼出来，这组向量就线性相关。', '二维中 det = 0 等价于共线']
};

let currentLinearTopic = 'vector';

function arrow(ctx, x1, y1, x2, y2, color, width = 3) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(angle - Math.PI / 6), y2 - 12 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 12 * Math.cos(angle + Math.PI / 6), y2 - 12 * Math.sin(angle + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

function drawLinear() {
  const canvas = $('#linearCanvas');
  if (canvas.closest('[hidden]')) return;
  const { ctx, width, height } = fitCanvas(canvas);
  const ax = Number($('#ax').value), ay = Number($('#ay').value);
  const bx = Number($('#bx').value), by = Number($('#by').value);
  const scale = Math.min(width, height) / 11;
  const ox = width / 2, oy = height / 2;
  const point = (vx, vy) => [ox + vx * scale, oy - vy * scale];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i += 1) {
    ctx.beginPath(); ctx.moveTo(ox + i * scale, 0); ctx.lineTo(ox + i * scale, height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, oy + i * scale); ctx.lineTo(width, oy + i * scale); ctx.stroke();
  }
  arrow(ctx, 18, oy, width - 18, oy, colors.muted, 1.5);
  arrow(ctx, ox, height - 18, ox, 18, colors.muted, 1.5);

  const pa = point(ax, ay), pb = point(bx, by), pab = point(ax + bx, ay + by);
  ctx.fillStyle = 'rgba(244, 200, 74, 0.30)';
  ctx.strokeStyle = colors.yellow; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(...pa); ctx.lineTo(...pab); ctx.lineTo(...pb); ctx.closePath(); ctx.fill(); ctx.stroke();
  arrow(ctx, ox, oy, ...pa, colors.red, 4);
  arrow(ctx, ox, oy, ...pb, colors.blue, 4);

  ctx.font = 'bold 14px Microsoft YaHei UI';
  ctx.fillStyle = colors.red; ctx.fillText(`a (${ax}, ${ay})`, pa[0] + 8, pa[1] - 8);
  ctx.fillStyle = colors.blue; ctx.fillText(`b (${bx}, ${by})`, pb[0] + 8, pb[1] + 18);

  const det = ax * by - ay * bx;
  $('#detValue').textContent = det;
  $('#relationText').textContent = det === 0 ? '面积为 0：两个向量线性相关' : '面积不为 0：两个向量线性无关';
  $('#detValue').style.color = det === 0 ? colors.red : colors.teal;
  [['ax', ax], ['ay', ay], ['bx', bx], ['by', by]].forEach(([id, value]) => $(`#${id}Value`).textContent = value);
}

function selectLinearTopic(topic) {
  currentLinearTopic = topic;
  $$('.linear-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.topic === topic));
  const [eyebrow, stage, title, body, rule] = linearTopics[topic];
  $('#linearEyebrow').textContent = eyebrow;
  $('#linearStageTitle').textContent = stage;
  $('#linearInsightTitle').textContent = title;
  $('#linearInsightBody').textContent = body;
  $('#linearRule').textContent = rule;
  saveProgress(`linear-${topic}`);
  drawLinear();
}

function setupLinear() {
  $$('.linear-tab').forEach(tab => tab.addEventListener('click', () => selectLinearTopic(tab.dataset.topic)));
  ['ax', 'ay', 'bx', 'by'].forEach(id => $(`#${id}`).addEventListener('input', drawLinear));
  $$('.step-button').forEach(button => button.addEventListener('click', () => {
    const input = $(`#${button.dataset.target}`);
    const next = Number(input.value) + Number(button.dataset.delta);
    input.value = Math.max(Number(input.min), Math.min(Number(input.max), next));
    drawLinear();
  }));
  $('#linearReset').addEventListener('click', () => {
    const defaults = { ax: 3, ay: 1, bx: 1, by: 3 };
    Object.entries(defaults).forEach(([id, value]) => $(`#${id}`).value = value);
    drawLinear();
  });
}

function setupQuizzes() {
  $$('.quiz-section').forEach(section => {
    $$('.quiz-options button', section).forEach(button => button.addEventListener('click', () => {
      const correct = button.dataset.correct === 'true';
      $$('.quiz-options button', section).forEach(item => item.classList.remove('is-correct', 'is-wrong'));
      button.classList.add(correct ? 'is-correct' : 'is-wrong');
      $('.quiz-feedback', section).textContent = correct ? '判断正确。继续保持这个思路。' : '再看一下结构，不急着计算。';
      if (correct) saveProgress(`quiz-${section.dataset.quiz}`);
    }));
  });
}

$('#clearProgress').addEventListener('click', () => {
  progress = new Set();
  localStorage.removeItem(progressKey);
  updateProgress();
});

setupModules();
setupSeries();
setupLinear();
setupQuizzes();
updateProgress();
selectPreset('harmonic');
window.addEventListener('resize', () => { drawSeries(); drawLinear(); });

// Canvas dimensions depend on the responsive layout; redraw once the browser has settled it.
requestAnimationFrame(() => requestAnimationFrame(() => {
  drawSeries();
  drawLinear();
}));

const canvasObserver = new ResizeObserver(entries => {
  entries.forEach(entry => {
    if (entry.target.id === 'seriesCanvas') drawSeries();
    if (entry.target.id === 'linearCanvas') drawLinear();
  });
});
canvasObserver.observe($('#seriesCanvas'));
canvasObserver.observe($('#linearCanvas'));
