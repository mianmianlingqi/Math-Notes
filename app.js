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

const seriesMapPoints = {
  'series-root': ['总入口', '无穷级数', '研究无限多个数相加后，部分和是否趋近一个有限值。', '看 Sₙ 的极限', '级数研究的是部分和 Sₙ，不是只看通项 aₙ。'],
  term: ['基础语言', '通项 aₙ', '描述级数中的第 n 项，是所有判别法首先观察的对象。', '先算 lim aₙ', 'aₙ → 0 只能继续判断，不能直接说明收敛。'],
  'partial-sum': ['基础语言', '部分和 Sₙ', '把前 n 项真正加起来，是定义级数收敛的核心数列。', 'Sₙ = a₁ + ··· + aₙ', '不要把 Sₙ 和第 n 项 aₙ 混为一谈。'],
  convergence: ['基础语言', '收敛与发散', '判断无限相加是否趋近一个有限结果。', 'lim Sₙ = S', '部分和有界不一定收敛，还可能振荡。'],
  necessary: ['基础语言', '收敛的必要条件', '用于第一时间排除必定发散的级数。', '收敛 ⇒ aₙ → 0', '逆命题错误；调和级数就是反例。'],
  cauchy: ['基础语言', '柯西收敛准则', '不预先知道和是多少，也能从尾部判断收敛。', '任意尾和都能充分小', '量词顺序重要：对所有尾段都必须成立。'],
  geometric: ['典型样板', '几何级数', '通项是固定比值的幂时直接使用。', '|q| < 1 才收敛', '首项位置不同会改变和，但不改变敛散性。'],
  'p-series': ['典型样板', 'p 级数', '作为比较判别中最常见的参照物。', 'Σ1/nᵖ：p > 1 收敛', 'p = 1 是发散的调和级数。'],
  telescoping: ['典型样板', '裂项相消', '分式通项能拆成前后两项之差时使用。', '先写 Sₙ 再消项', '必须保留首尾没有被消掉的项。'],
  comparison: ['正项级数', '比较判别法', '通项能直接与熟悉的正项级数比较大小时使用。', '小于收敛项则收敛', '方向别反：大于发散项才可推出发散。'],
  'limit-comparison': ['正项级数', '极限比较判别法', '通项长得像某个 p 级数但难以直接比较时使用。', 'lim aₙ/bₙ = c ∈ (0,∞)', '极限为 0 或 ∞ 时需要使用单向结论。'],
  ratio: ['正项级数', '比值判别法', '出现阶乘、指数或连乘结构时优先尝试。', 'lim aₙ₊₁/aₙ = L', 'L = 1 时判别法失效，不代表级数收敛。'],
  root: ['正项级数', '根值判别法', '通项整体带 n 次幂时通常比比值法更方便。', 'lim ⁿ√aₙ = L', '与比值法一样，L = 1 时没有结论。'],
  integral: ['正项级数', '积分判别法', '通项来自连续、正值、递减函数 f(n) 时使用。', 'Σf(n) 与 ∫f(x)dx 同敛散', '需要检查正值、连续和最终递减。'],
  absolute: ['一般项级数', '绝对收敛', '级数有正有负时，先去掉符号检查更强的收敛性。', 'Σ|aₙ| 收敛 ⇒ Σaₙ 收敛', '绝对收敛比普通收敛更强。'],
  conditional: ['一般项级数', '条件收敛', '原级数收敛，但绝对值级数发散时使用这个分类。', 'Σaₙ 收敛且 Σ|aₙ| 发散', '必须分别完成两次判断，缺一不可。'],
  leibniz: ['一般项级数', '莱布尼茨判别法', '正负严格交替的级数最常用。', 'bₙ ↓ 0 ⇒ Σ(-1)ⁿbₙ 收敛', '只得到普通收敛，还需另查是否绝对收敛。'],
  dirichlet: ['一般项级数', '狄利克雷判别法', '一部分振荡但部分和有界，另一部分单调趋零时使用。', 'Aₙ 有界，bₙ ↓ 0', '检查的是前一部分的部分和有界。'],
  abel: ['一般项级数', '阿贝尔判别法', '一个级数已知收敛，再乘一个有界单调因子时使用。', 'Σaₙ 收敛，bₙ 单调有界', '不要与幂级数的阿贝尔定理混淆。'],
  radius: ['幂级数', '收敛半径', '先确定以展开中心为圆心的收敛范围大小。', '|x-x₀| < R 绝对收敛', '半径不能决定两个端点是否收敛。'],
  interval: ['幂级数', '收敛区间', '得到半径以后，补做两个端点判断。', '先求 R，再逐个代端点', '端点可能一个收敛、一个发散。'],
  'power-ops': ['幂级数', '逐项求导与积分', '在收敛区间内部求和函数或构造新级数。', '运算后收敛半径不变', '端点敛散性可能改变，必须重查。'],
  'sum-function': ['幂级数', '和函数', '把无穷级数看成关于 x 的函数并求其表达式。', '从几何级数出发变形', '代数变形必须在收敛区间内进行。'],
  'taylor-series': ['幂级数', '泰勒级数', '把光滑函数展开成幂级数，用于近似与求和。', 'Σ f⁽ⁿ⁾(x₀)(x-x₀)ⁿ/n!', '存在所有阶导数也不自动保证等于原函数。']
};

