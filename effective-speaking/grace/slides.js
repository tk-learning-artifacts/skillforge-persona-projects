// Grace's 14 slides for "Long beats clever". Each slide is built with DOM
// calls, so the deck page and the recording player draw the same slides.
var SLIDES = [
  { kind: 'title', big: 'Long beats clever', small: 'How passwords get guessed', foot: 'Grace Chua · Sec 1 parents’ morning',
    note: 'No podium. Stand centre front. Wait for quiet before the first word.' },
  { kind: 'words', big: 'In 12 minutes, you can make a password a computer can’t guess in your lifetime.',
    note: 'The promise. Say it to the room, not to the screen.' },
  { kind: 'versus', a: 'S1ngapore!', b: 'lamp river sock thunder', q: 'Which is harder to guess?',
    note: 'Two hand votes. Then wait five full seconds. Repeat the answer for the back row.' },
  { kind: 'number', big: '123456', small: 'seen in leaks more than 200 million times',
    note: 'Pause after the number. Let it land.' },
  { kind: 'doors',
    note: 'One finger for the front door, two for the back door. Say the guessing speed is my own made-up number.' },
  { kind: 'dials',
    note: 'Mime a locker dial. Hands close for a thousand, wide for a million.' },
  { kind: 'bars',
    note: 'Three sums. Stop after seventy thousand years. Check the right-hand rows.' },
  { kind: 'chain', items: ['password', 'Password1', 'Password1!'], small: 'NIST: people respond to these rules in very predictable ways',
    note: 'Back to the vote. The clever swaps are early on the list.' },
  { kind: 'key', n: '1', big: 'Long beats clever',
    note: 'Slow down. One beat per word. Invite them to say it with you.' },
  { kind: 'key', n: '2', big: 'One password, one account',
    note: 'Back door again: one leak, every door.' },
  { kind: 'key', n: '3', big: 'Add a second lock', small: '2FA: a code or a tap on your phone',
    note: 'Email first, because email can reset the rest.' },
  { kind: 'rules',
    note: 'If someone asks about forced changes: NIST says don’t force them. Change after a leak.' },
  { kind: 'dice',
    note: 'The one thing for tonight. Two rules at the end.' },
  { kind: 'list', head: 'Now you can', items: ['explain why long beats clever', 'make a six-word passphrase with dice', 'add a second lock to your email'],
    note: 'Count on fingers. End on what they can do, then a word about the room. No “that’s all”.' }
];

