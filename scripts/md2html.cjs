const fs = require('fs');
const path = require('path');

const MODULES = [
  { file: '01-函数与极限背诵速记.md', id: 'limit', prefix: 'f', title: '函数与极限', num: '01', weight: '15%～20%' },
  { file: '02-导数与微分背诵速记.md', id: 'deriv', prefix: 'd', title: '导数与微分', num: '02', weight: '25%～30%' },
  { file: '03-积分背诵速记.md', id: 'integ', prefix: 'i', title: '积分', num: '03', weight: '20%～25%' },
  { file: '04-微分方程背诵速记.md', id: 'de', prefix: 'e', title: '微分方程', num: '04', weight: '微分学应用' },
  { file: '05-偏导数背诵速记.md', id: 'partial', prefix: 'p', title: '偏导数与多元函数', num: '05', weight: '15%～20%' },
  { file: '06-无穷级数背诵速记.md', id: 'series', prefix: 's', title: '无穷级数', num: '06', weight: '10%～15%' },
  { file: '07-线性代数背诵速记.md', id: 'linear', prefix: 'l', title: '线性代数', num: '07', weight: '约 20%' }
];

function inline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function cardClass(header) {
  if (header.includes('🔴') || header.includes('📐')) return 'card must';
  if (header.includes('📖')) return 'card def';
  if (header.includes('了解') || header.includes('选做')) return 'card tip';
  return 'card';
}

function cardLabel(header) {
  return header
    .replace(/🔴\s*/g, '')
    .replace(/📖\s*/g, '')
    .replace(/📐\s*/g, '')
    .trim();
}

function isTableLine(line) {
  return line.trim().startsWith('|');
}

