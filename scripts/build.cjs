const fs = require('fs');
const path = require('path');
const katex = require('../vendor/katex/katex.min.js');

const ROOT = path.join(__dirname, '..');
const srcPath = path.join(ROOT, 'src', 'index.html');

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
  let html = fs.readFileSync(srcPath, 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  let katexCss = fs.readFileSync(path.join(ROOT, 'vendor/katex/katex.min.css'), 'utf8');
  katexCss = katexCss.replace(/url\(fonts\//g, 'url(vendor/katex/fonts/');

  html = renderMath(html);

  const styleBlock = `<style>\n${katexCss}\n${css}\n</style>`;
  html = html.replace('</head>', `${styleBlock}\n</head>`);

  const outPath = path.join(ROOT, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`Built ${outPath} (${kb} KB)`);
}

build();