function slideEl(tag, cls, text, parent) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
var SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs, parent) {
  var e = document.createElementNS(SVGNS, name);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgText(x, y, text, cls, parent, anchor) {
  var t = svgEl('text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'middle' }, parent);
  t.textContent = text;
  return t;
}

// Returns a 16:9 slide element. Text sizes are in container units, so a
// slide reads the same at 320 px wide and full screen.
function renderSlide(i) {
  var s = SLIDES[i];
  var box = slideEl('div', 'slide slide-' + s.kind);
  var inner = slideEl('div', 'slide-in', '', box);
  if (s.kind === 'title') {
    slideEl('p', 'sl-big', s.big, inner);
    slideEl('p', 'sl-small', s.small, inner);
    slideEl('p', 'sl-foot', s.foot, inner);
  } else if (s.kind === 'words') {
    slideEl('p', 'sl-mid', s.big, inner);
  } else if (s.kind === 'versus') {
    slideEl('p', 'sl-small', s.q, inner);
    var row = slideEl('div', 'sl-versus', '', inner);
    slideEl('span', 'sl-chip', s.a, row);
    slideEl('span', 'sl-or', 'or', row);
    slideEl('span', 'sl-chip', s.b, row);
  } else if (s.kind === 'number') {
    slideEl('p', 'sl-huge', s.big, inner);
    slideEl('p', 'sl-small', s.small, inner);
  } else if (s.kind === 'key') {
    slideEl('p', 'sl-n', 'Idea ' + s.n, inner);
    slideEl('p', 'sl-big', s.big, inner);
    if (s.small) slideEl('p', 'sl-small', s.small, inner);
  } else if (s.kind === 'chain') {
    var ch = slideEl('div', 'sl-chain', '', inner);
    s.items.forEach(function (w, j) {
      if (j) slideEl('span', 'sl-arrow', '→', ch);
      slideEl('span', 'sl-chip', w, ch);
    });
    slideEl('p', 'sl-small', s.small, inner);
  } else if (s.kind === 'list') {
    slideEl('p', 'sl-n', s.head, inner);
    var ul = slideEl('ul', 'sl-list', '', inner);
    s.items.forEach(function (w) { slideEl('li', '', w, ul); });
  } else {
    inner.appendChild(drawing(s.kind));
  }
  return box;
}

function drawing(kind) {
  var svg = svgEl('svg', { viewBox: '0 0 640 360', class: 'sl-svg', role: 'img' });
  if (kind === 'doors') {
    svg.setAttribute('aria-label', 'Two doors. The front door is the login page: slow, and it locks you out. The back door is a stolen password file: no lock-out, guesses as fast as the computer goes.');
    [[40, 'Front door', 'the login page', ['a few guesses,', 'then locked out']], [340, 'Back door', 'a stolen file', ['no lock-out,', 'very fast guessing']]].forEach(function (d) {
      svgEl('rect', { x: d[0], y: 40, width: 260, height: 280, rx: 18, class: 'sl-card' }, svg);
      svgEl('rect', { x: d[0] + 95, y: 70, width: 70, height: 110, rx: 6, class: 'sl-door' }, svg);
      svgEl('circle', { cx: d[0] + 152, cy: 128, r: 5, class: 'sl-knob' }, svg);
      svgText(d[0] + 130, 222, d[1], 'sl-t1', svg);
      svgText(d[0] + 130, 254, d[2], 'sl-t2', svg);
      svgText(d[0] + 130, 284, d[3][0], 'sl-t3', svg);
      svgText(d[0] + 130, 306, d[3][1], 'sl-t3', svg);
    });
  } else if (kind === 'dials') {
    svg.setAttribute('aria-label', 'Two combination locks. Three dials give 1,000 combinations. Six dials give 1,000,000.');
    [[60, 3, '1,000'], [60 + 0, 6, '1,000,000']].forEach(function (d, row) {
      var y = row ? 210 : 60;
      for (var k = 0; k < d[1]; k++) {
        svgEl('rect', { x: d[0] + k * 62, y: y, width: 52, height: 76, rx: 10, class: 'sl-dial' }, svg);
        svgText(d[0] + k * 62 + 26, y + 52, String((k * 7 + 3) % 10), 'sl-digit', svg);
      }
      svgText(600, y + 50, d[2], 'sl-t1', svg, 'end');
      svgText(600, y + 80, d[1] + ' dials', 'sl-t3', svg, 'end');
    });
  } else if (kind === 'bars') {
    svg.setAttribute('aria-label', 'Time to try every password at 100 billion guesses a second, my made-up speed. 8 random characters: under a day. 4 random words: under a day. 6 random words: about 70,000 years.');
    var rows = [['8 random characters', 'under a day', 0.04], ['4 random words', 'under a day', 0.03], ['6 random words', 'about 70,000 years', 1]];
    rows.forEach(function (r, k) {
      var y = 50 + k * 96;
      svgText(40, y, r[0], 'sl-t2', svg, 'start');
      svgEl('rect', { x: 40, y: y + 14, width: 560, height: 30, rx: 6, class: 'sl-track' }, svg);
      svgEl('rect', { x: 40, y: y + 14, width: Math.max(10, 560 * r[2]), height: 30, rx: 6, class: k === 2 ? 'sl-bar sl-bar-on' : 'sl-bar' }, svg);
      svgText(k === 2 ? 586 : 70, y + 37, r[1], k === 2 ? 'sl-t3 sl-in-bar' : 'sl-t3', svg, k === 2 ? 'end' : 'start');
    });
    svgText(40, 340, 'At 100 billion guesses a second. My made-up speed.', 'sl-t4', svg, 'start');
  } else if (kind === 'rules') {
    svg.setAttribute('aria-label', 'What the guides say. CSA Singapore: at least 12 characters, long and random. NIST: at least 15 characters if the password is the only lock, and no forced regular changes.');
    [[40, 'CSA Singapore', ['at least 12 characters', 'long and random', 'don’t reuse']], [340, 'NIST (US)', ['at least 15 characters', 'if it’s the only lock', 'no forced changes']]].forEach(function (d) {
      svgEl('rect', { x: d[0], y: 50, width: 260, height: 260, rx: 18, class: 'sl-card' }, svg);
      svgText(d[0] + 130, 104, d[1], 'sl-t1', svg);
      d[2].forEach(function (line, k) { svgText(d[0] + 130, 166 + k * 44, line, 'sl-t3', svg); });
    });
  } else if (kind === 'dice') {
    svg.setAttribute('aria-label', 'Tonight: roll five dice, read them as a number such as 43612, look the number up on the EFF word list, write the word. Do it six times.');
    var faces = [4, 3, 6, 1, 2];
    var pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    faces.forEach(function (f, k) {
      var x = 70 + k * 104;
      svgEl('rect', { x: x, y: 40, width: 80, height: 80, rx: 14, class: 'sl-die' }, svg);
      pips[f].forEach(function (p) { svgEl('circle', { cx: x + 40 + p[0] * 20, cy: 80 + p[1] * 20, r: 7, class: 'sl-pip' }, svg); });
    });
    svgText(320, 180, '43612 → look it up → write the word', 'sl-t2', svg);
    svgText(320, 240, 'Do it 6 times.', 'sl-t1', svg);
    svgText(320, 300, 'One account only. Never post it.', 'sl-t3', svg);
  }
  return svg;
}
