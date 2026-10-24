// Charts for Hafiz's rainfall project. The numbers below are the cleaned yearly
// table (data/changi-yearly-clean.csv), plus the month of each year's wettest day.
// Columns: year, total mm, wettest day mm, rain days, mm per rain day, month of wettest day.
const YEARS = [[1984,2686.7,154.4,191,14.1,2],[1985,1483.9,86.8,181,8.2,12],[1986,2536.1,131.7,174,14.6,12],[1987,2102.8,127.4,151,13.9,1],[1988,2598.6,187.3,173,15.0,9],[1989,2463.2,148.6,173,14.2,11],[1990,1523.8,153.7,142,10.7,5],[1991,1877.0,129.9,146,12.9,8],[1992,2260.8,120.6,163,13.9,11],[1993,2168.7,67.6,163,13.3,12],[1994,1941.8,178.3,160,12.1,11],[1995,2332.6,198.6,179,13.0,11],[1996,2418.0,94.3,170,14.2,6],[1997,1118.9,65.8,116,9.6,12],[1998,2623.1,84.4,177,14.8,12],[1999,2134.0,76.9,177,12.1,12],[2000,2370.5,127.6,188,12.6,1],[2001,2783.1,211.1,184,15.1,12],[2002,1748.9,84.0,139,12.6,11],[2003,2391.2,194.4,186,12.9,1],[2004,2136.4,177.8,147,14.5,1],[2005,1930.7,133.8,175,11.0,11],[2006,2753.2,198.0,174,15.8,12],[2007,2886.2,159.0,195,14.8,12],[2008,2325.1,133.9,182,12.8,8],[2009,1920.9,86.6,166,11.6,4],[2010,2075.1,121.1,178,11.7,7],[2011,2524.2,216.2,188,13.4,1],[2012,2159.9,92.3,191,11.3,3],[2013,2748.4,139.8,206,13.3,10],[2014,1538.4,64.4,152,10.1,11],[2015,1267.1,63.2,125,10.1,8],[2016,1955.7,75.4,179,10.9,10],[2017,2045.6,69.8,204,10.0,12],[2018,1708.2,60.6,188,9.1,10],[2019,1367.5,92.2,120,11.4,10],[2020,1886.6,64.2,178,10.6,11],[2021,2809.6,210.6,182,15.4,1],[2022,2207.2,59.4,210,10.5,6],[2023,2411.2,154.8,180,13.4,2],[2024,2432.0,85.4,202,12.0,5],[2025,2833.5,210.5,174,16.3,3]];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, parent, text) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}
function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
// Least-squares slope, the same as numpy.polyfit(x, y, 1)[0].
function slope(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let top = 0, bottom = 0;
  for (let i = 0; i < xs.length; i++) { top += (xs[i] - mx) * (ys[i] - my); bottom += (xs[i] - mx) ** 2; }
  return top / bottom;
}
// Linear quartiles, the same method pandas uses by default.
function quantile(values, q) {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function fmt(n, d = 1) { return n.toFixed(d); }
function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)); }

// A tooltip that follows the pointer inside a chart box.
function tooltip(box) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  box.appendChild(tip);
  return {
    show(x, y, html) { tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block'; },
    hide() { tip.style.display = 'none'; }
  };
}