const seriesLessons = {
  'series-root': { intuition: '把级数想成一条不断追加新项的账单。单项可以越来越小，但累计总额未必稳定。', definition: '令 Sₙ=a₁+a₂+···+aₙ。若 lim Sₙ=S 且 S 有限，则 Σaₙ 收敛到 S；否则发散。', steps: ['先算 lim aₙ，排除通项不归零的情况', '识别通项属于正项、交错、一般项还是幂级数', '选择判别法，逐条核对它的使用条件'], example: '几何级数 1+q+q²+··· 在 |q|<1 时，部分和趋于 1/(1-q)。', question: '只知道 aₙ→0，能否断定 Σaₙ 收敛？', hint: '不能。调和级数 Σ1/n 的通项趋零，但级数发散。' },
  term: { intuition: '通项是每次往总和里放进去的“新金额”，先看它有没有小到趋近于零。', definition: 'aₙ 表示级数的第 n 项；通项数列与级数的部分和数列是两个不同对象。', steps: ['写清楚 aₙ 的表达式', '计算 lim aₙ', '若极限非零直接判发散；若为零继续判断'], example: 'Σ n/(n+1) 的通项趋于 1，不趋于 0，因此不用再选判别法。', question: 'aₙ→0 为什么还不能保证累计总和稳定？', hint: '每项虽小，却可能有无穷多项持续同向累加。' },
  'partial-sum': { intuition: '部分和就是“目前为止一共加了多少”，级数是否收敛完全由它决定。', definition: 'Sₙ=Σₖ₌₁ⁿaₖ。级数 Σaₙ 的和定义为部分和数列 {Sₙ} 的极限。', steps: ['先写有限的 Sₙ', '通过裂项、等比求和等方式化简', '计算 n→∞ 时 Sₙ 的极限'], example: 'Σ1/[n(n+1)] 裂成 1/n-1/(n+1)，Sₙ 中间项相消，只留下首尾。', question: '若 Sₙ 有界，是否一定收敛？', hint: '不一定，例如 Sₙ=(-1)ⁿ 有界但振荡。' },
  convergence: { intuition: '收敛表示无论再加多少后续项，总和都只能在某个数附近轻微移动。', definition: '存在有限 S，使对任意 ε>0，都能找到 N，当 n>N 时 |Sₙ-S|<ε。', steps: ['明确研究对象是 Sₙ', '判断 Sₙ 是否存在有限极限', '极限存在写出和；不存在说明发散方式'], example: '等比级数 q=1/2 时，Sₙ=2-(1/2)ⁿ⁻¹，最终趋于 2。', question: '部分和趋于无穷大算不算收敛？', hint: '不算。级数收敛要求极限是有限数。' },
  necessary: { intuition: '如果每次新增的金额一直不够小，总额当然不可能稳定。', definition: '若 Σaₙ 收敛，则 aₙ=Sₙ-Sₙ₋₁→0。这只是必要条件，不是充分条件。', steps: ['先计算 lim aₙ', '非零或不存在时立即判发散', '等于零时不要停，继续选其他判别法'], example: 'Σ(-1)ⁿ 的通项不趋零，所以发散；Σ1/n 通项趋零但仍发散。', question: '“通项趋零”在判断中扮演什么角色？', hint: '它是入场检查，只能排除，不能确认收敛。' },
  cauchy: { intuition: '若级数真的稳定，足够靠后的任意一小段尾和都应该很小。', definition: 'Σaₙ 收敛当且仅当：任意 ε>0，存在 N，使 m>n>N 时 |aₙ₊₁+···+aₘ|<ε。', steps: ['写出任意尾和 Sₘ-Sₙ', '估计它的绝对值', '证明它对所有 m>n>N 都能小于 ε'], example: '它常用于证明理论结论；判断基础选择题时通常不直接计算。', question: '柯西准则需要提前知道级数的和 S 吗？', hint: '不需要，这正是它的价值。' },
  geometric: { intuition: '每一项都是上一项乘同一个比例 q，缩小得足够快就能收敛。', definition: 'Σaqⁿ 在 |q|<1 时收敛；|q|≥1 时发散。常见和为 a/(1-q)，注意起始下标。', steps: ['确认相邻项比值是常数 q', '判断 |q| 与 1 的关系', '需要求和时核对首项和起始下标'], example: '1+1/2+1/4+··· 的 q=1/2，因此收敛。', question: 'q=-1/2 时正负交替，几何级数是否收敛？', hint: '看的是 |q|，不是 q 是否为正。' },
  'p-series': { intuition: '它是正项级数最重要的“标准尺子”，其他级数经常先化得像它。', definition: 'Σ1/nᵖ 当且仅当 p>1 时收敛；p≤1 时发散。', steps: ['把通项主导部分整理成 1/nᵖ', '读出指数 p', '用 p>1 的分界线判断'], example: 'Σ1/n² 收敛；Σ1/√n 的 p=1/2，因此发散。', question: 'Σ1/n¹·⁰¹ 与 Σ1/n⁰·⁹⁹ 哪一个收敛？', hint: '只比较指数是否严格大于 1。' },
  telescoping: { intuition: '每项拆成一正一负，相邻项像拉链一样大量抵消。', definition: '若 aₙ=bₙ-bₙ₊₁，则 Sₙ=b₁-bₙ₊₁，敛散由剩余首尾项决定。', steps: ['对通项做部分分式或恒等变形', '写出前几项观察相消结构', '保留未消掉的首项和尾项后取极限'], example: '1/[n(n+1)]=1/n-1/(n+1)，部分和只剩 1-1/(n+1)。', question: '裂项后能否直接把所有项都说成抵消为 0？', hint: '不能，必须保留边界处没有配对的项。' },
  comparison: { intuition: '不知道一个正项级数时，把它夹在已知级数的上方或下方。', definition: '0≤aₙ≤bₙ 时：Σbₙ 收敛可推出 Σaₙ 收敛；Σaₙ 发散可推出 Σbₙ 发散。', steps: ['确认从某项起两者都非负', '选择合适的 p 级数或几何级数作参照', '根据要证明收敛还是发散决定比较方向'], example: '1/(n²+1)≤1/n²，所以对应级数收敛。', question: '要证明一个级数发散，应该找比它更大还是更小的发散级数？', hint: '找一个不超过它、但已经发散的级数。' },
  'limit-comparison': { intuition: '若两个正项通项最终是同一量级，它们通常同收敛或同发散。', definition: 'aₙ,bₙ>0 且 lim(aₙ/bₙ)=c∈(0,∞)，则 Σaₙ 与 Σbₙ 同敛散。', steps: ['只保留通项中最高阶或主导部分', '选出简单参照 bₙ', '计算比值极限并确认是正常数'], example: 'aₙ=(3n+1)/(n³+2)，与 1/n² 比值趋于 3，因此同样收敛。', question: '比值极限等于正常数说明了什么？', hint: '说明两者只差一个稳定的倍数，量级相同。' },
  ratio: { intuition: '观察后一项相对前一项缩小得多快，特别适合阶乘和指数。', definition: '对正项级数，若 L=lim(aₙ₊₁/aₙ)，L<1 绝对收敛，L>1 发散，L=1 无结论。', steps: ['写出 aₙ₊₁ 并与 aₙ 作比', '约掉阶乘、指数或连乘公共部分', '求 L 并与 1 比较'], example: 'aₙ=1/n! 时，aₙ₊₁/aₙ=1/(n+1)→0，所以收敛。', question: '比值极限 L=1 时能否判为发散？', hint: '不能；Σ1/n 与 Σ1/n² 都得到 L=1，但敛散不同。' },
  root: { intuition: '当整个通项像“某个东西的 n 次方”时，直接开 n 次根看底数。', definition: '对正项级数，若 L=lim ⁿ√aₙ，L<1 收敛，L>1 发散，L=1 无结论。', steps: ['识别通项的 n 次幂结构', '计算 n 次根并化简', '求极限后与 1 比较'], example: 'aₙ=[n/(2n+1)]ⁿ，开 n 次根后趋于 1/2，因此收敛。', question: '根值法和比值法的结论边界有什么共同点？', hint: '都以 1 为分界，等于 1 时都失效。' },
  integral: { intuition: '把离散的小柱子与连续曲线下的面积比较。', definition: '若 f 在 [1,∞) 连续、正值且递减，则 Σf(n) 与反常积分 ∫₁∞f(x)dx 同敛散。', steps: ['找出满足 aₙ=f(n) 的函数', '检查连续、正值、最终递减', '计算对应反常积分'], example: '取 f(x)=1/xᵖ，可由积分再次得到 p>1 才收敛。', question: '若 f(x) 不递减，可以直接套积分判别吗？', hint: '不能，至少需要从某一点开始满足条件。' },
  absolute: { intuition: '先忽略正负抵消；若所有绝对值相加都稳定，原级数当然更稳定。', definition: '若 Σ|aₙ| 收敛，则称 Σaₙ 绝对收敛，并且原级数一定收敛。', steps: ['把通项换成 |aₙ|', '按正项级数选择判别法', '绝对值级数收敛即可结束'], example: 'Σ(-1)ⁿ/n² 的绝对值级数是 Σ1/n²，因此绝对收敛。', question: '绝对收敛能否推出普通收敛？', hint: '可以；反方向不一定成立。' },
  conditional: { intuition: '级数依靠正负抵消才收敛，一旦去掉符号就会发散。', definition: 'Σaₙ 收敛而 Σ|aₙ| 发散时，称为条件收敛。', steps: ['先证明带符号的原级数收敛', '再判断绝对值级数发散', '两个结论同时成立才叫条件收敛'], example: '交错调和级数 Σ(-1)ⁿ⁻¹/n 收敛，但 Σ1/n 发散。', question: '只证明交错级数收敛，能否直接说它条件收敛？', hint: '不能，还必须检查绝对值级数。' },
  leibniz: { intuition: '正项和负项轮流拉扯，拉扯幅度持续减小到零时，总和会稳定。', definition: '若 bₙ≥0、bₙ 单调递减且 bₙ→0，则 Σ(-1)ⁿbₙ 收敛。', steps: ['确认符号严格交替', '证明 bₙ 最终单调递减', '检查 bₙ→0，再另查绝对收敛'], example: 'Σ(-1)ⁿ⁻¹/n 满足三个条件，因此收敛。', question: '莱布尼茨判别直接得到的是绝对收敛吗？', hint: '不是，它只保证原交错级数收敛。' },
  dirichlet: { intuition: '一部分不断振荡、累计不跑远，另一部分把振幅逐渐压到零。', definition: '若 Aₙ=Σₖ₌₁ⁿaₖ 有界，bₙ 单调且 bₙ→0，则 Σaₙbₙ 收敛。', steps: ['把通项拆成振荡因子 aₙ 与衰减因子 bₙ', '检查 aₙ 的部分和 Aₙ 有界', '检查 bₙ 单调趋零'], example: 'Σsin(n)/n 可用狄利克雷思想：sin(n) 的部分和有界，1/n 单调趋零。', question: '要求有界的是 aₙ 本身还是它的部分和？', hint: '是 aₙ 的部分和 Aₙ。' },
  abel: { intuition: '一个已经收敛的级数，再乘上变化温和且有界的权重，仍能保持收敛。', definition: '若 Σaₙ 收敛，bₙ 单调且有界，则 Σaₙbₙ 收敛。', steps: ['识别已知收敛的 Σaₙ', '检查权重 bₙ 单调', '检查 bₙ 有界'], example: '它比莱布尼茨更一般，常用于理论证明和含参数级数。', question: '阿贝尔判别要求 bₙ 趋于 0 吗？', hint: '不要求，只需单调有界，因此它必有有限极限。' },
  radius: { intuition: '幂级数以 x₀ 为中心，通常在一段对称距离内收敛，距离就是 R。', definition: 'Σaₙ(x-x₀)ⁿ 存在 R∈[0,∞]：|x-x₀|<R 绝对收敛，|x-x₀|>R 发散。', steps: ['用比值法或根值法处理含 x 的通项', '解出 |x-x₀|<R', '先记录开区间，暂不处理端点'], example: 'Σxⁿ/n 的比值判别给出 |x|<1，因此 R=1。', question: '求出 R=1 后，x=±1 是否自动收敛？', hint: '不自动，两个端点必须分别代回原级数。' },
  interval: { intuition: '半径确定内部，端点像两扇单独的门，需要逐扇检查。', definition: '收敛区间由 |x-x₀|<R 加上可能收敛的左、右端点共同组成。', steps: ['先求收敛半径 R', '分别将 x=x₀-R 与 x=x₀+R 代入', '把端点结论写成区间或区间并端点'], example: 'Σxⁿ/n 在 x=1 变成调和级数发散，在 x=-1 变成交错调和级数收敛。', question: '左右端点的敛散结果必须相同吗？', hint: '不必，可能一收敛一发散。' },
  'power-ops': { intuition: '在收敛区间内部，幂级数像多项式一样可以逐项求导和积分。', definition: '幂级数逐项求导或积分后收敛半径 R 不变，但端点敛散性可能改变。', steps: ['先确认操作发生在收敛区间内部', '对每一项按幂函数规则运算', '保留原半径，并重新检查端点'], example: '由 Σxⁿ=1/(1-x) 逐项积分，可构造与 ln(1-x) 有关的级数。', question: '逐项求导后，原来的端点结论能否照搬？', hint: '不能；半径不变，但端点必须重查。' },
  'sum-function': { intuition: '把无穷多个含 x 的项合并成一个普通函数。', definition: '幂级数在收敛区间内定义函数 S(x)=Σaₙ(x-x₀)ⁿ，称为和函数。', steps: ['寻找与几何级数有关的基础形式', '通过乘 x、换元、求导或积分变形', '写出和函数并标明有效收敛区间'], example: '在 |x|<1 内，1+x+x²+···=1/(1-x)。', question: '求出的代数表达式在收敛区间外也等于原级数吗？', hint: '不等于；级数在区间外可能根本不收敛。' },
  'taylor-series': { intuition: '用函数在一点处的所有阶导数，拼出一串幂函数来逼近它。', definition: '函数在 x₀ 的泰勒级数为 Σ f⁽ⁿ⁾(x₀)(x-x₀)ⁿ/n!；若余项趋零，级数才等于原函数。', steps: ['计算各阶导数在 x₀ 的值', '写出一般项并确定收敛范围', '检查泰勒余项是否趋于 0'], example: 'eˣ=1+x+x²/2!+x³/3!+···，对所有实数 x 成立。', question: '函数存在所有阶导数，就一定等于它的泰勒级数吗？', hint: '不一定，还需证明余项趋于 0。' }
};

