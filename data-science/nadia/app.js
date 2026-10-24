// Reading tools and charts for Nadia's project. The numbers are the cleaned
// Census 2020 table: data/census2020-primary-secondary-clean.csv.
const GROUPS = [
  { name: 'No transport needed', pri: [101356, 41.3], sec: [24935, 14.4] },
  { name: 'Car, taxi or private-hire car', pri: [53506, 21.8], sec: [22520, 13.0] },
  { name: 'Public bus', pri: [38560, 15.7], sec: [64080, 36.9] },
  { name: 'School bus or van', pri: [33842, 13.8], sec: [4061, 2.3] },
  { name: 'MRT or LRT, with or without a bus', pri: [13811, 5.6], sec: [56712, 32.6] },
  { name: 'Other ways', pri: [4381, 1.8], sec: [1402, 0.8] }
];
const NS = 'http://www.w3.org/2000/svg';
const big = (n) => n.toLocaleString('en-SG');

function el(tag, attrs, parent, text) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

// Text size and the short version.
function readingTools() {
  const root = document.documentElement;
  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.classList.remove('size-1', 'size-2');
      if (btn.dataset.size !== '0') root.classList.add('size-' + btn.dataset.size);
      document.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      drawAll();
    });
  });
  const shortBtn = document.getElementById('short-toggle');
  if (shortBtn) {
    shortBtn.addEventListener('click', () => {
      const on = !root.classList.contains('short-only');
      root.classList.toggle('short-only', on);
      shortBtn.setAttribute('aria-pressed', String(on));
      drawAll();
    });
  }
}

// Each figure can show a chart, a table or plain sentences.
function viewSwitches() {
  document.querySelectorAll('[data-views]').forEach((fig) => {
    const buttons = fig.querySelectorAll('[data-view]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        fig.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== btn.dataset.view; });
        if (btn.dataset.view === 'chart') drawAll();
      });
    });
  });
}

function tooltip(box) {
  if (box._tip) return box._tip;
  const tip = document.createElement('div');
  tip.className = 'tip';
  box.appendChild(tip);
  box._tip = {
    show(x, y, html) { tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block'; },
    hide() { tip.style.display = 'none'; }
  };
  return box._tip;
}

// Horizontal bars. Each group gets its name above its bars, wrapped onto two
// lines if needed, so long names never squeeze the bars on a phone.
function drawBars(box, series) {
  if (!box || box.offsetParent === null) return;
  box.querySelectorAll('svg').forEach((s) => s.remove());
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.82;
  const W = Math.max(280, box.clientWidth);
  const barH = Math.round(fs * 1.7), gap = 4, nameH = Math.round(fs * 1.7), groupGap = Math.round(fs * 1.1);
  const lineH = Math.round(fs * 1.35);
  const left = 4, right = Math.round(fs * (series.length > 1 ? 9.5 : 8)), top = Math.round(fs * 1.6);
  const pw = W - left - right;
  const max = 50;
  const x = (v) => left + (v / max) * pw;
  const svg = el('svg', { viewBox: `0 0 ${W} 100`, role: 'img', 'aria-label': box.dataset.label, style: `font-size:${fs}px` });
  box.prepend(svg);
  // Stripes for the second series, so colour is never the only clue.
  const pid = 'stripes-' + box.id;
  const defs = el('defs', {}, svg);
  const pat = el('pattern', { id: pid, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  el('rect', { width: 8, height: 8, style: 'fill: var(--sec)' }, pat);
  el('rect', { x: 5.5, width: 2.5, height: 8, style: 'fill: var(--stripe)' }, pat);
  const gridLayer = el('g', {}, svg);
  const tip = tooltip(box);
  const room = W - left - 4;
  let y = top;
  GROUPS.forEach((g) => {
    const name = el('text', { class: 'name', x: left, y: y + nameH - 7 }, svg, g.name);
    let extra = 0;
    if (name.getComputedTextLength() > room) {
      // Fill the first line word by word, then put the rest on a second line.
      const words = g.name.split(' ');
      let cut = words.length - 1;
      name.textContent = words.slice(0, cut).join(' ');
      while (cut > 1 && name.getComputedTextLength() > room) { cut--; name.textContent = words.slice(0, cut).join(' '); }
      name.textContent = '';
      el('tspan', { x: left }, name, words.slice(0, cut).join(' '));
      el('tspan', { x: left, dy: lineH }, name, words.slice(cut).join(' '));
      extra = lineH;
    }
    y += nameH + extra;
    series.forEach((s) => {
      const [count, pct] = g[s.key];
      const yb = y;
      const w = Math.max(2, x(pct) - left);
      const bar = el('rect', { class: s.key, x: left, y: yb, width: w, height: barH, rx: 4 }, svg);
      if (s.key === 'sec') bar.setAttribute('fill', `url(#${pid})`);
      const label = series.length > 1 ? `${s.short} ${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
      el('text', { class: 'val', x: left + w + 6, y: yb + barH * 0.7 }, svg, label);
      const hit = el('rect', { class: 'hit', x: 0, y: yb - 2, width: W, height: barH + 4 }, svg);
      const show = (ev) => {
        const rect = box.getBoundingClientRect();
        const px = ev && ev.clientX ? ev.clientX - rect.left : left + w;
        tip.show(Math.min(Math.max(px, 110), rect.width - 110), yb * (rect.width / W),
          `<strong>${s.long}: ${g.name}</strong><br>${pct.toFixed(1)}%, about ${big(count)} pupils`);
      };
      hit.addEventListener('pointermove', show);
      hit.addEventListener('click', show);
      y += barH + gap;
    });
    y += groupGap;
  });
  const H = y;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const step = pw < fs * 30 ? 25 : 10;
  for (let v = 0; v <= max; v += step) {
    el('line', { class: 'grid', x1: x(v), x2: x(v), y1: top - 4, y2: H - groupGap / 2 }, gridLayer);
    el('text', { x: x(v), y: top - 10, 'text-anchor': v === 0 ? 'start' : 'middle' }, gridLayer, v + '%');
  }
  el('line', { class: 'base', x1: left, x2: left, y1: top - 4, y2: H - groupGap / 2 }, svg);
  svg.addEventListener('pointerleave', () => tip.hide());
}

function drawAll() {
  drawBars(document.getElementById('chart-primary'), [{ key: 'pri', short: 'Primary', long: 'Primary' }]);
  drawBars(document.getElementById('chart-compare'), [
    { key: 'pri', short: 'Primary', long: 'Primary' },
    { key: 'sec', short: 'Secondary', long: 'Secondary' }
  ]);
}

readingTools();
viewSwitches();
drawAll();
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  drawAll();
});