function parseTable(lines, start) {
  let i = start;
  const rows = [];
  while (i < lines.length && isTableLine(lines[i])) {
    const row = lines[i]
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim());
    if (!row.every(c => /^[-:\s]+$/.test(c))) rows.push(row);
    i++;
  }
  if (!rows.length) return { html: '', next: start };

  const [head, ...body] = rows;
  let html = '<table class="table"><thead><tr>';
  head.forEach(c => { html += `<th>${inline(c)}</th>`; });
  html += '</tr></thead><tbody>';
  body.forEach(row => {
    html += '<tr>';
    row.forEach(c => { html += `<td>${inline(c)}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return { html, next: i };
}

function parseList(lines, start, endAt) {
  const ordered = /^\d+\.\s/.test(lines[start]);
  const tag = ordered ? 'ol' : 'ul';
  const cls = ordered ? 'steps' : 'plain';
  let i = start;
  let html = `<${tag} class="${cls}">`;
  while (i < lines.length && i < endAt) {
    const m = lines[i].match(ordered ? /^(\d+)\.\s+(.*)/ : /^-\s+(.*)/);
    if (!m) break;
    html += `<li>${inline(m[ordered ? 2 : 1])}</li>`;
    i++;
  }
  html += `</${tag}>`;
  return { html, next: i };
}

function parseMathBlock(lines, start) {
  let i = start;
  let line = lines[i].trim();
  if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
    return { html: `<div class="formula">${line}</div>`, next: i + 1 };
  }
  let tex = line.replace(/^\$\$/, '');
  i++;
  while (i < lines.length && !lines[i].includes('$$')) {
    tex += `\n${lines[i]}`;
    i++;
  }
  if (i < lines.length) tex += `\n${lines[i].replace(/\$\$.*$/, '')}`;
  return { html: `<div class="formula">$$${tex.trim()}$$</div>`, next: i + 1 };
}

function parseCardBody(lines, start, endAt) {
  let i = start;
  let html = '';
  while (i < lines.length && i < endAt) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('### ') || line.startsWith('## ')) break;
    if (line.startsWith('>') || line.startsWith('- [ ]')) { i++; continue; }

    if (line.trim().startsWith('$$')) {
      const block = parseMathBlock(lines, i);
      html += block.html;
      i = block.next;
      continue;
    }
    if (isTableLine(line)) {
      const table = parseTable(lines, i);
      html += table.html;
      i = table.next;
      continue;
    }
    if (/^-\s/.test(line) || /^\d+\.\s/.test(line)) {
      const list = parseList(lines, i, endAt);
      html += list.html;
      i = list.next;
      continue;
    }
    if (line.startsWith('---')) { i++; continue; }

    html += `<p>${inline(line)}</p>`;
    i++;
  }
  return { html, next: i };
}

function sectionEnd(lines, start, skipHeader = false) {
  const from = skipHeader ? start + 1 : start;
  for (let i = from; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) return i;
  }
  return lines.length;
}

function parseChapter(lines, start, prefix, chNum, chTitle) {
  const end = sectionEnd(lines, start);
  let i = start;
  let html = `<section class="block" id="${prefix}${chNum}"><h2>第${chNum}章 · ${chTitle}</h2>`;

  while (i < end) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('---')) { i++; continue; }

    if (line.startsWith('### ')) {
      const header = line.replace(/^###\s+/, '');
      const cls = cardClass(header);
      const label = cardLabel(header);
      i++;
      const body = parseCardBody(lines, i, end);
      i = body.next;

      html += `<div class="${cls}"><p class="card-label">${label}</p>${body.html}</div>`;
      continue;
    }

    if (isTableLine(line)) {
      const table = parseTable(lines, i);
      html += table.html;
      i = table.next;
      continue;
    }

    i++;
  }

  html += '</section>';
  return { html, next: end };
}

function parseFlowSection(lines, start, prefix) {
  const end = sectionEnd(lines, start, true);
  let i = start + 1;
  let html = `<section class="block" id="${prefix}-flow"><h2>大题流程速记</h2><div class="flow-grid">`;

  while (i < end) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      const title = line.replace(/^###\s+/, '');
      i++;
      const body = parseCardBody(lines, i, end);
      i = body.next;
      html += `<div class="card flow"><h3>${title}</h3>${body.html.replace(/<p class="card-label">[^<]*<\/p>/g, '')}</div>`;
      continue;
    }
    if (line.startsWith('>')) { i++; continue; }
    i++;
  }

  html += '</div></section>';
  return { html, next: end };
}

function mdToModuleHtml(md, mod) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let lead = '口诀 → 公式 → 步骤 → 易混。考前通读，重点默写必背块。';
  for (const line of lines) {
    if (line.startsWith('>') && !line.includes('江苏专转本')) {
      lead = line.replace(/^>\s*/, '').trim();
      break;
    }
  }

  let html = `<header class="module-hero" id="${mod.id}">`;
  html += `<p class="eyebrow">模块 ${mod.num} · 约占 ${mod.weight}</p>`;
  html += `<h1>${mod.title}</h1>`;
  html += `<p class="lead">${lead}</p></header>`;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## 第') && line.includes('章')) {
      const m = line.match(/## 第(\d+)章\s+(.+)/);
      if (m) {
        const block = parseChapter(lines, i + 1, mod.prefix, m[1], m[2]);
        html += block.html;
        i = block.next;
        continue;
      }
    }

    if (line.startsWith('## 易混对比')) {
      i++;
      const end = sectionEnd(lines, i);
      html += `<section class="block" id="${mod.prefix}-compare"><h2>易混对比</h2>`;
      while (i < end) {
        if (isTableLine(lines[i])) {
          const table = parseTable(lines, i);
          html += table.html;
          i = table.next;
        } else {
          i++;
        }
      }
      html += '</section>';
      continue;
    }

    if (line.startsWith('## 大题流程') || line.startsWith('## 公式速查')) {
      if (line.startsWith('## 公式速查')) {
        i++;
        const end = sectionEnd(lines, i);
        html += `<section class="block" id="${mod.prefix}-formulas"><h2>公式速查墙</h2>`;
        const body = parseCardBody(lines, i, end);
        html += `<div class="card must">${body.html}</div></section>`;
        i = end;
        continue;
      }
      const flow = parseFlowSection(lines, i, mod.prefix);
      html += flow.html;
      i = flow.next;
      continue;
    }

    i++;
  }

  return html;
}

function buildToc(modules, moduleHtmls) {
  let toc = '';
  for (let idx = 0; idx < modules.length; idx++) {
    const mod = modules[idx];
    toc += `<p class="toc-group">${mod.title}</p>`;
    toc += `<a href="#${mod.id}">概览</a>`;

    const md = fs.readFileSync(path.join(modulesRoot, mod.file), 'utf8');
    const lines = md.split('\n');
    for (const line of lines) {
      const ch = line.match(/^## 第(\d+)章\s+(.+)/);
      if (ch) {
        const short = ch[2].length > 8 ? ch[2].slice(0, 8) : ch[2];
        toc += `<a href="#${mod.prefix}${ch[1]}">第${ch[1]}章 ${short}</a>`;
      }
      if (line.startsWith('## 易混对比')) toc += `<a href="#${mod.prefix}-compare">易混对比</a>`;
      if (line.startsWith('## 大题流程')) toc += `<a href="#${mod.prefix}-flow">大题流程</a>`;
      if (line.startsWith('## 公式速查')) toc += `<a href="#${mod.prefix}-formulas">公式速查</a>`;
    }
  }
  return toc;
}

const modulesRoot = path.join(__dirname, '..', '专转本高数');

function buildAllModules() {
  return MODULES.map(mod => {
    const md = fs.readFileSync(path.join(modulesRoot, mod.file), 'utf8');
    return mdToModuleHtml(md, mod);
  });
}

function buildPageShell(toc, content) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="江苏专转本高数 · 7 模块知识点速览">
  <title>高数知识点速览 · 专转本</title>
</head>
<body>
  <a class="skip" href="#content">跳到正文</a>

  <header class="mobile-bar">
    <button class="menu-btn" type="button" id="menuBtn" aria-label="打开目录" aria-expanded="false" aria-controls="sidebar">☰</button>
    <strong>高数速览</strong>
  </header>
  <div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <span class="mark">∑</span>
      <div>
        <strong>高数速览</strong>
        <span>专转本 · 7 模块</span>
      </div>
    </div>
    <nav class="toc" aria-label="目录">
${toc}
    </nav>
    <p class="sidebar-foot">
      <a href="quiz.html">✍️ 填空练习</a><br>
      <a href="https://github.com/mianmianlingqi/Math-Notes">Math-Notes</a>
    </p>
  </aside>

  <div class="page">
    <article class="content" id="content">
${content}
    </article>

    <footer class="footer">
      配合
      <a href="https://github.com/mianmianlingqi/Math-Notes/tree/main/专转本高数">专转本高数背诵速记</a>
      使用 · 江苏专转本
    </footer>
  </div>

  <script>
  (function () {
    var btn = document.getElementById('menuBtn');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (!btn) return;
    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '关闭目录' : '打开目录');
      if (backdrop) backdrop.hidden = !open;
    }
    btn.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
    document.querySelectorAll('.toc a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  })();
  </script>
</body>
</html>`;
}

module.exports = { MODULES, mdToModuleHtml, buildToc, buildAllModules, buildPageShell, modulesRoot };