let currentMapPoint = 'series-root';

function renderSeriesLesson(key) {
  const lesson = seriesLessons[key];
  const summary = seriesMapPoints[key];
  if (!lesson || !summary) return;
  $('#lessonBranch').textContent = summary[0];
  $('#lessonTitle').textContent = summary[1];
  $('#lessonIntuition').textContent = lesson.intuition;
  $('#lessonDefinition').textContent = lesson.definition;
  $('#lessonSteps').replaceChildren(...lesson.steps.map(step => {
    const item = document.createElement('li');
    item.textContent = step;
    return item;
  }));
  $('#lessonExample').textContent = lesson.example;
  $('#lessonQuestion').textContent = lesson.question;
  $('#lessonHint').textContent = lesson.hint;
  const details = $('.lesson-check details');
  details.open = false;
}

function selectMapPoint(key) {
  const point = seriesMapPoints[key];
  if (!point) return;
  $$('.map-node, .map-root').forEach(node => node.classList.toggle('is-selected', node.dataset.point === key));
  const [branch, title, use, rule, pitfall] = point;
  $('#mapDetailBranch').textContent = branch;
  $('#mapDetailTitle').textContent = title;
  $('#mapDetailUse').textContent = use;
  $('#mapDetailRule').textContent = rule;
  $('#mapDetailPitfall').textContent = pitfall;
  currentMapPoint = key;
  if (!$('#mapLesson').hidden) renderSeriesLesson(key);
  saveProgress(`map-${key}`);
}