// Bar chart of the wettest day per year, used by chart 1 and the trick chart.
function drawBars(box, rows, opts) {
  box.querySelectorAll('svg').forEach((s) => s.remove());
  const W = Math.max(300, box.clientWidth);
  const H = W < 520 ? 250 : 300;
  const m = { l: 40, r: 10, t: 12, b: 30 };
  const yMin = opts.yMin || 0, yMax = 250;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.label });
  box.prepend(svg);
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const x = (i) => m.l + (i / rows.length) * pw;
  const y = (v) => m.t + ph - ((Math.max(v, yMin) - yMin) / (yMax - yMin)) * ph;
  for (let v = yMin; v <= yMax; v += 50) {
    el('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
    el('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, svg, v);
  }
  const bw = Math.max(2, pw / rows.length - 2);
  const step = rows.length > 30 ? (W < 520 ? 10 : 5) : rows.length > 12 ? 2 : 1;
  rows.forEach((r, i) => {
    const top = y(r[2]);
    const h = Math.max(0, m.t + ph - top);
    const rx = Math.min(4, bw / 2);
    // Rounded top, square base on the axis.
    const x0 = x(i) + 1, x1 = x0 + bw;
    el('path', { class: 'bar', 'data-i': i,
      d: `M${x0},${m.t + ph} V${top + rx} Q${x0},${top} ${x0 + rx},${top} H${x1 - rx} Q${x1},${top} ${x1},${top + rx} V${m.t + ph} Z` }, svg);
    if (r[0] % step === 0) el('text', { x: x0 + bw / 2, y: H - 10, 'text-anchor': 'middle' }, svg, r[0]);
  });
  el('line', { class: 'axis', x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph }, svg);
  if (yMin > 0) {
    // Mark the cut axis so the trick is visible to anyone who looks.
    el('line', { class: 'cut', x1: m.l - 8, x2: m.l + 8, y1: m.t + ph - 4, y2: m.t + ph + 4 }, svg);
  }
  if (opts.trend) {
    const xs = rows.map((r) => r[0]), ys = rows.map((r) => r[2]);
    const b = slope(xs, ys), a = mean(ys) - b * mean(xs);
    const yAt = (yr) => a + b * yr;
    const cx = (i) => x(i) + 1 + bw / 2;
    el('line', { class: 'trend', x1: cx(0), y1: y(yAt(xs[0])), x2: cx(rows.length - 1), y2: y(yAt(xs[xs.length - 1])) }, svg);
  }
  // Wide hit areas for tap and hover.
  const tip = box._tip || (box._tip = tooltip(box));
  const bars = svg.querySelectorAll('.bar');
  rows.forEach((r, i) => {
    const hit = el('rect', { class: 'hit', x: x(i), y: m.t, width: pw / rows.length, height: ph }, svg);
    const html = `<strong>${r[0]}</strong><br>${fmt(r[2])} mm on the wettest day<br>in ${MONTHS[r[5] - 1]}`;
    const on = (ev) => {
      bars.forEach((b, j) => b.classList.toggle('on', j === i));
      const rect = box.getBoundingClientRect();
      const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      tip.show(Math.min(Math.max(px, 70), rect.width - 70), y(r[2]), html);
      if (opts.onPick) opts.onPick(r);
    };
    hit.addEventListener('pointermove', on);
    hit.addEventListener('click', on);
  });
  svg.addEventListener('pointerleave', () => { tip.hide(); bars.forEach((b) => b.classList.remove('on')); });
}

// Chart 1: all 42 years.
function chartOne() {
  const box = document.getElementById('chart-1');
  if (!box) return;
  const trend = document.getElementById('show-trend');
  const out = document.getElementById('readout-1');
  const draw = () => drawBars(box, YEARS, {
    trend: trend.checked,
    label: 'Bar chart of the wettest day of each year at Changi, 1984 to 2025. Bars swing between about 60 and 216 mm. The trend line slopes down slightly.',
    onPick: (r) => { out.textContent = `${r[0]}: ${fmt(r[2])} mm, in ${MONTHS[r[5] - 1]}`; }
  });
  trend.addEventListener('change', draw);
  draw();
  return draw;
}

// Chart 2: box plots of the two halves, with every year as a dot.
function chartTwo() {
  const box = document.getElementById('chart-2');
  if (!box) return;
  const halves = [
    { name: '1984 to 2004', rows: YEARS.filter((r) => r[0] <= 2004) },
    { name: '2005 to 2025', rows: YEARS.filter((r) => r[0] >= 2005) }
  ];
  const draw = () => {
    box.querySelectorAll('svg').forEach((s) => s.remove());
    const W = Math.max(300, box.clientWidth);
    const H = 320;
    const m = { l: 40, r: 10, t: 14, b: 48 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': 'Two box plots of the wettest day of the year. 1984 to 2004 has a median of 129.9 mm. 2005 to 2025 has a median of 92.3 mm. Both run from about 60 to over 210 mm.' });
    box.prepend(svg);
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const y = (v) => m.t + ph - (v / 250) * ph;
    for (let v = 0; v <= 250; v += 50) {
      el('line', { class: 'gridline', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
      el('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, svg, v);
    }
    el('line', { class: 'axis', x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph }, svg);
    const tip = box._tip || (box._tip = tooltip(box));
    halves.forEach((h, k) => {
      const vals = h.rows.map((r) => r[2]);
      const q1 = quantile(vals, 0.25), med = quantile(vals, 0.5), q3 = quantile(vals, 0.75);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const cx = m.l + pw * (k === 0 ? 0.28 : 0.72);
      const bw = Math.min(110, pw * 0.26);
      el('line', { class: 'whisker', x1: cx, x2: cx, y1: y(hi), y2: y(q3) }, svg);
      el('line', { class: 'whisker', x1: cx, x2: cx, y1: y(q1), y2: y(lo) }, svg);
      el('line', { class: 'whisker', x1: cx - bw / 4, x2: cx + bw / 4, y1: y(hi), y2: y(hi) }, svg);
      el('line', { class: 'whisker', x1: cx - bw / 4, x2: cx + bw / 4, y1: y(lo), y2: y(lo) }, svg);
      el('rect', { class: 'box', x: cx - bw / 2, y: y(q3), width: bw, height: y(q1) - y(q3), rx: 4 }, svg);
      el('line', { class: 'median', x1: cx - bw / 2, x2: cx + bw / 2, y1: y(med), y2: y(med) }, svg);
      el('text', { x: cx - 9, y: H - 28, 'text-anchor': 'middle' }, svg, h.name);
      el('text', { class: 'label', x: cx - 9, y: H - 10, 'text-anchor': 'middle' }, svg, `median ${fmt(med)} mm`);
      // Dots, spread sideways in a fixed pattern so they don't hide each other.
      h.rows.forEach((r, i) => {
        const dx = ((i * 7) % 9 - 4) * (bw / 22);
        const dot = el('circle', { class: 'dot', cx: cx - bw / 2 - 18 + dx, cy: y(r[2]), r: 4.5 }, svg);
        const hit = el('circle', { class: 'hit', cx: cx - bw / 2 - 18 + dx, cy: y(r[2]), r: 11 }, svg);
        const show = () => {
          const pt = dot.getBoundingClientRect(), rect = box.getBoundingClientRect();
          tip.show(Math.min(Math.max(pt.left - rect.left, 70), rect.width - 70), y(r[2]) - 6, `<strong>${r[0]}</strong><br>${fmt(r[2])} mm`);
        };
        hit.addEventListener('pointerenter', show);
        hit.addEventListener('click', show);
      });
      const label = `Q1 ${fmt(q1)}, median ${fmt(med)}, Q3 ${fmt(q3)}, IQR ${fmt(q3 - q1)}, lowest ${fmt(lo)}, highest ${fmt(hi)}`;
      const cell = document.getElementById(`half-${k}`);
      if (cell) cell.textContent = label;
    });
    svg.addEventListener('pointerleave', () => tip.hide());
  };
  draw();
  return draw;
}

// The trick chart: pick a start year, cut the axis, shuffle the years.
function trickChart() {
  const box = document.getElementById('chart-3');
  if (!box) return;
  const start = document.getElementById('start-year');
  const startOut = document.getElementById('start-out');
  const cut = document.getElementById('cut-axis');
  const out = document.getElementById('readout-3');
  const shuffleBtn = document.getElementById('shuffle');
  const resetBtn = document.getElementById('reset');
  const manyBtn = document.getElementById('many');
  const manyOut = document.getElementById('many-out');
  let rows = YEARS;
  let shuffled = null;
  const realSlope = slope(YEARS.map((r) => r[0]), YEARS.map((r) => r[2])) * 10;

  const pick = () => YEARS.filter((r) => r[0] >= Number(start.value));
  const draw = () => {
    rows = shuffled || pick();
    startOut.textContent = start.value;
    drawBars(box, rows, {
      trend: true, yMin: cut.checked ? 50 : 0,
      label: `Bar chart of the wettest day of each year from ${start.value} to 2025, with a trend line.`
    });
    const s = slope(rows.map((r) => r[0]), rows.map((r) => r[2])) * 10;
    const what = shuffled ? 'Shuffled years' : `From ${start.value} to 2025`;
    out.textContent = `${what}: trend ${signed(s)} mm per decade (${rows.length} years)`;
  };
  start.addEventListener('input', () => { shuffled = null; draw(); });
  cut.addEventListener('change', draw);
  shuffleBtn.addEventListener('click', () => {
    const base = pick();
    const vals = base.map((r) => r.slice(1));
    for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    shuffled = base.map((r, i) => [r[0], ...vals[i]]);
    draw();
  });
  resetBtn.addEventListener('click', () => { shuffled = null; draw(); });
  manyBtn.addEventListener('click', () => {
    const xs = YEARS.map((r) => r[0]);
    const vals = YEARS.map((r) => r[2]);
    let steep = 0;
    const n = 1000;
    for (let k = 0; k < n; k++) {
      const v = [...vals];
      for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
      if (Math.abs(slope(xs, v) * 10) >= Math.abs(realSlope)) steep++;
    }
    manyOut.textContent = `${steep} of ${n} shuffles (${Math.round((steep / n) * 100)}%) had a trend at least as steep as the real ${signed(realSlope)} mm per decade.`;
  });
  draw();
  return draw;
}

const redraws = [chartOne(), chartTwo(), trickChart()].filter(Boolean);
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  redraws.forEach((f) => f());
});
