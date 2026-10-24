// Otter Dive simulator. A cam turns on an axle. A flat-footed follower rests on
// it and carries the otter. Distances are in millimetres, the same as the
// cardboard build, with the axle at (0, 0) and y pointing up.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var S = 2.5;                 // pixels per millimetre in the stage drawing
  var TOP_Y = 150;             // highest millimetre shown
  var FOOT = 15;               // half the width of the 30 mm foot disc
  var ROD = 85;                // skewer length from foot to otter
  var N = 720;                 // points around each cam outline

  function px(x) { return (x + 60) * S; }
  function py(y) { return (TOP_Y - y) * S; }

  // Each cam is a list of points in its own frame, measured from the axle hole.
  function round() {
    var pts = [];
    for (var i = 0; i < N; i++) { var a = i / N * 2 * Math.PI; pts.push([8 + 22 * Math.cos(a), 22 * Math.sin(a)]); }
    return pts;
  }
  function egg() {
    var pts = [];
    for (var i = 0; i < N; i++) {
      var a = i / N * 2 * Math.PI, d = a - Math.PI / 2;
      if (d > Math.PI) d -= 2 * Math.PI;
      var bump = Math.abs(d) < Math.PI / 3 ? Math.pow(Math.cos(1.5 * d), 2) : 0;
      var r = 18 + 12 * bump;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
  }
  function snail() {
    // The radius grows from 15 to 30 mm over one turn, then steps back to 15.
    var pts = [];
    for (var i = 0; i < N; i++) {
      var a = i / N * 2 * Math.PI, r = 15 + 15 * i / N;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    pts.push([30, 0]);
    return pts;
  }

  var CAMS = {
    round: { name: 'Round, off centre', pts: round(), oneWay: false,
      story: 'The otter bobs up and down on the swell. Smooth, and it never stops moving.' },
    egg: { name: 'Egg', pts: egg(), oneWay: false,
      story: 'The otter waits low for most of a turn, then peeks up and drops back.' },
    snail: { name: 'Snail', pts: snail(), oneWay: true,
      story: 'The otter rises slowly to spot a fish, then dives in one snap.' }
  };

  // How high the foot sits when the cam has turned by rot radians
  // (positive = clockwise on screen). The foot only touches points under it.
  function lift(cam, rot) {
    var c = Math.cos(-rot), s = Math.sin(-rot), best = -99, pts = cam.pts;
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0] * c - pts[i][1] * s, y = pts[i][0] * s + pts[i][1] * c;
      if (x >= -FOOT && x <= FOOT && y > best) best = y;
    }
    return best;
  }

  // Precompute two forward turns for the graph and the travel.
  function profile(cam) {
    var out = [], lo = 99, hi = -99;
    for (var d = 0; d <= 720; d += 2) {
      var h = lift(cam, d * Math.PI / 180);
      out.push(h);
      if (d < 360) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
    }
    cam.profile = out; cam.lo = lo; cam.hi = hi;
  }
  Object.keys(CAMS).forEach(function (k) { profile(CAMS[k]); });

  var stage = document.getElementById('stage');
  var graph = document.getElementById('graph');
  var dial = document.getElementById('dial');
  if (!stage || !graph || !dial) return;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Stage: the box in x-ray view, with the front wall taken away.
  stage.setAttribute('viewBox', '0 0 300 490');
  el('rect', { x: px(-45), y: py(55), width: 90 * S, height: 90 * S, 'class': 's-board-2' }, stage);
  el('text', { x: px(-42), y: py(-30), 'class': 's-muted' }, stage).textContent = 'Box, front wall off';
  var camShape = el('path', { 'class': 's-cam' }, stage);
  var camMark = el('circle', { r: 3, 'class': 's-inkfill' }, stage);
  el('circle', { cx: px(0), cy: py(0), r: 4, 'class': 's-board-2' }, stage);
  el('rect', { x: px(-3), y: py(62), width: 6 * S, height: 12 * S, 'class': 's-board' }, stage);
  var rod = el('line', { x1: px(0), x2: px(0), 'class': 's-ink' }, stage);
  rod.setAttribute('stroke-width', '4');
  var foot = el('rect', { x: px(-FOOT), width: 2 * FOOT * S, height: 2.5 * S, rx: 2, 'class': 's-board' }, stage);
  var otter = el('g', {}, stage);
  var o = el('g', { transform: 'scale(' + S + ')' }, otter);
  el('path', { d: 'M-9 15 C-11 2 -9 -8 -4 -12 L4 -12 C9 -8 11 2 9 15 Z', 'class': 's-otter' }, o);
  el('ellipse', { cx: 0, cy: -15, rx: 7.5, ry: 6.5, 'class': 's-otter' }, o);
  el('ellipse', { cx: 0, cy: -12.5, rx: 4.5, ry: 3, fill: '#d9b58c' }, o);
  el('circle', { cx: -3, cy: -16.5, r: 1.1, 'class': 's-inkfill' }, o);
  el('circle', { cx: 3, cy: -16.5, r: 1.1, 'class': 's-inkfill' }, o);
  el('circle', { cx: 0, cy: -13.5, r: 1.2, 'class': 's-inkfill' }, o);
  el('path', { d: 'M-4 -12.5 l-6 -1 M-4 -11.5 l-6 1.2 M4 -12.5 l6 -1 M4 -11.5 l6 1.2', stroke: 'currentColor', 'stroke-width': 0.4, 'class': 's-ink' }, o);
  var wavePath = 'M' + px(-45) + ' ' + py(55);
  for (var w = -45; w < 45; w += 15) wavePath += ' L' + px(w) + ' ' + py(106) + ' Q' + px(w + 7.5) + ' ' + py(114) + ' ' + px(w + 15) + ' ' + py(106);
  wavePath += ' L' + px(45) + ' ' + py(55) + ' Z';
  el('path', { d: wavePath, 'class': 's-water' }, stage);
  var fish = el('g', { transform: 'translate(' + px(26) + ',' + py(88) + ')' }, stage);
  el('path', { d: 'M-14 0 q8 -9 18 0 q-10 9 -18 0 z M4 0 l9 -7 v14 z', fill: '#ffffff', opacity: 0.85 }, fish);
  el('circle', { cx: -8, cy: -1.5, r: 1.6, fill: '#1f6f8b' }, fish);
  el('text', { x: px(-38), y: py(70), fill: '#ffffff', style: 'font: 600 12px system-ui, sans-serif' }, stage).textContent = 'Wave card, glued on';

  // Graph: lift against the angle turned, for two turns.
  var GW = 600, GH = 280, GL = 52, GR = 14, GT = 34, GB = 66;
  graph.setAttribute('viewBox', '0 0 ' + GW + ' ' + GH);
  function gx(d) { return GL + d / 720 * (GW - GL - GR); }
  function gy(h) { return GT + (35 - h) / 35 * (GH - GT - GB); }
  for (var h = 0; h <= 35; h += 5) {
    el('line', { x1: GL, x2: GW - GR, y1: gy(h), y2: gy(h), 'class': 's-grid' }, graph);
    el('text', { x: GL - 6, y: gy(h) + 6, 'text-anchor': 'end', 'class': 'g-lab' }, graph).textContent = h;
  }
  ['0', '½', '1', '1½', '2'].forEach(function (t, i) {
    el('text', { x: gx(i * 180), y: GH - 40, 'text-anchor': 'middle', 'class': 'g-lab' }, graph).textContent = t;
  });
  el('text', { x: GW - GR, y: GH - 2, 'text-anchor': 'end', 'class': 'g-lab' }, graph).textContent = 'turns of the crank';
  el('text', { x: 4, y: 20, 'class': 'g-lab' }, graph).textContent = 'foot height, mm';
  var trace = el('path', { 'class': 's-trace' }, graph);
  var band = el('rect', { x: GL, width: GW - GL - GR, fill: 'currentColor', opacity: 0.08 }, graph);
  var dot = el('circle', { r: 7, 'class': 's-accent' }, graph);

  // Dial: the crank handle, seen from the side. Drag it or use the arrow keys.
  dial.setAttribute('viewBox', '0 0 120 120');
  el('circle', { cx: 60, cy: 60, r: 50, 'class': 's-board' }, dial);
  el('circle', { cx: 60, cy: 60, r: 6, 'class': 's-inkfill' }, dial);
  var arm = el('line', { x1: 60, y1: 60, 'class': 's-ink' }, dial);
  arm.setAttribute('stroke-width', '8');
  var knob = el('circle', { r: 11, 'class': 's-cam' }, dial);

  var camKey = 'snail', angle = 0, travelled = 0, playing = false, dir = 1, jammed = false, dives = 0, last = null;
  var live = document.getElementById('live');
  var out = { h: document.getElementById('r-height'), t: document.getElementById('r-travel'), n: document.getElementById('r-turns') };

  function say(msg, isJam) { live.textContent = msg; live.classList.toggle('jam', !!isJam); }

  function draw() {
    var cam = CAMS[camKey], rot = angle * Math.PI / 180, c = Math.cos(-rot), s = Math.sin(-rot);
    var d = '';
    for (var i = 0; i < cam.pts.length; i += 4) {
      var x = cam.pts[i][0] * c - cam.pts[i][1] * s, y = cam.pts[i][0] * s + cam.pts[i][1] * c;
      d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(y).toFixed(1);
    }
    if (cam.oneWay) {
      var e = cam.pts[cam.pts.length - 1];
      d += 'L' + px(e[0] * c - e[1] * s).toFixed(1) + ' ' + py(e[0] * s + e[1] * c).toFixed(1);
    }
    camShape.setAttribute('d', d + 'Z');
    camMark.setAttribute('cx', px(10 * Math.cos(-rot + 0.6)));
    camMark.setAttribute('cy', py(10 * Math.sin(-rot + 0.6)));
    var h = lift(cam, rot);
    foot.setAttribute('y', py(h + 2.5));
    rod.setAttribute('y1', py(h + 2));
    rod.setAttribute('y2', py(h + ROD));
    otter.setAttribute('transform', 'translate(' + px(0) + ',' + py(h + ROD)+ ')');
    var a = rot - Math.PI / 2;
    arm.setAttribute('x2', 60 + 40 * Math.cos(a)); arm.setAttribute('y2', 60 + 40 * Math.sin(a));
    knob.setAttribute('cx', 60 + 40 * Math.cos(a)); knob.setAttribute('cy', 60 + 40 * Math.sin(a));
    var m = ((angle % 720) + 720) % 720;
    dot.setAttribute('cx', gx(m)); dot.setAttribute('cy', gy(h));
    out.h.textContent = h.toFixed(1);
    out.n.textContent = (travelled / 360).toFixed(1);
    dial.setAttribute('aria-valuenow', Math.round(((angle % 360) + 360) % 360));
    return h;
  }

  function setCam(key) {
    camKey = key; angle = 0; travelled = 0; jammed = false; dives = 0; last = null;
    var cam = CAMS[key];
    trace.setAttribute('d', cam.profile.map(function (h, i) { return (i ? 'L' : 'M') + gx(i * 2).toFixed(1) + ' ' + gy(h).toFixed(1); }).join(''));
    band.setAttribute('y', gy(cam.hi)); band.setAttribute('height', gy(cam.lo) - gy(cam.hi));
    out.t.textContent = (cam.hi - cam.lo).toFixed(0);
    document.querySelectorAll('[data-cam]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cam') === key ? 'true' : 'false'); });
    document.getElementById('story').textContent = cam.story;
    say(cam.oneWay ? 'The snail cam only works one way. Try turning it backwards.' : 'This cam works in both directions.');
    last = draw();
  }

  // Turn by a number of degrees in small steps, so a jam is caught where it happens.
  function turn(deg) {
    if (jammed && Math.sign(deg) === -1) return;
    if (jammed) { jammed = false; say('Free again. Forwards, the follower rides up the slope.'); }
    var cam = CAMS[camKey], step = Math.sign(deg), n = Math.abs(deg);
    for (var i = 0; i < n; i++) {
      var next = lift(cam, (angle + step) * Math.PI / 180);
      if (cam.oneWay && step < 0 && next - last > 2) {
        jammed = true; playing = false; syncPlay();
        say('Jammed. The step of the snail cam hit the foot. Turn it forwards to free it.', true);
        break;
      }
      if (last - next > 4) { dives++; say('Dive ' + dives + '. Splash.'); }
      angle += step; travelled += 1; last = next;
    }
    draw();
  }

  var playBtn = document.getElementById('play');
  function syncPlay() { playBtn.textContent = playing ? 'Pause' : 'Turn the crank'; playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false'); }
  var prevT = null;
  function frame(t) {
    if (!playing) { prevT = null; return; }
    if (prevT !== null) turn(dir * Math.max(1, Math.round((t - prevT) * 0.12)));
    prevT = t;
    requestAnimationFrame(frame);
  }
  playBtn.addEventListener('click', function () {
    playing = !playing; syncPlay();
    if (playing) requestAnimationFrame(frame);
  });
  document.getElementById('dir').addEventListener('click', function () {
    dir = -dir;
    this.textContent = dir === 1 ? 'Direction: clockwise' : 'Direction: anticlockwise';
  });
  document.getElementById('reset').addEventListener('click', function () { playing = false; syncPlay(); setCam(camKey); });
  document.querySelectorAll('[data-cam]').forEach(function (b) {
    b.addEventListener('click', function () { playing = false; syncPlay(); setCam(b.getAttribute('data-cam')); });
  });

  // Drag the crank. The change in pointer angle becomes a turn.
  var dragging = false, prevA = 0;
  function pointerAngle(e) {
    var r = dial.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  }
  dial.addEventListener('pointerdown', function (e) { dragging = true; prevA = pointerAngle(e); dial.setPointerCapture(e.pointerId); });
  dial.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var a = pointerAngle(e), d = a - prevA;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    d = Math.round(d);
    if (d) { turn(d); prevA = a; }
  });
  dial.addEventListener('pointerup', function () { dragging = false; });
  dial.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { turn(10); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { turn(-10); e.preventDefault(); }
  });

  setCam('snail');
})();
