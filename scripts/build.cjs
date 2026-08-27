const fs = require('fs');
const path = require('path');
const katex = require('../vendor/katex/katex.min.js');
const { buildCards } = require('./build-cards.cjs');
const { buildAllModules, buildToc, buildPageShell, MODULES } = require('./md2html.cjs');

const ROOT = path.join(__dirname, '..');

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&vert;/g, '|');
}

function renderMath(html) {
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), {
        displayMode: true,
        throwOnError: false
      });
    } catch {
      return `$$${tex}$$`;
    }
  });

  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(decodeEntities(tex.trim()), {
        displayMode: false,
        throwOnError: false
      });
    } catch {
      return `$${tex}$`;
    }
  });

  return html;
}

function build() {
  buildCards();
  const modules = buildAllModules();
  const content = modules
    .map((html, idx) => (idx > 0 ? '\n      <hr class="divider">\n\n      ' : '') + html)
    .join('');

  const toc = buildToc(MODULES, modules);
  let html = buildPageShell(toc, content);

  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  let katexCss = fs.readFileSync(path.join(ROOT, 'vendor/katex/katex.min.css'), 'utf8');
  katexCss = katexCss.replace(/url\(fonts\//g, 'url(vendor/katex/fonts/');

  html = renderMath(html);

  const styleBlock = `<style>\n${katexCss}\n${css}\n</style>`;
  html = html.replace('</head>', `${styleBlock}\n</head>`);

  fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`Built index.html — ${MODULES.length} modules (${kb} KB)`);
}

build();
