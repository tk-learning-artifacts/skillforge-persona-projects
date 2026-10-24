// Line-follower simulator. It runs the same rules as linefollow.py, on a
// made-up track, with made-up sensor numbers for three rooms. Units: cm, s.
(function (root) {
  'use strict';

  // Seeded random numbers, so a run can be replayed exactly.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  }

  // The track: a closed loop of black tape on a 200 x 140 cm floor.
  const ARENA = { w: 200, h: 140 };
  // Built like a turtle walk: straights and arcs, so every corner has a known
  // radius. S = straight (cm), L and R = arc (radius cm, angle degrees).
  const PLAN = [
    ['S', 100], ['L', 30, 90], ['S', 30], ['L', 30, 90], ['S', 10],
    ['L', 25, 50], ['R', 25, 50], ['S', 51.7], ['L', 30, 90], ['S', 12.1], ['L', 30, 90]
  ];
  const START = [50, 120];
  const TAPE_HALF = 0.95;   // 19 mm tape
  const SPOT = 0.5;         // sensor spot radius

  function buildTrack() {
    const out = [];
    let x = START[0], y = START[1], h = 0;
    for (const [kind, a, b] of PLAN) {
      const len = kind === 'S' ? a : a * b * Math.PI / 180;
      const turn = kind === 'S' ? 0 : (kind === 'L' ? -1 : 1) / a; // y grows downwards
      for (let d = 0; d < len - 1e-9; d += 0.5) {
        out.push([x, y]);
        const step = Math.min(0.5, len - d);
        h += turn * step / 2;
        x += Math.cos(h) * step; y += Math.sin(h) * step;
        h += turn * step / 2;
      }
    }
    return out;
  }
  const TRACK = buildTrack();
  const STEP = 0.5;
  const LENGTH = TRACK.length * STEP;

  // Rooms. The readings are made up, shaped like our team's logs.
  // Black tape reflects less light, so it reads HIGH. Window light lowers every reading.
  const ROOMS = {
    cca: { name: 'CCA room, ceiling lights', floor: 243, tape: 843, noise: 14 },
    hall: { name: 'Hall, next to the windows', floor: 113, tape: 463, noise: 22 },
    dim: { name: 'Dim corner of the store room', floor: 553, tape: 933, noise: 12 }
  };

  // The four versions in the tuning notes. Duty numbers are out of 1023.
  const VERSIONS = {
    1: { name: 'Version 1', base: 700, turn: 700, threshold: 512, calibrate: false },
    2: { name: 'Version 2', base: 700, turn: 350, threshold: 543, calibrate: false },
    3: { name: 'Version 3', base: 700, turn: 525, threshold: 0, calibrate: true },
    4: { name: 'Version 4 (final)', base: 900, turn: 700, threshold: 0, calibrate: true }
  };

  const ROBOT = {
    wheelbase: 13,        // cm between the wheels
    ahead: 7,             // sensors sit 7 cm in front of the axle
    apart: 1.6,           // each sensor 1.6 cm from the middle
    vmax: 55,             // cm/s at full duty (simulated)
    lag: 0.1,             // motor response time, s
    rightGain: 0.96,      // the right motor is a bit weaker
    loop: 0.03            // one pass of the main loop: 30 ms pause plus reading time
  };
  const DT = 0.002;

  function nearest(x, y, hint) {
    const n = TRACK.length;
    let best = hint, bd = Infinity;
    const span = hint < 0 ? n : 60;
    for (let k = -span; k <= span; k++) {
      const i = hint < 0 ? (k + span) % n : (hint + k + n) % n;
      const p = TRACK[i];
      const d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < bd) { bd = d; best = i; }
    }
    return { i: best, d: Math.sqrt(bd) };
  }
  function lineDist(x, y, hint) {
    // Distance to the tape's centre line, checking every point near the hint.
    return nearest(x, y, hint).d;
  }

  // One run: optional calibration spin, then `laps` laps.
  function create(opts) {
    const v = Object.assign({}, VERSIONS[opts.version || 4], opts.custom || {});
    const room = ROOMS[opts.room || 'cca'];
    const r = rng(opts.seed || 1);
    const t0 = TRACK[0], t1 = TRACK[4];
    const heading = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]) + (opts.jitter ? gauss(r) * 0.04 : 0);
    const side = opts.jitter ? gauss(r) * 0.3 : 0;
    const s = {
      v, room, laps: opts.laps || 1,
      x: t0[0] - Math.sin(heading) * side, y: t0[1] + Math.cos(heading) * side, h: heading,
      vl: 0, vr: 0, cmdL: 0, cmdR: 0,
      t: 0, phase: v.calibrate ? 'calibrate' : 'run', calT: 0,
      lo: 1023, hi: 0, threshold: v.calibrate ? 0 : v.threshold,
      readL: 0, readR: 0, darkL: false, darkR: false, rule: 'start',
      idx: 0, travelled: 0, lap: 0, lapStart: 0, lapTimes: [],
      nextLoop: 0, done: false, result: null,
      // Battery level and floor grip change a little from run to run.
      battery: opts.jitter ? 1 + gauss(r) * 0.03 : 1,
      switches: 0, lastRule: '', offSum: 0, offN: 0
    };
    s.rand = r;
    return s;
  }

  function sensorPos(s, sideSign) {
    const fx = Math.cos(s.h), fy = Math.sin(s.h);
    const lx = Math.sin(s.h), ly = -Math.cos(s.h); // left of travel, y down
    return [s.x + fx * ROBOT.ahead + lx * ROBOT.apart * sideSign, s.y + fy * ROBOT.ahead + ly * ROBOT.apart * sideSign];
  }
  function read(s, sideSign) {
    const p = sensorPos(s, sideSign);
    const d = lineDist(p[0], p[1], s.idx);
    const f = Math.max(0, Math.min(1, (TAPE_HALF + SPOT - d) / (2 * SPOT)));
    const raw = s.room.floor * (1 - f) + s.room.tape * f - gauss(s.rand) * s.room.noise;
    return Math.max(0, Math.min(1023, Math.round(raw)));
  }

  // The rules from linefollow.py.
  function control(s) {
    s.readL = read(s, 1);
    s.readR = read(s, -1);
    if (s.phase === 'calibrate') {
      s.lo = Math.min(s.lo, s.readL, s.readR);
      s.hi = Math.max(s.hi, s.readL, s.readR);
      const SPIN = 400;
      // Sweep left 0.4 s, right 0.8 s, left 0.4 s.
      if (s.calT < 0.4) { s.cmdL = -SPIN; s.cmdR = SPIN; s.rule = 'calibrate: sweep left'; }
      else if (s.calT < 1.2) { s.cmdL = SPIN; s.cmdR = -SPIN; s.rule = 'calibrate: sweep right'; }
      else if (s.calT < 1.6) { s.cmdL = -SPIN; s.cmdR = SPIN; s.rule = 'calibrate: sweep back'; }
      else {
        s.cmdL = 0; s.cmdR = 0;
        if (s.hi - s.lo < 150) { s.done = true; s.result = 'calibration failed'; s.rule = 'calibration failed'; return; }
        s.threshold = Math.floor((s.lo + s.hi) / 2); // like (low + high) // 2 in Python
        s.phase = 'settle';
        s.rule = 'threshold set to ' + s.threshold;
      }
      return;
    }
    if (s.phase === 'settle') {
      s.cmdL = 0; s.cmdR = 0;
      if (s.calT > 2.2) { s.phase = 'run'; s.lapStart = s.t; }
      return;
    }
    const v = s.v;
    s.darkL = s.readL > s.threshold;
    s.darkR = s.readR > s.threshold;
    const before = s.rule;
    if (s.darkL && !s.darkR) { s.cmdL = v.base - v.turn; s.cmdR = v.base; s.rule = 'line under left: steer left'; }
    else if (s.darkR && !s.darkL) { s.cmdL = v.base; s.cmdR = v.base - v.turn; s.rule = 'line under right: steer right'; }
    else if (!s.darkL && !s.darkR) { s.cmdL = v.base; s.cmdR = v.base; s.rule = 'line between: straight'; }
    else { s.rule = 'both dark: keep going'; }
    if (s.rule !== before) s.switches++;
  }

  function step(s) {
    if (s.done) return;
    if (s.t >= s.nextLoop) { control(s); s.nextLoop += ROBOT.loop; }
    if (s.done) return;
    if (s.phase !== 'run') s.calT += DT;
    const k = DT / ROBOT.lag;
    const top = ROBOT.vmax * s.battery;
    s.vl += ((s.cmdL / 1023) * top * (1 + gauss(s.rand) * 0.04) - s.vl) * k;
    s.vr += ((s.cmdR / 1023) * top * ROBOT.rightGain * (1 + gauss(s.rand) * 0.04) - s.vr) * k;
    const vel = (s.vl + s.vr) / 2, w = (s.vr - s.vl) / ROBOT.wheelbase;
    s.h -= w * DT; // y grows downwards, so a left turn lowers the heading angle
    s.x += Math.cos(s.h) * vel * DT;
    s.y += Math.sin(s.h) * vel * DT;
    s.t += DT;
    const near = nearest(s.x, s.y, s.idx);
    let di = near.i - s.idx;
    const n = TRACK.length;
    if (di > n / 2) di -= n;
    if (di < -n / 2) di += n;
    s.idx = near.i;
    if (s.phase === 'run') {
      s.travelled += di;
      // How far the robot points away from the tape, in degrees.
      const a = TRACK[s.idx], b = TRACK[(s.idx + 2) % n];
      let e = s.h - Math.atan2(b[1] - a[1], b[0] - a[0]);
      e = Math.atan2(Math.sin(e), Math.cos(e)) * 180 / Math.PI;
      s.offSum += e * e; s.offN++;
      if (s.travelled >= n * (s.lap + 1)) {
        s.lapTimes.push(s.t - s.lapStart);
        s.lapStart = s.t;
        s.lap++;
        if (s.lap >= s.laps) { s.done = true; s.result = 'finished'; }
      }
      if (near.d > 9) { s.done = true; s.result = 'off the track'; }
      if (s.t - s.lapStart > 40) { s.done = true; s.result = 'too slow (40 s)'; }
    }
  }

  // Run fast, with no drawing. Returns lap times or a failure.
  function trial(opts) {
    const s = create(Object.assign({ jitter: true }, opts));
    let guard = 0;
    while (!s.done && guard++ < 200000) step(s);
    return { result: s.result, lapTimes: s.lapTimes, threshold: s.threshold, lap: s.lap,
      switches: s.switches, wobble: s.offN ? Math.sqrt(s.offSum / s.offN) : 0 };
  }

  const api = { ARENA, TRACK, LENGTH, ROOMS, VERSIONS, ROBOT, TAPE_HALF, DT, create, step, trial, sensorPos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LineSim = api;
})(this);
