// The demo replay and the test bench on index.html. Both draw LineSim runs.
(function () {
  'use strict';
  const S = window.LineSim;
  const SCALE = 4; // canvas pixels per cm
  const W = S.ARENA.w * SCALE, H = S.ARENA.h * SCALE;

  let colours = {};
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    colours = { floor: v('--floor'), tape: v('--tape'), robot: v('--robot'), trail: v('--trail'),
      pass: v('--pass'), fail: v('--fail'), ink: v('--ink'), paper: v('--paper'), grid: v('--grid') };
  }
  readColours();

  function drawScene(ctx, st, trail, hud) {
    ctx.fillStyle = colours.floor;
    ctx.fillRect(0, 0, W, H);
    // floor tiles, 30 cm
    ctx.strokeStyle = colours.grid;
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 30 * SCALE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 30 * SCALE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // tape
    ctx.strokeStyle = colours.tape;
    ctx.lineWidth = S.TAPE_HALF * 2 * SCALE;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    S.TRACK.forEach((p, i) => (i ? ctx.lineTo(p[0] * SCALE, p[1] * SCALE) : ctx.moveTo(p[0] * SCALE, p[1] * SCALE)));
    ctx.closePath();
    ctx.stroke();
    // start line
    const p0 = S.TRACK[0];
    ctx.fillStyle = colours.trail;
    ctx.fillRect(p0[0] * SCALE - 3, p0[1] * SCALE - 26, 6, 52);
    // corner labels
    ctx.fillStyle = colours.ink;
    ctx.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'middle';
    [['C1', 186, 128], ['C2', 186, 18], ['S-bend', 112, 62], ['C3', 2, 46], ['C4', 6, 132]].forEach(([t, x, y]) => ctx.fillText(t, x * SCALE, y * SCALE));
    // trail
    if (trail && trail.length > 1) {
      ctx.strokeStyle = colours.trail;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      trail.forEach((p, i) => (i ? ctx.lineTo(p[0] * SCALE, p[1] * SCALE) : ctx.moveTo(p[0] * SCALE, p[1] * SCALE)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (st) drawRobot(ctx, st);
    if (hud) drawHud(ctx, hud);
  }

  function drawRobot(ctx, st) {
    ctx.save();
    ctx.translate(st.x * SCALE, st.y * SCALE);
    ctx.rotate(st.h);
    // body: 15 cm long, 13 cm wide, axle at the back third
    ctx.fillStyle = colours.robot;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-5 * SCALE, -6.5 * SCALE, 15 * SCALE, 13 * SCALE);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colours.tape;
    ctx.fillRect(-3 * SCALE, -8 * SCALE, 6 * SCALE, 2 * SCALE);
    ctx.fillRect(-3 * SCALE, 6 * SCALE, 6 * SCALE, 2 * SCALE);
    // nose arrow
    ctx.fillStyle = colours.paper;
    ctx.beginPath();
    ctx.moveTo(9 * SCALE, 0); ctx.lineTo(4 * SCALE, -3 * SCALE); ctx.lineTo(4 * SCALE, 3 * SCALE);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // sensors
    [[1, st.darkL], [-1, st.darkR]].forEach(([side, dark]) => {
      const p = S.sensorPos(st, side);
      ctx.beginPath();
      ctx.arc(p[0] * SCALE, p[1] * SCALE, 6, 0, Math.PI * 2);
      ctx.fillStyle = dark ? colours.trail : colours.paper;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colours.ink;
      ctx.stroke();
    });
  }

  function drawHud(ctx, hud) {
    ctx.font = '700 30px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    const lines = hud.lines;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
    ctx.fillStyle = 'rgba(10, 14, 22, 0.82)';
    ctx.fillRect(10, 10, w, lines.length * 38 + 14);
    ctx.fillStyle = '#ffffff';
    lines.forEach((l, i) => ctx.fillText(l, 22, 18 + i * 38));
    if (hud.caption) {
      ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif';
      const cw = ctx.measureText(hud.caption).width + 28;
      ctx.fillStyle = 'rgba(10, 14, 22, 0.82)';
      ctx.fillRect((W - cw) / 2, H - 58, cw, 46);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hud.caption, (W - cw) / 2 + 14, H - 49);
    }
  }

  const fmt = (t) => t.toFixed(2) + ' s';

  // ---------------- Demo replay ----------------
  const DEMO = { version: 4, room: 'cca', seed: 7, laps: 3 };
  function recordDemo() {
    const s = S.create(Object.assign({ jitter: true }, DEMO));
    const frames = [], chapters = [{ t: 0, label: 'Calibration sweep' }];
    let next = 0, lastLap = 0, wasRun = false;
    while (!s.done && s.t < 80) {
      S.step(s);
      if (!wasRun && s.phase === 'settle') { chapters.push({ t: s.t, label: 'Threshold ' + s.threshold }); wasRun = true; }
      if (s.phase === 'run' && chapters.length === 2) chapters.push({ t: s.t, label: 'Lap 1' });
      if (s.lap > lastLap) {
        lastLap = s.lap;
        if (s.lap < s.laps) chapters.push({ t: s.t, label: 'Lap ' + (s.lap + 1) });
      }
      if (s.t >= next) {
        frames.push({ t: s.t, x: s.x, y: s.y, h: s.h, darkL: s.readL < s.threshold && s.phase === 'run', darkR: s.readR < s.threshold && s.phase === 'run',
          readL: s.readL, readR: s.readR, threshold: s.threshold, rule: s.rule, phase: s.phase, lap: s.lap,
          lapT: s.phase === 'run' ? s.t - s.lapStart : 0, times: s.lapTimes.slice() });
        next += 1 / 30;
      }
    }
    chapters.push({ t: s.t, label: 'Finish' });
    return { frames, chapters, end: s.t, result: s.result, times: s.lapTimes };
  }

  function captionFor(f) {
    if (f.phase === 'calibrate') return 'Sweeping both sensors over the tape';
    if (f.phase === 'settle') return 'Threshold = halfway between darkest and lightest';
    if (f.lap >= DEMO.laps) return 'Three clean laps. Press B to stop.';
    return f.rule;
  }

  const demoCanvas = document.getElementById('demo-canvas');
  if (demoCanvas) {
    const ctx = demoCanvas.getContext('2d');
    const demo = recordDemo();
    const scrub = document.getElementById('demo-scrub');
    const playBtn = document.getElementById('demo-play');
    const clock = document.getElementById('demo-clock');
    const chapList = document.getElementById('demo-chapters');
    const saveBtn = document.getElementById('demo-save');
    const saveNote = document.getElementById('demo-save-note');
    let frame = 0, playing = false, last = 0, rate = 1;
    scrub.max = demo.frames.length - 1;

    demo.chapters.forEach((c) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.t.toFixed(1) + ' s ' + c.label;
      b.addEventListener('click', () => { show(Math.min(demo.frames.length - 1, Math.round(c.t * 30))); });
      li.appendChild(b);
      chapList.appendChild(li);
    });

    function show(i) {
      frame = i;
      const f = demo.frames[i];
      const trail = [];
      for (let k = Math.max(0, i - 150); k <= i; k += 2) trail.push([demo.frames[k].x, demo.frames[k].y]);
      const done = f.times.map((t, n) => 'L' + (n + 1) + ' ' + t.toFixed(2));
      drawScene(ctx, f, trail, {
        lines: [
          'V4  ' + (f.phase === 'run' ? 'LAP ' + Math.min(f.lap + 1, DEMO.laps) + '  ' + f.lapT.toFixed(2) : f.phase.toUpperCase()),
          'L ' + String(f.readL).padStart(4) + '  R ' + String(f.readR).padStart(4) + '  T ' + (f.threshold || '---'),
          done.join('  ') || ' '
        ],
        caption: captionFor(f)
      });
      scrub.value = i;
      clock.textContent = fmt(f.t) + ' / ' + fmt(demo.end);
      const cur = demo.chapters.filter((c) => c.t <= f.t + 1e-6).length - 1;
      [...chapList.querySelectorAll('button')].forEach((b, k) => b.setAttribute('aria-current', k === cur ? 'true' : 'false'));
    }
    function tick(now) {
      if (!playing) return;
      const steps = Math.floor(((now - last) / 1000) * 30 * rate);
      if (steps > 0) {
        last = now;
        const n = frame + steps;
        if (n >= demo.frames.length - 1) { show(demo.frames.length - 1); stop(); finishRecording(); return; }
        show(n);
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

    // Save the replay as a real video file, where the browser can record a canvas.
    let recorder = null, chunks = [];
    const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const canRecord = typeof MediaRecorder !== 'undefined' && demoCanvas.captureStream &&
      types.some((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    if (!canRecord) { saveBtn.disabled = true; saveNote.textContent = 'This browser cannot record the canvas, so use the replay above.'; }
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
        a.download = 'marcus-line-follower-demo.' + (type.includes('mp4') ? 'mp4' : 'webm');
        a.textContent = 'Download the demo video (' + Math.round(blob.size / 1024) + ' KB)';
        saveNote.textContent = '';
        saveNote.appendChild(a);
        recorder = null;
        saveBtn.disabled = false;
      };
      saveBtn.disabled = true;
      saveNote.textContent = 'Recording. It plays once at normal speed, about ' + Math.round(demo.end) + ' seconds.';
      rate = 1;
      document.getElementById('demo-rate').value = '1';
      show(0);
      recorder.start();
      play();
    });
    function finishRecording() { if (recorder && recorder.state === 'recording') recorder.stop(); }

    show(0);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColours(); show(frame); });
  }

  // ---------------- Test bench ----------------
  const benchCanvas = document.getElementById('bench-canvas');
  if (benchCanvas) {
    const ctx = benchCanvas.getContext('2d');
    const el = (id) => document.getElementById(id);
    const ver = el('b-version'), room = el('b-room'), base = el('b-base'), turn = el('b-turn');
    const thr = el('b-threshold'), cal = el('b-cal'), live = el('b-live');
    let sim = null, trail = [], playing = false, last = 0;

    function settings() {
      const v = ver.value;
      if (v !== 'custom') return { version: +v };
      return { version: 4, custom: { base: +base.value, turn: Math.min(+turn.value, +base.value), threshold: +thr.value, calibrate: cal.checked } };
    }
    function syncControls() {
      const custom = ver.value === 'custom';
      const v = S.VERSIONS[custom ? 4 : +ver.value];
      [base, turn, thr, cal].forEach((c) => (c.disabled = !custom));
      if (!custom) { base.value = v.base; turn.value = v.turn; cal.checked = v.calibrate; thr.value = v.threshold || 500; }
      thr.disabled = !custom || cal.checked;
      el('b-base-v').textContent = base.value;
      el('b-turn-v').textContent = Math.min(+turn.value, +base.value);
      el('b-threshold-v').textContent = cal.checked ? 'set by calibration' : thr.value;
    }
    [ver, base, turn, thr, cal].forEach((c) => c.addEventListener('input', () => { syncControls(); reset(); }));
    room.addEventListener('input', reset);

    function reset() {
      playing = false;
      sim = S.create(Object.assign({ room: room.value, seed: 1, laps: 1 }, settings()));
      trail = [];
      el('b-watch').textContent = 'Watch one lap';
      draw();
      const r = S.ROOMS[room.value];
      live.textContent = 'In this room the floor reads about ' + r.floor + ' and the tape about ' + r.tape + '.';
    }
    function draw() {
      const st = Object.assign({}, sim, { darkL: sim.phase === 'run' && sim.readL < sim.threshold, darkR: sim.phase === 'run' && sim.readR < sim.threshold });
      drawScene(ctx, st, trail, {
        lines: [
          (sim.phase === 'run' ? 'LAP ' + (sim.t - sim.lapStart).toFixed(2) : sim.phase.toUpperCase()),
          'L ' + String(sim.readL).padStart(4) + '  R ' + String(sim.readR).padStart(4) + '  T ' + (sim.threshold || '---')
        ],
        caption: sim.done ? (sim.result === 'finished' ? 'Lap done in ' + sim.lapTimes[0].toFixed(2) + ' s' : 'Stopped: ' + sim.result) : sim.rule
      });
    }
    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.05, (now - last) / 1000) * +el('b-speed').value;
      last = now;
      const target = sim.t + dt;
      while (sim.t < target && !sim.done) S.step(sim);
      if (!trail.length || Math.hypot(trail[trail.length - 1][0] - sim.x, trail[trail.length - 1][1] - sim.y) > 1) trail.push([sim.x, sim.y]);
      if (trail.length > 400) trail.shift();
      draw();
      if (sim.done) {
        playing = false;
        el('b-watch').textContent = 'Watch again';
        live.textContent = sim.result === 'finished' ? 'Finished one lap in ' + sim.lapTimes[0].toFixed(2) + ' s.' : 'Stopped: ' + sim.result + '. Try a different setting.';
        return;
      }
      requestAnimationFrame(tick);
    }
    el('b-watch').addEventListener('click', () => {
      if (playing) { playing = false; el('b-watch').textContent = 'Carry on'; return; }
      if (sim.done) { const r = room.value; reset(); room.value = r; }
      playing = true; last = performance.now();
      el('b-watch').textContent = 'Pause';
      requestAnimationFrame(tick);
    });

    // 20 runs of 3 laps, seeds 1 to 20: the same test as the tuning notes.
    el('b-trials').addEventListener('click', () => {
      const btn = el('b-trials');
      btn.disabled = true;
      const strip = el('b-runs');
      strip.innerHTML = '';
      const cells = [];
      for (let i = 0; i < 20; i++) { const c = document.createElement('i'); strip.appendChild(c); cells.push(c); }
      const results = [];
      let seed = 1;
      const opts = settings();
      function next() {
        const r = S.trial(Object.assign({ room: room.value, seed, laps: 3 }, opts));
        results.push(r);
        cells[seed - 1].className = r.result === 'finished' ? 'ok' : 'bad';
        cells[seed - 1].title = 'Run ' + seed + ': ' + (r.result === 'finished' ? r.lapTimes.map((t) => t.toFixed(2)).join(', ') + ' s' : r.result);
        seed++;
        if (seed <= 20) { setTimeout(next, 0); return; }
        const ok = results.filter((x) => x.result === 'finished');
        const laps = ok.map((x) => x.lapTimes.reduce((a, b) => a + b) / 3);
        const fails = results.length - ok.length;
        let text = ok.length + ' of 20 runs finished 3 laps.';
        if (ok.length) {
          const mean = laps.reduce((a, b) => a + b) / laps.length;
          const wob = ok.reduce((a, x) => a + x.wobble, 0) / ok.length;
          text += ' Average lap ' + mean.toFixed(2) + ' s, from ' + Math.min(...laps).toFixed(2) + ' to ' + Math.max(...laps).toFixed(2) + ' s. Wobble ' + wob.toFixed(1) + ' degrees.';
        }
        if (fails) text += ' ' + fails + ' left the track.';
        el('b-summary').textContent = text;
        btn.disabled = false;
      }
      el('b-summary').textContent = 'Running...';
      setTimeout(next, 30);
    });

    syncControls();
    reset();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColours(); draw(); });
  }
})();
