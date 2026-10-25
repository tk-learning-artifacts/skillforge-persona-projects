// Lights On, Nobody Home: a made-up school day in Room 2E.
// The sensor node, the gateway micro:bit, the classroom PC, the Apps Script
// web app and the Google Sheet are all simulated here. The rules match the
// code on code.html. The day, the class and every reading are made up.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DAY = 450;                 // minutes, 07:30 to 15:00
  const LIT = 70, QUIET = 80;      // thresholds from our own made-up calibration
  // [start minute, kind, label]
  const PLAN = [
    [0, 'class', 'Class arrives'],
    [10, 'empty', 'Assembly in the hall'],
    [30, 'class', 'Lessons'],
    [140, 'empty', 'Recess'],
    [170, 'class', 'Lessons'],
    [270, 'stay', 'PE. One student stays back'],
    [330, 'class', 'Lessons'],
    [390, 'empty', 'Dismissal'],
    [420, 'cleaner', 'The cleaner'],
    [DAY, 'end', 'End of day']
  ];
  const ICONS = {
    bulb: ['.###.', '#...#', '.#.#.', '..#..', '..#..'],
    tick: ['.....', '....#', '...#.', '#.#..', '.#...'],
    blank: ['.....', '.....', '.....', '.....', '.....'],
    send: ['.....', '.....', '.....', '.....', '....#']
  };

  let S, rng = 7;
  function rand() { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; }
  function gauss() { return (rand() + rand() + rand() - 1.5) / 1.5; }

  function fresh() {
    rng = 7;
    return {
      m: 0, acc: 0, done: false,
      lights: true, kind: 'class', label: PLAN[0][2],
      truth: [],                   // per minute: occ, waste, dark, stay
      minute: [],                  // the gateway's readings this 5-minute block
      lastPeak: 0, nodeMode: 'remind', icon: 'blank', iconUntil: 0,
      control: $('control') ? $('control').value : 'remind',
      sentMode: 'remind',
      inRange: true, netUp: true, tokenOk: true,
      queue: [], rows: [], ids: new Set(),
      serial: [], events: [],
      nudges: 0, lastReading: null, lastHeard: 0
    };
  }

  function planAt(m) {
    let p = PLAN[0];
    for (const q of PLAN) if (q[0] <= m) p = q;
    return p;
  }
  function hhmm(m) {
    const t = 7 * 60 + 30 + Math.floor(m);
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  function serial(kind, text) { S.serial.unshift({ kind, text }); if (S.serial.length > 60) S.serial.pop(); }
  function event(text) { S.events.unshift(hhmm(S.m) + ' ' + text); if (S.events.length > 12) S.events.pop(); say(hhmm(S.m) + ' ' + text); }
  function say(text) { const el = $('sim-live'); if (el) el.textContent = text; }

  // One simulated minute.
  function minuteTick() {
    const [, kind, label] = planAt(S.m);
    const prevKind = S.kind;
    if (kind !== prevKind) {
      S.label = label;
      if (kind === 'class' || kind === 'cleaner') S.lights = true;
    }
    S.kind = kind;

    // Readings. Lights on read about 110 at the wall; daylight alone about 38.
    const light = Math.max(0, Math.min(255, Math.round((S.lights ? 110 : 38) + gauss() * (S.lights ? 12 : 8))));
    const base = { class: 150, empty: 52, stay: 62, cleaner: 95 }[kind] || 50;
    const spread = { class: 35, empty: 8, stay: 12, cleaner: 20 }[kind] || 8;
    const sound = Math.max(0, Math.min(255, Math.round(base + gauss() * spread)));
    const temp = Math.round(28.5 + 1.8 * Math.sin(Math.PI * S.m / DAY) + (kind === 'class' ? 0.6 : 0) + gauss() * 0.4);

    // The node's last-one-out nudge: loud, then quiet, with the lights on.
    if (S.nodeMode === 'remind' && S.lastPeak > QUIET + 20 && sound < QUIET && light > LIT) {
      S.nudges++;
      S.icon = 'bulb'; S.iconUntil = S.m + 4;
      if (rand() < 0.75) { S.lights = false; event('Nudge played. The last one out switched off the lights.'); }
      else event('Nudge played. Nobody switched off.');
    }
    S.lastPeak = sound;
    if (kind === 'stay' && prevKind !== 'stay') event('PE. One student stays back, quietly' + (S.lights ? ', lights on.' : ', in a dim room.'));
    if (kind === 'cleaner' && prevKind !== 'cleaner') event('The cleaner comes in. Lights on.');

    // Ground truth for the day bar
    const people = kind === 'class' || kind === 'cleaner';
    S.truth.push(kind === 'stay' ? 'stay' : !S.lights ? 'dark' : people ? 'occ' : 'waste');

    // Radio to the gateway
    if (S.inRange) {
      S.minute.push({ light, sound, temp });
      S.lastReading = { light, sound, temp }; S.lastHeard = S.m;
      serial('', 'light:' + light); serial('', 'sound:' + sound); serial('', 'temp:' + temp);
      if (S.icon === 'blank') { S.icon = 'send'; S.iconUntil = S.m + 0.5; }
    }
    S.m += 1;
    if (S.icon !== 'blank' && S.m >= S.iconUntil) S.icon = 'blank';
    if (S.m % 5 === 0) postSummary();
    flushQueue();
    if (S.m >= DAY) finishDay();
  }

  function postSummary() {
    const r = S.minute;
    const row = { id: '2E-' + hhmm(S.m - 5), time: hhmm(S.m - 5), room: '2E' };
    if (!r.length) {
      Object.assign(row, { light: null, sound_peak: null, temp_c: null, lit_quiet_min: null, status: 'node silent' });
    } else {
      row.light = Math.round(r.reduce((a, x) => a + x.light, 0) / r.length);
      row.sound_peak = Math.max(...r.map((x) => x.sound));
      row.temp_c = Math.round(r.reduce((a, x) => a + x.temp, 0) / r.length * 10) / 10;
      row.lit_quiet_min = r.filter((x) => x.light > LIT && x.sound < QUIET).length;
      row.status = r.length < 5 ? 'partial' : 'ok';
    }
    S.minute = [];
    S.queue.push(row);
  }

  function flushQueue() {
    while (S.queue.length) {
      const row = S.queue[0];
      if (!S.netUp) { serial('bad', 'POST ' + row.time + ' failed: no network. Queued: ' + S.queue.length); return; }
      if (!S.tokenOk) { serial('bad', 'POST ' + row.time + ': {"ok":false,"error":"bad token"}. Kept in queue.'); return; }
      S.queue.shift();
      if (!S.ids.has(row.id)) { S.ids.add(row.id); S.rows.push(row); }
      const mode = S.control;
      serial('ok', 'POST ' + row.time + ': {"ok":true,"mode":"' + mode + '"}');
      if (mode !== S.sentMode) {
        S.sentMode = mode;
        serial('out', 'to gateway: mode:' + mode);
        if (S.inRange) {
          if (mode === 'test') { S.icon = 'tick'; S.iconUntil = S.m + 3; }
          else { S.nodeMode = mode; S.modes.add(mode); }
          event('Control B1 is "' + mode + '". The node got it by radio.');
        } else event('Control B1 is "' + mode + '", but the node is out of range.');
      }
    }
  }

  const results = [];
  function finishDay() {
    S.done = true;
    const measured = S.rows.reduce((a, r) => a + (r.lit_quiet_min || 0), 0);
    const truth = S.truth.filter((x) => x === 'waste').length;
    results.push({ n: results.length + 1, mode: S.modes.size > 1 ? 'mixed' : S.nodeMode, measured, truth, nudges: S.nudges });
    event('End of day. Measured ' + measured + ' lit, quiet minutes. True lit, empty minutes: ' + truth + '.');
    renderResults();
  }

  // ---------- Drawing ----------
  function drawIcon(name) {
    const pat = ICONS[name] || ICONS.blank;
    const cells = $('mb').children;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells[r * 5 + c].classList.toggle('on', pat[r][c] === '#');
  }

  function render() {
    $('clock').textContent = hhmm(Math.min(S.m, DAY));
    $('what').textContent = S.done ? 'End of the day.' : S.label + (S.lights ? '. Lights on.' : '. Lights off.');
    drawIcon(S.icon);
    const lr = S.lastReading;
    $('node-read').innerHTML = lr ? 'light <b>' + lr.light + '</b> · sound <b>' + lr.sound + '</b> · temp <b>' + lr.temp + '</b>' : 'no readings yet';
    $('node-mode').textContent = S.inRange ? 'mode: ' + S.nodeMode : 'out of range';

    // day bar
    const bar = $('dayline');
    let html = '', run = null, len = 0;
    const flush = () => { if (run) html += '<span class="' + run + '" style="width:' + (len / DAY * 100) + '%"></span>'; };
    S.truth.forEach((k) => { if (k === run) len++; else { flush(); run = k; len = 1; } });
    flush();
    html += '<span class="marker" style="left:' + (Math.min(S.m, DAY) / DAY * 100) + '%"></span>';
    bar.innerHTML = html;

    // serial
    const ul = $('serial');
    ul.innerHTML = '';
    S.serial.slice(0, 30).forEach((l) => { const li = document.createElement('li'); li.className = l.kind; li.textContent = l.text; ul.appendChild(li); });
    $('queue').textContent = S.queue.length;
    $('gw-status').innerHTML = (S.netUp ? '<span class="good">network ok</span>' : '<span class="bad">no network</span>') + ' · ' +
      (S.inRange || S.m - S.lastHeard < 3 ? '<span class="good">node heard ' + (S.m - S.lastHeard) + ' min ago</span>' : '<span class="bad">node silent ' + (S.m - S.lastHeard) + ' min</span>');

    // sheet
    const tb = $('sheet-body');
    tb.innerHTML = '';
    const cell = (v) => v == null ? '<td class="n blank"></td>' : '<td class="n">' + v + '</td>';
    S.rows.slice(-6).forEach((r) => {
      const tr = document.createElement('tr');
      if (r.lit_quiet_min) tr.className = 'lq';
      tr.innerHTML = '<td>' + r.time + '</td>' + cell(r.light) + cell(r.sound_peak) + cell(r.temp_c) +
        (r.lit_quiet_min == null ? '<td class="n blank"></td>' : '<td class="n lqc">' + r.lit_quiet_min + '</td>') + '<td>' + r.status + '</td>';
      tb.appendChild(tr);
    });
    $('rows').textContent = S.rows.length;

    // totals
    const measured = S.rows.reduce((a, r) => a + (r.lit_quiet_min || 0), 0);
    $('t-measured').textContent = measured + ' min';
    $('t-truth').textContent = S.truth.filter((x) => x === 'waste').length + ' min';
    $('t-nudges').textContent = S.nudges;
    $('t-stay').textContent = S.truth.filter((x) => x === 'stay').length + ' min';
    drawChart();
    $('events').innerHTML = S.events.slice(0, 4).map((e) => '<li>' + e + '</li>').join('');
    $('run').textContent = S.done ? 'Run the day again' : running ? 'Pause' : (S.m ? 'Resume' : 'Run the day');
    $('net').textContent = S.netUp ? 'Unplug the network' : 'Plug the network back';
    $('range').textContent = S.inRange ? 'Move it out of range' : 'Bring it back in range';
    $('token').textContent = S.tokenOk ? 'Use a wrong token' : 'Fix the token';
  }

  function drawChart() {
    const W = 400, H = 200, L = 40, R = 8, T = 10, B = 24;
    const x = (m) => L + (W - L - R) * (m / DAY);
    const y = (v) => T + (H - T - B) * (1 - v / 255);
    const css = getComputedStyle(document.documentElement);
    const sun = css.getPropertyValue('--sun-line').trim(), sky = css.getPropertyValue('--sky').trim();
    const muted = css.getPropertyValue('--muted').trim(), line = css.getPropertyValue('--line').trim();
    let s = '';
    [0, 64, 128, 192, 255].forEach((v) => {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${line}"/>`;
      s += `<text x="${L - 4}" y="${y(v) + 4}" font-size="11" fill="${muted}" text-anchor="end">${v}</text>`;
    });
    ['07:30', '09:30', '11:30', '13:30'].forEach((t, i) => {
      const m = i * 120;
      s += `<text x="${x(m)}" y="${H - 6}" font-size="11" fill="${muted}" text-anchor="${i ? 'middle' : 'start'}">${t}</text>`;
    });
    // shade the 5-minute blocks with lit, quiet minutes
    S.rows.forEach((r) => {
      if (!r.lit_quiet_min) return;
      const m = minutesOf(r.time);
      s += `<rect x="${x(m)}" y="${T}" width="${x(m + 5) - x(m)}" height="${H - T - B}" fill="${sun}" opacity="${0.08 + r.lit_quiet_min * 0.05}"/>`;
    });
    s += `<line x1="${L}" x2="${W - R}" y1="${y(LIT)}" y2="${y(LIT)}" stroke="${sun}" stroke-dasharray="4 4"/>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(QUIET)}" y2="${y(QUIET)}" stroke="${sky}" stroke-dasharray="2 4"/>`;
    const path = (key) => {
      let d = '', prev = null;
      S.rows.forEach((r) => {
        const m = minutesOf(r.time) + 2.5;
        if (r[key] == null) { prev = null; return; }
        d += (prev == null || m - prev > 6 ? 'M' : 'L') + x(m).toFixed(1) + ' ' + y(r[key]).toFixed(1) + ' ';
        prev = m;
      });
      return d;
    };
    s += `<path d="${path('light')}" fill="none" stroke="${sun}" stroke-width="2.5"/>`;
    s += `<path d="${path('sound_peak')}" fill="none" stroke="${sky}" stroke-width="2"/>`;
    $('chart').innerHTML = s;
  }
  function minutesOf(t) { const [h, mm] = t.split(':').map(Number); return h * 60 + mm - (7 * 60 + 30); }

  function renderResults() {
    const tb = $('results');
    if (!results.length) return;
    tb.innerHTML = results.map((r) => '<tr><td>Day ' + r.n + '</td><td>' + r.mode + '</td><td class="n">' + r.measured + '</td><td class="n">' + r.truth + '</td><td class="n">' + r.nudges + '</td></tr>').join('');
  }

  // ---------- Controls ----------
  let running = false, speed = 10, demo = null, recording = false;
  function reset() {
    S = fresh();
    S.nodeMode = S.control === 'test' ? 'remind' : S.control;
    S.sentMode = S.control;
    S.modes = new Set([S.nodeMode]);
    $('net').setAttribute('aria-pressed', 'false');
    $('range').setAttribute('aria-pressed', 'false');
    $('token').setAttribute('aria-pressed', 'false');
    caption('');
    render();
  }
  function caption(t) { $('caption').textContent = t; }

  function wire() {
    $('run').addEventListener('click', () => {
      if (S.done) { reset(); running = true; }
      else running = !running;
      render();
    });
    $('reset').addEventListener('click', () => { stopDemo(); running = false; reset(); });
    $('ffwd').addEventListener('click', () => { stopDemo(); while (!S.done) minuteTick(); running = false; render(); });
    $('speed').addEventListener('change', (e) => { speed = Number(e.target.value); });
    $('control').addEventListener('change', (e) => { S.control = e.target.value; render(); });
    const toggle = (id, key, onText) => $(id).addEventListener('click', () => {
      S[key] = !S[key];
      $(id).setAttribute('aria-pressed', S[key] ? 'false' : 'true');
      event(onText[S[key] ? 1 : 0]);
      render();
    });
    toggle('net', 'netUp', ['The PC lost its network. Rows will queue.', 'The PC network is back.']);
    toggle('range', 'inRange', ['The node is out of radio range.', 'The node is back in range.']);
    toggle('token', 'tokenOk', ['The gateway now has a wrong token.', 'The token is fixed.']);
    $('demo').addEventListener('click', startDemo);
    document.addEventListener('visibilitychange', () => { if (document.hidden && !recording) { running = false; render(); } });
  }

  const SCRIPT = [
    [0, 'Room 2E, a made-up school day. One micro:bit on the wall, one on the teacher\'s PC.', () => { setControl('remind'); }],
    [11, '07:40 Assembly. The room goes quiet with the lights on. The node plays a nudge.', null],
    [40, 'Every 5 minutes the PC posts one row to the Google Sheet.', null],
    [141, '09:50 Recess. Another nudge as the class leaves.', null],
    [175, 'We unplug the PC\'s network. Rows wait in a queue.', () => { S.netUp = false; $('net').setAttribute('aria-pressed', 'true'); event('The PC lost its network. Rows will queue.'); }],
    [210, 'Network back. The queue goes up, oldest first, with the original times.', () => { S.netUp = true; $('net').setAttribute('aria-pressed', 'false'); event('The PC network is back.'); }],
    [240, 'The eco monitor sets Control B1 to quiet. Exam week: no beeps.', () => { setControl('quiet'); }],
    [271, '12:00 PE. Quiet mode, so no nudge. The lights stay on.', null],
    [300, 'One student stayed back. The sheet counts the room as lit and quiet. Quiet is not empty.', null],
    [330, 'Back to remind for the afternoon.', () => { setControl('remind'); }],
    [391, '14:00 Dismissal. A nudge, but nobody switches off this time.', null],
    [421, '14:30 The cleaner. Lights on, some noise, not counted.', null],
    [449, 'End of day. Compare what the sheet measured with what really happened.', null]
  ];
  function setControl(v) { $('control').value = v; S.control = v; }
  function startDemo() {
    $('control').value = 'remind';
    reset();
    demo = { i: 0 };
    running = true;
    $('lab').classList.add('recording');
    render();
  }
  function stopDemo() { demo = null; if (!recording) $('lab').classList.remove('recording'); }
  function demoTick() {
    if (!demo) return;
    while (demo.i < SCRIPT.length && S.m >= SCRIPT[demo.i][0]) {
      const [, text, fn] = SCRIPT[demo.i];
      if (fn) fn();
      caption(text);
      demo.i++;
    }
  }

  function advance(minutes) {
    S.acc += minutes;
    while (S.acc >= 1 && !S.done) { S.acc -= 1; demoTick(); minuteTick(); }
    if (S.done) { running = false; if (!recording) setTimeout(stopDemo, 4000); }
  }

  let last = null;
  function frame(now) {
    if (last == null) last = now;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (running && !recording) { advance(dt * speed); render(); }
    requestAnimationFrame(frame);
  }

  window.roomRecorder = {
    start() { recording = true; startDemo(); },
    advance(seconds) { advance(seconds * 10); render(); },
    length: 47
  };

  reset();
  wire();
  requestAnimationFrame(frame);
})();
