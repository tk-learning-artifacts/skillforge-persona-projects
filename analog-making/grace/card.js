// Lantern Lights. Draws the inside right page of the card (148 x 210 mm, A4
// folded in half) and works out which LEDs glow. Used by the build steps and
// the fault clinic on the same page.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var COPPER = '#c27a3e', COPPER_EDGE = '#8a4f22';
  var uid = 0;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tape(d, parent, extra) {
    var a = { d: d, fill: 'none', stroke: COPPER, 'stroke-opacity': 0.88, 'stroke-width': 5, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt' };
    for (var k in extra || {}) a[k] = extra[k];
    return el('path', a, parent);
  }

  // The state of one card. Every field is optional; the defaults are a good card.
  // step: how much is built (1 to 6). pressed: the corner flap is held down.
  // led1, led2: 'ok', 'rev' (backwards) or 'loose' (one leg not taped).
  // battery: 'ok' or 'flip'. gap: a cut in the minus track. short: a stray strip.
  // flapShort: the plus tape stops before the fold. ring: [x, y] to circle.
  function lit(s) {
    var closed = s.pressed && s.battery !== 'flip' && !s.gap && !s.short && !s.flapShort && (s.step || 6) >= 6;
    return [closed && (s.led1 || 'ok') === 'ok', closed && (s.led2 || 'ok') === 'ok'];
  }

  function draw(svg, s) {
    var step = s.step || 6, on = lit(s), id = 'g' + (uid++);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 148 210');
    var defs = el('defs', {}, svg);
    var rg = el('radialGradient', { id: id }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff6b0', 'stop-opacity': 1 }, rg);
    el('stop', { offset: '0.45', 'stop-color': '#ffc44d', 'stop-opacity': 0.75 }, rg);
    el('stop', { offset: '1', 'stop-color': '#ff9a2e', 'stop-opacity': 0 }, rg);

    el('rect', { width: 148, height: 210, fill: '#fffdf7' }, svg);
    el('line', { x1: 0.5, y1: 0, x2: 0.5, y2: 210, stroke: '#d9d2c3', 'stroke-width': 1 }, svg);
    var t = el('text', { x: 74, y: 28, 'text-anchor': 'middle', fill: '#1d2742', style: 'font: italic 11px Georgia, serif' }, svg);
    t.textContent = 'Thank you for lighting';
    t = el('text', { x: 74, y: 42, 'text-anchor': 'middle', fill: '#1d2742', style: 'font: italic 11px Georgia, serif' }, svg);
    t.textContent = 'up our school';

    // Lanterns hang from strings, one round each LED.
    [[45, on[0]], [92, on[1]]].forEach(function (L) {
      var x = L[0];
      el('line', { x1: x, y1: 50, x2: x, y2: 84, stroke: '#1d2742', 'stroke-width': 0.8 }, svg);
      el('rect', { x: x - 6, y: 83, width: 12, height: 4, rx: 1, fill: '#1d2742' }, svg);
      el('ellipse', { cx: x, cy: 106, rx: 15, ry: 19, fill: L[1] ? '#ffe2a6' : '#f7e7e1', stroke: '#9b2f3a', 'stroke-width': 1.4 }, svg);
      el('path', { d: 'M' + (x - 8) + ' 88 Q' + (x - 13) + ' 106 ' + (x - 8) + ' 124 M' + (x + 8) + ' 88 Q' + (x + 13) + ' 106 ' + (x + 8) + ' 124 M' + x + ' 87 V125', fill: 'none', stroke: '#9b2f3a', 'stroke-width': 0.7, opacity: 0.6 }, svg);
      el('rect', { x: x - 6, y: 124, width: 12, height: 4, rx: 1, fill: '#1d2742' }, svg);
      el('path', { d: 'M' + (x - 2) + ' 128 v8 M' + x + ' 128 v10 M' + (x + 2) + ' 128 v8', stroke: '#9b2f3a', 'stroke-width': 0.8 }, svg);
    });

    // Step 1: pencil guide lines.
    var guide = { fill: 'none', stroke: '#9aa0ad', 'stroke-width': 0.8, 'stroke-dasharray': '2 2' };
    el('path', Object.assign({ d: 'M30 100 H140 V178 L144 198' }, guide), svg);
    el('path', Object.assign({ d: 'M30 112 H120 V174' }, guide), svg);
    el('circle', Object.assign({ cx: 120, cy: 174, r: 10 }, guide), svg);
    el('path', { d: 'M108 210 L148 170', fill: 'none', stroke: '#3f6b55', 'stroke-width': 0.9, 'stroke-dasharray': '4 2' }, svg);
    var lab = { style: 'font: 600 7px system-ui, sans-serif', fill: '#5a6378' };
    el('text', Object.assign({ x: 18, y: 102.5 }, lab), svg).textContent = '+';
    el('text', Object.assign({ x: 19, y: 114.5 }, lab), svg).textContent = '−';

    // Step 2: the minus track, one piece, with a gap if this card has one.
    if (step >= 2) {
      if (s.gap) { tape('M30 112 H112', svg); tape('M117 112 H120 V174', svg); }
      else tape('M30 112 H120 V174', svg);
    }
    // Step 3: the plus track, round the corner and onto the flap.
    if (step >= 3) {
      tape(s.flapShort ? 'M30 100 H140 V175' : 'M30 100 H140 V178 L143 194', svg);
      if (!s.flapShort) el('circle', { cx: 144, cy: 198, r: 4.5, fill: COPPER }, svg);
      if (s.short) el('path', { d: 'M120 145 H140', stroke: COPPER, 'stroke-width': 4, opacity: 0.95 }, svg);
    }
    // Step 4: the coin cell, plus side up.
    if (step >= 4) {
      el('circle', { cx: 120, cy: 174, r: 10, fill: '#d6dae2', stroke: '#6b7385', 'stroke-width': 1 }, svg);
      el('circle', { cx: 120, cy: 174, r: 7.5, fill: 'none', stroke: '#9aa0ad', 'stroke-width': 0.6 }, svg);
      el('text', { x: 120, y: 177.5, 'text-anchor': 'middle', style: 'font: 700 10px system-ui, sans-serif', fill: '#3a4560' }, svg).textContent = s.battery === 'flip' ? '−' : '+';
    }
    // Step 5: the LEDs. The long leg goes on the plus track.
    if (step >= 5) {
      [[45, s.led1 || 'ok'], [92, s.led2 || 'ok']].forEach(function (L) {
        var x = L[0], rev = L[1] === 'rev', loose = L[1] === 'loose';
        el('path', { d: 'M' + (x - 3) + ' 106 L' + (x - 3) + ' ' + (rev ? 112 : 100) + ' L' + (x - 9) + ' ' + (rev ? 112 : 100), stroke: '#6b7385', 'stroke-width': 1.1, fill: 'none' }, svg);
        el('path', { d: 'M' + (x + 3) + ' 106 L' + (x + 3) + ' ' + (rev ? 100 : 112) + ' L' + (x + (loose ? 8 : 9)) + ' ' + (rev ? 100 : (loose ? 116 : 112)), stroke: '#6b7385', 'stroke-width': 1.1, fill: 'none' }, svg);
        el('rect', { x: x - 5, y: 102.5, width: 10, height: 7, rx: 3.5, fill: '#e2464f', stroke: '#8a1f27', 'stroke-width': 0.7 }, svg);
        el('rect', { x: x - 10, y: rev ? 109 : 97, width: 7, height: 6, fill: '#ffffff', opacity: 0.55, stroke: '#9aa0ad', 'stroke-width': 0.3 }, svg);
        if (!loose) el('rect', { x: x + 4, y: rev ? 97 : 109, width: 7, height: 6, fill: '#ffffff', opacity: 0.55, stroke: '#9aa0ad', 'stroke-width': 0.3 }, svg);
      });
    }
    // Glow when lit.
    [[45, on[0]], [92, on[1]]].forEach(function (L) {
      if (L[1]) el('circle', { cx: L[0], cy: 106, r: 20, fill: 'url(#' + id + ')' }, svg);
    });
    // The corner flap, folded down over the cell while pressed.
    if (step >= 3 && s.pressed) {
      el('path', { d: 'M108 210 L148 170 L108 170 Z', fill: '#f3eee2', stroke: '#3f6b55', 'stroke-width': 0.9, opacity: 0.93 }, svg);
      el('path', { d: 'M108 210 L148 210 L148 170 Z', fill: '#e8e2d4' }, svg);
      el('circle', { cx: 122, cy: 178, r: 6, fill: '#3f6b55', opacity: 0.25 }, svg);
      el('text', { x: 92, y: 200, 'text-anchor': 'middle', style: 'font: 600 6px system-ui, sans-serif', fill: '#3f6b55' }, svg).textContent = 'pressed';
    }
    if (s.ring) el('circle', { cx: s.ring[0], cy: s.ring[1], r: 9, fill: 'none', stroke: '#9b2f3a', 'stroke-width': 2, 'stroke-dasharray': '3 2' }, svg);
    return on;
  }

  // ----- Build it, step by step -----
  var STEPS = [
    { title: 'Draw the paths', text: 'The template is printed on the inside of the card. Go over the dashed lines in pencil. Write + on the top line and − on the lower one. Crease the fold line across the bottom corner.',
      tip: 'My routine: no tape is handed out until I see two pencil lines and two signs. It takes one lap of the room.' },
    { title: 'Lay the − track', text: 'Start at the left end of the lower line. Peel a little backing at a time. At the corner, fold the tape. Do not cut it. Finish under the circle where the cell will sit.',
      tip: 'Say it aloud: "One piece, fold the corners." Pupils who cut and overlap get a weak join, and it is the commonest dark card.' },
    { title: 'Lay the + track', text: 'Run the top line in one piece. Fold down the right side, across the fold line and onto the corner flap. End with a small square of tape near the tip of the flap.',
      tip: 'Tracks must never touch. I ask: "Can you fit your pencil between the + and the −?"' },
    { title: 'Place the coin cell', text: 'Put the cell on the round end of the − track, + side up. Tape just its edge so it stays put. The + side must stay bare.',
      tip: 'Cells come from the numbered egg tray on my desk, one each, only at this step. I count them out and count them back.' },
    { title: 'Add the two LEDs', text: 'Bend the legs flat, apart. The long leg goes on the + track, the short leg on the − track. Tape each leg down with a small square of clear tape.',
      tip: 'Before they tape: "Show me your long leg." Thirty-six hands up is quicker than thirty-six dark cards.' },
    { title: 'Fold and press', text: 'Fold the corner flap over the cell and press. The copper square on the flap touches the + side and both lanterns glow. The flap is the switch.',
      tip: 'If it stays dark, the card is data. We use the four questions on the help ladder, not my hands.' }
  ];

  var bsvg = document.getElementById('build-card');
  if (bsvg) {
    var step = 1, pressed = false, flip2 = false, flipCell = false;
    var title = document.getElementById('step-title'), text = document.getElementById('step-text'), tip = document.getElementById('step-tip');
    var prev = document.getElementById('prev'), next = document.getElementById('next'), press = document.getElementById('press');
    var live = document.getElementById('build-live'), whatif = document.getElementById('whatif'), dots = document.getElementById('dots');
    STEPS.forEach(function (st, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = i + 1; b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + st.title);
      b.addEventListener('click', function () { step = i + 1; render(); });
      dots.appendChild(b);
    });
    function render() {
      var st = STEPS[step - 1];
      title.textContent = 'Step ' + step + ' of 6: ' + st.title;
      text.textContent = st.text; tip.textContent = st.tip;
      prev.disabled = step === 1; next.disabled = step === 6;
      press.hidden = step < 6; whatif.hidden = step < 6;
      if (step < 6) pressed = false;
      press.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      press.textContent = pressed ? 'Let go of the flap' : 'Press the corner flap';
      Array.prototype.forEach.call(dots.children, function (b, i) { if (i === step - 1) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      var on = draw(bsvg, { step: step, pressed: pressed, led2: flip2 ? 'rev' : 'ok', battery: flipCell ? 'flip' : 'ok' });
      if (step < 6) live.textContent = '';
      else if (!pressed) live.textContent = 'Flap open. The path is broken, so nothing glows.';
      else if (on[0] && on[1]) live.textContent = 'Both lanterns glow. Each LED has its own path to the cell.';
      else if (on[0]) live.textContent = 'Lantern 1 glows, lantern 2 is dark. A backwards LED blocks only its own path.';
      else live.textContent = 'Both dark. With the cell upside down, current cannot flow the LEDs\' way.';
      document.getElementById('flip2').setAttribute('aria-pressed', flip2 ? 'true' : 'false');
      document.getElementById('flipcell').setAttribute('aria-pressed', flipCell ? 'true' : 'false');
    }
    prev.addEventListener('click', function () { if (step > 1) { step--; render(); } });
    next.addEventListener('click', function () { if (step < 6) { step++; render(); } });
    press.addEventListener('click', function () { pressed = !pressed; render(); });
    document.getElementById('flip2').addEventListener('click', function () { flip2 = !flip2; render(); });
    document.getElementById('flipcell').addEventListener('click', function () { flipCell = !flipCell; render(); });
    render();
  }

  // ----- Fault clinic -----
  var DIAG = [
    { key: 'rev', label: 'An LED is the wrong way round' },
    { key: 'gap', label: 'The tape path is broken' },
    { key: 'short', label: 'A short circuit: + and − touch' },
    { key: 'cell', label: 'The cell is upside down' },
    { key: 'switch', label: 'The flap switch never closes' },
    { key: 'loose', label: 'An LED leg is loose' }
  ];
  var CASES = [
    { who: 'Pupil A', said: '"Only one lantern works. I did them both the same."', state: { led1: 'rev' }, answer: 'rev', ring: [45, 106],
      ask: 'Which leg of this LED is longer? Which track is it on?',
      fix: 'Lift the tape, turn the LED round, tape it again. A backwards LED is not broken. It just won\'t light.' },
    { who: 'Pupil B', said: '"Nothing. I pressed really hard."', state: { gap: true }, answer: 'gap', ring: [115, 112],
      ask: 'Put your finger on the − track and trace it to the cell. Where does the copper stop?',
      fix: 'Lay one new piece over the join, folding at the corner. Two pieces just taped together make a weak join.' },
    { who: 'Pupil C', said: '"I added extra tape to make it stronger."', state: { short: true }, answer: 'short', ring: [130, 145],
      ask: 'Can you fit your pencil between the + track and the − track everywhere?',
      fix: 'Peel off the strip that joins them. The current takes that short cut and skips the LEDs. It also runs the cell down.' },
    { who: 'Pupil D', said: '"It worked, then I took the battery out to look at it."', state: { battery: 'flip' }, answer: 'cell', ring: [120, 174],
      ask: 'What does the top of your cell say? Which track should that side touch?',
      fix: 'Turn the cell so the + side faces up, towards the flap.' },
    { who: 'Pupil E', said: '"The lights are fine. I checked the LEDs twice."', state: { flapShort: true }, answer: 'switch', ring: [142, 192],
      ask: 'When you fold the flap, what touches the top of the cell?',
      fix: 'Carry the + tape across the fold line onto the flap. End it near the tip, where it lands on the cell.' },
    { who: 'Pupil F', said: '"The second one flickers when I tilt the card."', state: { led2: 'loose' }, answer: 'loose', ring: [100, 114],
      ask: 'Press gently on each leg of the dim LED. What changes?',
      fix: 'Flatten the leg onto the copper and tape over it. A leg that only rests on the tape loses touch when the card moves.' }
  ];

  var csvg = document.getElementById('clinic-card');
  if (csvg) {
    var ci = 0, score = 0, tried = [];
    var opts = document.getElementById('options'), fb = document.getElementById('feedback');
    function show() {
      var c = CASES[ci];
      document.getElementById('case-n').textContent = 'Card ' + (ci + 1) + ' of ' + CASES.length;
      document.getElementById('case-who').textContent = c.who + ' says: ' + c.said;
      document.getElementById('score').textContent = 'First-try diagnoses: ' + score + ' of ' + CASES.length;
      draw(csvg, Object.assign({ pressed: true }, c.state));
      fb.hidden = true; opts.innerHTML = '';
      DIAG.forEach(function (d) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = d.label;
        b.addEventListener('click', function () { choose(d.key, b); });
        opts.appendChild(b);
      });
      document.getElementById('next-case').hidden = true;
    }
    function choose(key, b) {
      var c = CASES[ci];
      if (!fb.hidden) return;
      if (tried.indexOf(ci) < 0) { tried.push(ci); if (key === c.answer) score++; }
      if (key !== c.answer) {
        b.classList.add('wrong'); b.disabled = true;
        document.getElementById('clinic-live').textContent = 'Not this one. Look at the card again: where does the path stop?';
        return;
      }
      b.classList.add('right');
      document.getElementById('clinic-live').textContent = 'Yes.';
      draw(csvg, Object.assign({ pressed: true, ring: c.ring }, c.state));
      document.getElementById('ask').textContent = c.ask;
      document.getElementById('fix').textContent = c.fix;
      fb.hidden = false;
      document.getElementById('score').textContent = 'First-try diagnoses: ' + score + ' of ' + CASES.length;
      var n = document.getElementById('next-case');
      n.hidden = false;
      n.textContent = ci < CASES.length - 1 ? 'Next card' : 'Start again';
    }
    document.getElementById('next-case').addEventListener('click', function () {
      if (ci < CASES.length - 1) ci++; else { ci = 0; score = 0; tried = []; }
      document.getElementById('clinic-live').textContent = '';
      show();
    });
    show();
  }

  window.LanternCard = { draw: draw };
})();
