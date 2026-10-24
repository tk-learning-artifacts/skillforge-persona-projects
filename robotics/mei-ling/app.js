// The demo replay and the "try it" pen on index.html. Both draw PenSim runs.
(function () {
  'use strict';
  const S = window.PenSim;
  const SCALE = 5;
  const W = S.PEN.w * SCALE, H = S.PEN.h * SCALE;
  const FACES = {
    happy: ['00000', '01010', '00000', '10001', '01110'],
    surprised: ['01010', '00000', '00100', '01010', '00100'],
    asleep: ['00000', '11011', '00000', '01110', '00000']
  };

  let c = {};
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    c = { floor: v('--pen-floor'), wall: v('--pen-wall'), box: v('--box'), bag: v('--bag'), file: v('--file'),
      robot: v('--robot'), cone: v('--cone'), ink: v('--ink'), marker: v('--marker'), teal: v('--teal'), red: v('--red') };
  }
  readColours();

  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * SCALE, p[1] * SCALE) : ctx.moveTo(p[0] * SCALE, p[1] * SCALE)));
    ctx.closePath();
  }
  function label(ctx, text, x, y) {
    ctx.font = '600 24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x * SCALE, y * SCALE);
    ctx.textAlign = 'left';
  }

  function drawPen(ctx, chair) {
    ctx.fillStyle = c.floor;
    ctx.fillRect(0, 0, W, H);
    // book wall: spines along the edge
    ctx.fillStyle = c.wall;
    for (let x = 0; x < W; x += 28) { ctx.fillRect(x, 0, 24, 10); ctx.fillRect(x, H - 10, 24, 10); }
    for (let y = 0; y < H; y += 28) { ctx.fillRect(0, y, 10, 24); ctx.fillRect(W - 10, y, 10, 24); }
    S.THINGS.forEach((t) => {
      if (t.shape === 'circle') return;
      if (t.inside) return;
      ctx.fillStyle = t.kind === 'soft' ? c.bag : t.name === 'shoebox' ? c.box : c.file;
      poly(ctx, t.pts);
      ctx.fill();
    });
    label(ctx, 'shoebox', 80, 54);
    label(ctx, 'school bag', 73, 92);
    label(ctx, 'slanted file', 27, 26);
    if (chair) {
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(108 * SCALE, 60 * SCALE, 34 * SCALE, 34 * SCALE);
      ctx.setLineDash([]);
      ctx.fillStyle = c.ink;
      S.THINGS.filter((t) => t.shape === 'circle').forEach((t) => {
        ctx.beginPath(); ctx.arc(t.c[0] * SCALE, t.c[1] * SCALE, t.r * SCALE + 1, 0, Math.PI * 2); ctx.fill();
      });
      label(ctx, 'chair', 125, 77);
    }
  }

  function drawRobot(ctx, st) {
    const sx = st.x + Math.cos(st.h) * S.ROBOT.ahead, sy = st.y + Math.sin(st.h) * S.ROBOT.ahead;
    // the sound cone, as long as the distance it heard
    const d = st.heard == null ? 0 : st.heard < 0 ? 0 : Math.min(st.heard, 200);
    if (d > 0) {
      ctx.fillStyle = c.cone;
      ctx.beginPath();
      ctx.moveTo(sx * SCALE, sy * SCALE);
      ctx.arc(sx * SCALE, sy * SCALE, d * SCALE, st.h - S.CONE, st.h + S.CONE);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.translate(st.x * SCALE, st.y * SCALE);
    ctx.rotate(st.h);
    const r = S.ROBOT.radius * SCALE;
    // wheels
    ctx.fillStyle = c.ink;
    ctx.fillRect(-14, -r - 6, 28, 10);
    ctx.fillRect(-14, r - 4, 28, 10);
    // cardboard body
    ctx.fillStyle = c.robot;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-r, -r, 2 * r, 2 * r, 10) : ctx.rect(-r, -r, 2 * r, 2 * r);
    ctx.fill();
    ctx.lineWidth = st.touching ? 6 : 2;
    ctx.strokeStyle = st.touching ? c.red : c.ink;
    ctx.stroke();
    // sensor eyes at the front
    ctx.fillStyle = '#e8e8e8';
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    [-9, 9].forEach((y) => { ctx.beginPath(); ctx.arc(r - 2, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    // the micro:bit face, kept upright
    const face = FACES[st.shown] || FACES.happy;
    const cell = 8, ox = st.x * SCALE - 2.5 * cell, oy = st.y * SCALE - 2.5 * cell;
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(ox - 4, oy - 4, 5 * cell + 8, 5 * cell + 8);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      ctx.fillStyle = face[row][col] === '1' ? '#ff4b3a' : '#3a2a2a';
      ctx.fillRect(ox + col * cell + 1, oy + row * cell + 1, cell - 2, cell - 2);
    }
  }

  function drawHud(ctx, lines, caption) {
    ctx.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
    ctx.fillStyle = 'rgba(28, 23, 18, 0.85)';
    ctx.fillRect(W - w - 18, 18, w, lines.length * 34 + 12);
    ctx.fillStyle = '#ffffff';
    lines.forEach((l, i) => ctx.fillText(l, W - w - 6, 25 + i * 34));
    if (caption) {
      ctx.font = '600 26px system-ui, -apple-system, "Segoe UI", sans-serif';
      const cw = ctx.measureText(caption).width + 28;
      ctx.fillStyle = 'rgba(28, 23, 18, 0.85)';
      ctx.fillRect(W - cw - 18, H - 62, cw, 44);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(caption, W - cw - 4, H - 53);
    }
  }

  const clock = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const heardText = (d) => (d == null ? '--' : d < 0 ? 'no echo' : Math.round(d) + ' cm');

  // ---------------- Demo replay ----------------
  const DEMO = { version: 3, seed: 4, seconds: 60 };
  function recordDemo() {
    const s = S.create(DEMO);
    const frames = [];
    let next = 0;
    while (!s.done) {
      S.step(s);
      if (s.t >= next) {
        frames.push({ t: s.t, x: s.x, y: s.y, h: s.h, shown: s.shown, say: s.say, heard: s.lastPing,
          touching: !!s.touching, bumps: s.bumps, stops: s.stops });
        next += 1 / 30;
      }
    }
    const marks = [{ t: 0, label: 'Start' }];
    s.events.forEach((e) => {
      if (e.bump) marks.push({ t: e.t, label: 'Brushes the ' + e.bump });
      else marks.push({ t: e.t, label: (e.why === 'nothing there' ? 'Stops for nothing' : 'Stops at ' + Math.round(e.d) + ' cm') });
    });
    return { frames, marks: marks.slice(0, 13), end: s.t };
  }

  const demoCanvas = document.getElementById('demo-canvas');
  if (demoCanvas) {
    const ctx = demoCanvas.getContext('2d');
    const demo = recordDemo();
    const scrub = document.getElementById('demo-scrub');
    const playBtn = document.getElementById('demo-play');
    const time = document.getElementById('demo-time');
    const list = document.getElementById('demo-events');
    const saveBtn = document.getElementById('demo-save');
    const saveNote = document.getElementById('demo-save-note');
    let frame = 0, playing = false, last = 0, rate = 1;
    scrub.max = demo.frames.length - 1;
    demo.marks.forEach((m) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = clock(m.t) + ' ' + m.label;
      b.addEventListener('click', () => { stop(); show(Math.max(0, Math.round(m.t * 30) - 30)); });
      li.appendChild(b);
      list.appendChild(li);
    });
    function show(i) {
      frame = i;
      const f = demo.frames[i];
      drawPen(ctx, false);
      drawRobot(ctx, f);
      drawHud(ctx, ['KOTAK v3  ' + clock(f.t), 'Heard: ' + heardText(f.heard), 'Stops ' + f.stops + '  Bumps ' + f.bumps], f.say);
      scrub.value = i;
      time.textContent = clock(f.t) + ' / ' + clock(demo.end);
      const cur = demo.marks.filter((m) => m.t <= f.t + 1).length - 1;
      [...list.querySelectorAll('button')].forEach((b, k) => b.setAttribute('aria-current', k === cur ? 'true' : 'false'));
    }
    function tick(now) {
      if (!playing) return;
      const steps = Math.floor(((now - last) / 1000) * 30 * rate);
      if (steps > 0) {
        last = now;
        if (frame + steps >= demo.frames.length - 1) { show(demo.frames.length - 1); stop(); finish(); return; }
        show(frame + steps);
      }
      requestAnimationFrame(tick);
    }
    function play() {
      if (frame >= demo.frames.length - 1) show(0);
      playing = true; last = performance.now();
      playBtn.textContent = 'Pause';
      requestAnimationFrame(tick);
    }
    function stop() { playing = false; playBtn.textContent = 'Play'; }
    playBtn.addEventListener('click', () => (playing ? stop() : play()));
    scrub.addEventListener('input', () => { stop(); show(+scrub.value); });
    document.getElementById('demo-rate').addEventListener('change', (e) => { rate = +e.target.value; });

    let recorder = null, chunks = [];
    const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const canRecord = typeof MediaRecorder !== 'undefined' && demoCanvas.captureStream &&
      types.some((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    if (!canRecord) { saveBtn.disabled = true; saveNote.textContent = 'This browser cannot record the canvas. The replay above still works.'; }
    saveBtn.addEventListener('click', () => {
      if (recorder) return;
      const type = types.find((t) => MediaRecorder.isTypeSupported(t));
      recorder = new MediaRecorder(demoCanvas.captureStream(30), { mimeType: type });
      chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: type.split(';')[0] });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kotak-demo.' + (type.includes('mp4') ? 'mp4' : 'webm');
        a.textContent = 'Download the demo video (' + Math.round(blob.size / 1024) + ' KB)';
        saveNote.textContent = '';
        saveNote.appendChild(a);
        recorder = null;
        saveBtn.disabled = false;
      };
      saveBtn.disabled = true;
      saveNote.textContent = 'Recording. It plays once at normal speed: one minute.';
      rate = 1;
      document.getElementById('demo-rate').value = '1';
      show(0);
      recorder.start();
      play();
    });
    function finish() { if (recorder && recorder.state === 'recording') recorder.stop(); }

    show(0);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColours(); show(frame); });
  }

  // ---------------- Try it ----------------
  const penCanvas = document.getElementById('pen-canvas');
  if (penCanvas) {
    const ctx = penCanvas.getContext('2d');
    const el = (id) => document.getElementById(id);
    const ver = el('p-version'), chair = el('p-chair');
    const sliders = ['stop', 'speed', 'back', 'turn'].map((k) => el('p-' + k));
    const shouts = el('p-shouts'), rnd = el('p-random');
    let sim = null, playing = false, last = 0;

    function settings() {
      if (ver.value !== 'custom') return { version: +ver.value };
      return { version: 3, custom: { stopCm: +sliders[0].value, speed: +sliders[1].value, backMs: +sliders[2].value,
        turnMs: +sliders[3].value, combine: shouts.checked ? 'echoes' : null, noEcho: 'far', median: false, randomTurn: rnd.checked } };
    }
    function sync() {
      const custom = ver.value === 'custom';
      const v = S.VERSIONS[custom ? 3 : +ver.value];
      if (!custom) {
        sliders[0].value = v.stopCm; sliders[1].value = v.speed; sliders[2].value = v.backMs; sliders[3].value = v.turnMs;
        shouts.checked = v.combine === 'echoes'; rnd.checked = v.randomTurn;
      }
      [...sliders, shouts, rnd].forEach((x) => (x.disabled = !custom));
      el('p-stop-v').textContent = sliders[0].value + ' cm';
      el('p-speed-v').textContent = sliders[1].value;
      el('p-back-v').textContent = sliders[2].value + ' ms';
      el('p-turn-v').textContent = sliders[3].value + ' ms';
    }
    function reset() {
      playing = false;
      el('p-watch').textContent = 'Watch for one minute';
      sim = S.create(Object.assign({ seed: 4, seconds: 60, chair: chair.checked }, settings()));
      draw();
    }
    function draw() {
      drawPen(ctx, chair.checked);
      drawRobot(ctx, Object.assign({}, sim, { heard: sim.lastPing }));
      drawHud(ctx, [clock(sim.t), 'Heard: ' + heardText(sim.lastPing), 'Stops ' + sim.stops + '  Bumps ' + sim.bumps], sim.done ? 'Time is up' : sim.say);
    }
    function tick(now) {
      if (!playing) return;
      const target = sim.t + Math.min(0.05, (now - last) / 1000) * +el('p-speed-x').value;
      last = now;
      while (sim.t < target && !sim.done) S.step(sim);
      draw();
      if (sim.done) {
        playing = false;
        el('p-watch').textContent = 'Watch again';
        el('p-live').textContent = 'One minute: ' + sim.stops + ' stops, ' + sim.spooky + ' of them for nothing, and ' + sim.bumps + (sim.bumps === 1 ? ' bump.' : ' bumps.');
        return;
      }
      requestAnimationFrame(tick);
    }
    el('p-watch').addEventListener('click', () => {
      if (playing) { playing = false; el('p-watch').textContent = 'Carry on'; return; }
      if (sim.done) reset();
      playing = true; last = performance.now();
      el('p-watch').textContent = 'Pause';
      el('p-live').textContent = '';
      requestAnimationFrame(tick);
    });
    [ver, ...sliders, shouts, rnd, chair].forEach((x) => x.addEventListener('input', () => { sync(); reset(); }));

    // 20 two-minute runs from random spots: the same test as the tuning notes.
    el('p-test').addEventListener('click', () => {
      const btn = el('p-test');
      btn.disabled = true;
      const strip = el('p-runs');
      strip.innerHTML = '';
      const cells = [];
      for (let i = 0; i < 20; i++) { const x = document.createElement('i'); strip.appendChild(x); cells.push(x); }
      const res = [];
      let seed = 1;
      const opts = Object.assign({ seconds: 120, chair: chair.checked }, settings());
      el('p-summary').textContent = 'Testing...';
      function next() {
        const r = S.trial(Object.assign({ seed }, opts));
        res.push(r);
        const cell = cells[seed - 1];
        cell.textContent = r.bumps;
        cell.className = r.bumps === 0 ? 'good' : r.bumps <= 2 ? 'meh' : 'bad';
        cell.title = 'Run ' + seed + ': ' + r.bumps + (r.bumps === 1 ? ' bump, ' : ' bumps, ') + r.spooky + (r.spooky === 1 ? ' stop for nothing' : ' stops for nothing');
        seed++;
        if (seed <= 20) { setTimeout(next, 0); return; }
        const avg = (k) => res.reduce((a, x) => a + x[k], 0) / res.length;
        const longest = Math.max(...res.map((x) => x.longest));
        el('p-summary').textContent = 'Per 2 minutes: ' + avg('bumps').toFixed(2) + ' bumps, ' + avg('spooky').toFixed(1) +
          ' stops for nothing, ' + (avg('moved') / 100).toFixed(1) + ' m driven. Longest time stuck against something: ' + longest.toFixed(1) + ' s.';
        btn.disabled = false;
      }
      setTimeout(next, 30);
    });

    sync();
    reset();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColours(); draw(); });
  }
})();