function setupSeries() {
  $$('.map-node, .map-root').forEach(node => node.addEventListener('click', () => selectMapPoint(node.dataset.point)));
  $('#mapExpandButton').addEventListener('click', () => {
    const lesson = $('#mapLesson');
    const willOpen = lesson.hidden;
    lesson.hidden = !willOpen;
    $('#mapExpandButton').setAttribute('aria-expanded', String(willOpen));
    $('#mapExpandButton span').textContent = willOpen ? '收起完整讲解' : '展开完整讲解';
    if (willOpen) {
      renderSeriesLesson(currentMapPoint);
      lesson.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
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

function positionSeriesMap() {
  const map = $('.map-scroll');
  if (window.matchMedia('(max-width: 760px)').matches) {
    if (!map.dataset.mobilePositioned) {
      map.scrollLeft = (map.scrollWidth - map.clientWidth) / 2;
      map.dataset.mobilePositioned = 'true';
    }
  } else {
    delete map.dataset.mobilePositioned;
    map.scrollLeft = 0;
  }
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
  positionSeriesMap();
}));

const canvasObserver = new ResizeObserver(entries => {
  entries.forEach(entry => {
    if (entry.target.id === 'seriesCanvas') drawSeries();
    if (entry.target.id === 'linearCanvas') drawLinear();
  });
});
canvasObserver.observe($('#seriesCanvas'));
canvasObserver.observe($('#linearCanvas'));
window.addEventListener('resize', positionSeriesMap);
