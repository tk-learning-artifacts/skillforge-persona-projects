// The code page: counts who wrote each line of app.js, shows the code with
// its tags, and runs the shuffle test.
(function () {
  'use strict';

  // Who wrote what, from the [AI], [AI, then me] and [Me] tags.
  const KINDS = { 'AI': 'ai', 'AI, then me': 'mix', 'Me': 'me' };
  const counts = { ai: 0, mix: 0, me: 0 };
  const box = document.getElementById('source');
  let kind = '';
  window.APP_SOURCE.replace(/\n$/, '').split('\n').forEach((line, i) => {
    const tag = line.match(/^\s*\/\/ \[(AI|AI, then me|Me)\]/);
    if (tag) kind = KINDS[tag[1]];
    else if (kind && line.trim()) counts[kind]++;
    const row = document.createElement('div');
    row.className = kind;
    row.dataset.n = i + 1;
    row.textContent = line || ' ';
    box.append(row);
  });
  const total = counts.ai + counts.mix + counts.me;
  const pct = (n) => Math.round(100 * n / total);
  ['ai', 'mix', 'me'].forEach((k) => {
    document.getElementById('n-' + k).textContent = counts[k] + ' lines (' + pct(counts[k]) + '%)';
    document.getElementById('bar-' + k).style.flex = String(counts[k]);
  });
  document.getElementById('n-total').textContent = String(total);
  document.getElementById('n-first').textContent = pct(counts.ai + counts.mix) + '%';

  // The shuffle test: how often does each student land first?
  const CLASS = 28, RUNS = 20000;
  const sortShuffle = (list) => list.slice().sort(() => Math.random() - 0.5);
  const fairShuffle = (list) => window.FairPicker.shuffle(list, Math.random);

  function firstCounts(shuffle) {
    const list = Array.from({ length: CLASS }, (_, i) => i + 1);
    const first = new Array(CLASS).fill(0);
    for (let r = 0; r < RUNS; r++) first[shuffle(list)[0] - 1]++;
    return first.map((c) => 100 * c / RUNS);
  }

  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    if (text) node.textContent = text;
    return node;
  }

  // A bar for each student, with a dashed line where a fair shuffle sits.
  function chart(holder, values) {
    const W = 640, H = 300, L = 62, B = 40, T = 14, MAX = 10;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': holder.dataset.label });
    const y = (v) => T + (H - T - B) * (1 - Math.min(v, MAX) / MAX);
    [0, 2, 4, 6, 8, 10].forEach((v) => {
      svg.append(svgEl('line', { class: 'grid', x1: L, x2: W, y1: y(v), y2: y(v) }));
      svg.append(svgEl('text', { class: 'axis', x: L - 8, y: y(v) + 7, 'text-anchor': 'end' }, v + '%'));
    });
    const step = (W - L) / CLASS;
    values.forEach((v, i) => {
      const x = L + i * step + 2;
      const bar = svgEl('rect', { class: 'bar', x: x, y: y(v), width: step - 4, height: Math.max(0, y(0) - y(v)), rx: 2 });
      bar.append(svgEl('title', {}, 'No. ' + (i + 1) + ': first in ' + v.toFixed(1) + '% of shuffles'));
      svg.append(bar);
      if (i === 0 || (i + 1) % 5 === 0) svg.append(svgEl('text', { class: 'axis', x: x + (step - 4) / 2, y: H - 10, 'text-anchor': 'middle' }, String(i + 1)));
    });
    const fair = 100 / CLASS;
    svg.append(svgEl('line', { class: 'fair', x1: L, x2: W, y1: y(fair), y2: y(fair) }));
    svg.append(svgEl('text', { class: 'label', x: W - 4, y: y(fair) - 8, 'text-anchor': 'end' }, 'fair: 3.6%'));
    holder.querySelector('svg') && holder.querySelector('svg').remove();
    holder.append(svg);
  }

  function table(body, a, b) {
    body.textContent = '';
    a.forEach((v, i) => {
      const tr = document.createElement('tr');
      ['No. ' + (i + 1), v.toFixed(1) + '%', b[i].toFixed(1) + '%'].forEach((t) => {
        const td = document.createElement('td');
        td.textContent = t;
        tr.append(td);
      });
      body.append(tr);
    });
  }

  function run() {
    const sorted = firstCounts(sortShuffle);
    const fair = firstCounts(fairShuffle);
    chart(document.getElementById('chart-sort'), sorted);
    chart(document.getElementById('chart-fair'), fair);
    table(document.getElementById('table-body'), sorted, fair);
    const top = sorted.indexOf(Math.max.apply(null, sorted));
    document.getElementById('result').textContent =
      'This run: with the sort shuffle, No. ' + (top + 1) + ' came first in ' + sorted[top].toFixed(1) +
      '% of shuffles. With Fisher-Yates, the highest was ' + Math.max.apply(null, fair).toFixed(1) +
      '% and the lowest ' + Math.min.apply(null, fair).toFixed(1) + '%.';
  }

  document.getElementById('run').addEventListener('click', run);
  run();
})();
