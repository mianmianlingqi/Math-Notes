function renderMath() {
  if (typeof renderMathInElement === 'undefined') {
    console.warn('KaTeX auto-render not loaded');
    return;
  }
  renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderMath);
} else {
  renderMath();
}
