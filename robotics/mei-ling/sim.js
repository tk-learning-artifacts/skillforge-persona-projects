// Obstacle-avoider simulator. It runs the same steps as kotak.py on a made-up
// pen of books, a shoebox, a school bag and a chair. Units: cm, s.
(function (root) {
  'use strict';

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
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

  // The pen: 160 x 120 cm, walled with books on their sides.
  const PEN = { w: 160, h: 120 };
  function box(x1, y1, x2, y2, kind, name) {
    return { shape: 'poly', kind, name, pts: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]] };
  }
  const THINGS = [
    { shape: 'poly', kind: 'wall', name: 'book wall', pts: [[0, 0], [160, 0], [160, 120], [0, 120]], inside: true },
    box(64, 44, 96, 64, 'hard', 'shoebox'),
    box(56, 100, 90, 120, 'soft', 'school bag'),
    { shape: 'poly', kind: 'hard', name: 'slanted file', pts: [[0, 30], [30, 0], [32, 2], [2, 32]] },
    { shape: 'circle', kind: 'leg', name: 'chair leg', c: [112, 64], r: 1.5 },
    { shape: 'circle', kind: 'leg', name: 'chair leg', c: [138, 64], r: 1.5 },
    { shape: 'circle', kind: 'leg', name: 'chair leg', c: [112, 90], r: 1.5 },
    { shape: 'circle', kind: 'leg', name: 'chair leg', c: [138, 90], r: 1.5 }
  ];
  const SEGS = [];
  THINGS.forEach((t) => {
    if (t.shape !== 'poly') return;
    for (let i = 0; i < t.pts.length; i++) SEGS.push({ a: t.pts[i], b: t.pts[(i + 1) % t.pts.length], thing: t });
  });

  // The versions in the tuning notes. Servo values are write_analog numbers
  // with a 20 ms period: 77 is a 1.5 ms pulse.
  const VERSIONS = {
    1: { name: 'Version 1', stopCm: 10, speed: 15, backMs: 0, turnMs: 500, leftStop: 77, rightStop: 77, median: false, noEcho: 'negative', randomTurn: false },
    2: { name: 'Version 2', stopCm: 15, speed: 15, backMs: 300, turnMs: 500, leftStop: 78, rightStop: 75, median: false, noEcho: 'far', randomTurn: false },
    3: { name: 'Version 3 (final)', stopCm: 15, speed: 15, backMs: 300, turnMs: 500, leftStop: 78, rightStop: 75, combine: 'echoes', randomTurn: true }
  };

  const ROBOT = {
    radius: 7.5,         // the cardboard box, as a circle
    ahead: 8,            // the sensor sits at the front
    wheelbase: 12,
    vmax: 16,            // cm/s at full speed (simulated)
    lag: 0.05,
    trueStop: [1.525, 1.475], // ms where each servo really stands still
    full: 0.45            // ms from stop to full speed
  };
  const CONE = 7.5 * Math.PI / 180; // half of the 15 degree cone
  const DT = 0.005;

  function raySeg(ox, oy, dx, dy, s) {
    const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((s.a[0] - ox) * ey - (s.a[1] - oy) * ex) / den;
    const u = ((s.a[0] - ox) * dy - (s.a[1] - oy) * dx) / den;
    if (t <= 0 || u < 0 || u > 1) return null;
    const len = Math.hypot(ex, ey);
    const cos = Math.abs((dx * -ey + dy * ex) / len);
    return { t, cos, thing: s.thing };
  }
  function rayCircle(ox, oy, dx, dy, c) {
    const fx = ox - c.c[0], fy = oy - c.c[1];
    const b = fx * dx + fy * dy, cc = fx * fx + fy * fy - c.r * c.r;
    const disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t <= 0) return null;
    const hx = ox + dx * t - c.c[0], hy = oy + dy * t - c.c[1];
    const cos = Math.abs((hx * dx + hy * dy) / c.r);
    return { t, cos, thing: c };
  }

  // One ping. Returns cm, or -1 when no echo comes back.
  function ping(s) {
    const r = s.rand;
    if (r() < 0.04) return 3 + r() * 6; // now and then a wild, too-small reading
    const sx = s.x + Math.cos(s.h) * ROBOT.ahead, sy = s.y + Math.sin(s.h) * ROBOT.ahead;
    let best = Infinity;
    for (let k = -4; k <= 4; k++) {
      const a = s.h + (CONE * k) / 4;
      const dx = Math.cos(a), dy = Math.sin(a);
      let hit = null;
      for (const seg of SEGS) { const h = raySeg(sx, sy, dx, dy, seg); if (h && (!hit || h.t < hit.t)) hit = h; }
      for (const t of legs(s)) { const h = rayCircle(sx, sy, dx, dy, t); if (h && (!hit || h.t < hit.t)) hit = h; }
      if (!hit) continue;
      // A slanted surface bounces the sound away. Soft things soak it up.
      if (hit.cos < Math.cos(50 * Math.PI / 180)) continue;
      if (hit.thing.kind === 'soft' && r() > 0.25) continue;
      if (hit.thing.kind === 'leg' && r() > 0.6) continue;
      best = Math.min(best, hit.t);
    }
    if (best > 450) return -1;
    return Math.max(2, best + gauss(r) * 0.4);
  }

  // The truth, for scoring: nearest thing straight ahead of the sensor.
  function clearAhead(s) {
    const sx = s.x + Math.cos(s.h) * ROBOT.ahead, sy = s.y + Math.sin(s.h) * ROBOT.ahead;
    let best = Infinity;
    for (let k = -4; k <= 4; k++) {
      const a = s.h + (CONE * k) / 4, dx = Math.cos(a), dy = Math.sin(a);
      for (const seg of SEGS) { const h = raySeg(sx, sy, dx, dy, seg); if (h) best = Math.min(best, h.t); }
      for (const t of legs(s)) { const h = rayCircle(sx, sy, dx, dy, t); if (h) best = Math.min(best, h.t); }
    }
    return best;
  }

  function segDist(px, py, a, b) {
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((px - a[0]) * ex + (py - a[1]) * ey) / (ex * ex + ey * ey)));
    return Math.hypot(px - a[0] - ex * t, py - a[1] - ey * t);
  }
  function inside(t, x, y) {
    let c = false;
    for (let i = 0, j = t.pts.length - 1; i < t.pts.length; j = i++) {
      const [xi, yi] = t.pts[i], [xj, yj] = t.pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function touching(s, x, y) {
    for (const seg of SEGS) if (segDist(x, y, seg.a, seg.b) < ROBOT.radius) return seg.thing;
    for (const t of legs(s)) if (Math.hypot(x - t.c[0], y - t.c[1]) < ROBOT.radius + t.r) return t;
    for (const t of THINGS) if (t.shape === 'poly' && !t.inside && inside(t, x, y)) return t;
    return null;
  }
  const LEGS = THINGS.filter((t) => t.shape === 'circle');
  function legs(s) { return s.chair ? LEGS : []; }

  function create(opts) {
    const v = Object.assign({}, VERSIONS[opts.version || 3], opts.custom || {});
    const r = rng(opts.seed || 1);
    const s = {
      v, rand: r, chair: !!opts.chair, t: 0, x: 30, y: 70, h: -0.5, wl: 0, wr: 0, pl: v.leftStop, pr: v.rightStop,
      step: 'start', until: 0, readings: [], reading: null, shown: 'happy', say: 'Off we go',
      bumps: 0, touching: null, clearSince: -10, spooky: 0, stops: 0, moved: 0, events: [], limit: opts.seconds || 120, done: false
    };
    if (opts.jitter) {
      for (let tries = 0; tries < 50; tries++) {
        s.x = 20 + r() * 120; s.y = 15 + r() * 90; s.h = r() * Math.PI * 2;
        if (!touching(s, s.x, s.y) && clearAhead(s) > 25) break;
      }
    }
    return s;
  }

  function wheels(s, left, right) {
    s.pl = s.v.leftStop + left;
    s.pr = s.v.rightStop - right;
  }
  function distanceFrom(s) {
    // How the code turns pings into one distance.
    if (s.v.combine === 'echoes') {
      // Final version: ignore pings with no echo, then take the middle one left.
      const got = s.readings.filter((d) => d >= 0).sort((a, b) => a - b);
      if (!got.length) return 400;
      return got[Math.floor((got.length - 1) / 2)];
    }
    const vals = s.readings.map((d) => (d < 0 ? (s.v.noEcho === 'far' ? 400 : d / 58) : d));
    if (!s.v.median) return vals[0];
    vals.sort((a, b) => a - b);
    return vals[1];
  }

  // The program in kotak.py, as steps with timers.
  function program(s) {
    const v = s.v;
    if (s.t < s.until) return;
    switch (s.step) {
      case 'start':
      case 'sense':
        s.readings = [];
        s.step = 'ping';
      // falls through
      case 'ping': {
        const raw = ping(s);
        s.readings.push(raw < 0 ? -1 : raw);
        s.lastPing = raw;
        s.until = s.t + 0.06;
        if (s.readings.length < (v.median || v.combine ? 3 : 1)) return;
        s.step = 'decide';
        return;
      }
      case 'decide': {
        const d = distanceFrom(s);
        s.reading = d;
        if (d > v.stopCm) {
          wheels(s, v.speed, v.speed);
          s.shown = 'happy';
          s.say = d >= 400 ? 'No echo: carry on' : Math.round(d) + ' cm: carry on';
          s.step = 'sense';
          return program(s);
        }
        s.stops++;
        const truth = clearAhead(s);
        const why = truth > v.stopCm + 15 ? 'nothing there' : 'something ahead';
        if (truth > v.stopCm + 15) s.spooky++;
        s.events.push({ t: s.t, d, why });
        s.shown = 'surprised';
        s.say = (d < 0 ? 'Negative number' : Math.round(d) + ' cm') + ': stop and turn';
        wheels(s, 0, 0);
        s.step = 'back';
        s.until = s.t + 0.2;
        return;
      }
      case 'back':
        if (v.backMs > 0) { wheels(s, -v.speed, -v.speed); s.until = s.t + v.backMs / 1000; }
        s.step = 'turn';
        return;
      case 'turn': {
        const dir = v.randomTurn ? (s.rand() < 0.5 ? -1 : 1) : 1;
        wheels(s, v.speed * dir, -v.speed * dir);
        s.until = s.t + v.turnMs / 1000;
        s.step = 'sense';
        return;
      }
    }
  }

  function servoSpeed(value, trueStop) {
    const ms = (value / 1023) * 20;
    const off = ms - trueStop;
    if (Math.abs(off) < 0.01) return 0; // the servo's dead band
    return Math.max(-1, Math.min(1, off / ROBOT.full)) * ROBOT.vmax;
  }

  function step(s) {
    if (s.done) return;
    program(s);
    const k = DT / ROBOT.lag;
    s.wl += (servoSpeed(s.pl, ROBOT.trueStop[0]) - s.wl) * k;
    s.wr += (-servoSpeed(s.pr, ROBOT.trueStop[1]) - s.wr) * k; // mirrored servo
    const vel = (s.wl + s.wr) / 2, w = (s.wr - s.wl) / ROBOT.wheelbase;
    const h = s.h - w * DT;
    const nx = s.x + Math.cos(h) * vel * DT, ny = s.y + Math.sin(h) * vel * DT;
    let hit = touching(s, nx, ny);
    s.h = h;
    if (hit) {
      // Cardboard slides along whatever it brushes, if it can.
      const slideX = !touching(s, nx, s.y), slideY = !touching(s, s.x, ny);
      if (slideX || slideY) {
        const fx = slideX ? nx : s.x, fy = slideX ? s.y : ny;
        s.moved += Math.hypot(fx - s.x, fy - s.y);
        s.x = fx; s.y = fy;
      }
    }
    if (hit) {
      // A new bump only counts after half a second clear of everything.
      if (!s.touching && s.t - (s.clearSince || -1) > 0.5) {
        s.bumps++;
        s.events.push({ t: s.t, bump: hit.name, doing: s.step === 'turn' || s.step === 'sense' && s.pl < s.v.leftStop ? 'backing' : 'forward' });
      }
      s.touching = hit;
      s.clearSince = null;
    } else {
      s.moved += Math.hypot(nx - s.x, ny - s.y);
      s.x = nx; s.y = ny;
      if (s.touching || s.clearSince === null) s.clearSince = s.t;
      s.touching = null;
    }
    s.t += DT;
    if (s.t >= s.limit) s.done = true;
  }

  function trial(opts) {
    const s = create(Object.assign({ jitter: true }, opts));
    let run = 0, longest = 0;
    while (!s.done) {
      step(s);
      run = s.touching ? run + DT : 0;
      longest = Math.max(longest, run);
    }
    const bumpsBy = {};
    s.events.filter((e) => e.bump).forEach((e) => { bumpsBy[e.bump] = (bumpsBy[e.bump] || 0) + 1; });
    return { bumps: s.bumps, spooky: s.spooky, stops: s.stops, moved: s.moved, bumpsBy, longest };
  }

  const api = { servoSpeed, PEN, THINGS, VERSIONS, ROBOT, CONE, DT, create, step, trial, clearAhead };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PenSim = api;
})(this);
