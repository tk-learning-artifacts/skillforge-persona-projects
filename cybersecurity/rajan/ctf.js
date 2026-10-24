// Six Flags Before the Bell: the challenge board.
// Flags are checked against hashes, so reading this file does not give them
// away directly. You may read it anyway: it is allowed here.
(function () {
  'use strict';

  // cyrb53, a small non-cryptographic string hash. Good enough to keep flags
  // out of plain sight in a class CTF. Not good enough for real passwords.
  function cyrb53(str, seed) {
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  var HASH = { 1: '1gasq4ded9u', 2: '1tkobla2d23', 3: 'gxj35ojcc7', 4: '2e4641a9g2c', 5: '1e6tdnn1hzj', 6: '8bjk82twv2' };
  var HINT_COST = 20;
  var KEY = 'rajan-ctf-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  var S = load();
  S.solved = S.solved || {}; S.hints = S.hints || {}; S.team = S.team || '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: keep going */ } }

  function normalise(id, text) {
    var t = text.trim().toLowerCase().replace(/\s+/g, '');
    if (id === 2) {
      t = t.replace(/^sf\{/, '').replace(/\}$/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return 'sf{' + t + '}';
    }
    if (t.indexOf('sf{') !== 0) t = 'sf{' + t.replace(/^\{/, '');
    if (t.charAt(t.length - 1) !== '}') t += '}';
    return t;
  }

  var el = function (id) { return document.getElementById(id); };
  var chals = Array.prototype.slice.call(document.querySelectorAll('details.chal'));
  var tpl = el('chal-tools');

  function points() {
    return chals.reduce(function (n, d) {
      var id = d.dataset.id;
      if (!S.solved[id]) return n;
      return n + Number(d.dataset.pts) - (S.hints[id] ? HINT_COST : 0);
    }, 0);
  }
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function renderScore() {
    el('points').textContent = points();
    el('count').textContent = Object.keys(S.solved).length;
    var end = S.done || Date.now();
    el('clock').textContent = S.start ? fmt(end - S.start) : '0:00';
  }

  chals.forEach(function (d) {
    var id = Number(d.dataset.id);
    var body = d.querySelector('.body');
    body.appendChild(tpl.content.cloneNode(true));
    var input = body.querySelector('.flag');
    var submit = body.querySelector('.submit');
    var hintBtn = body.querySelector('.get-hint');
    var msg = body.querySelector('.msg');
    var hint = body.querySelector('.hint');
    input.setAttribute('aria-label', 'Flag for challenge ' + id);

    function paint() {
      var done = !!S.solved[id];
      d.classList.toggle('solved', done);
      var sum = d.querySelector('summary');
      var badge = sum.querySelector('.badge');
      if (done && !badge) {
        badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Solved';
        sum.insertBefore(badge, sum.querySelector('.pts'));
      }
      if (S.hints[id]) { hint.hidden = false; hintBtn.disabled = true; hintBtn.textContent = 'Hint shown'; }
      if (done) {
        input.disabled = true; submit.disabled = true; hintBtn.disabled = true;
        msg.className = 'msg ok';
        msg.textContent = 'Solved at ' + fmt(S.solved[id] - S.start) + '.';
      }
    }

    function check() {
      if (!input.value.trim() || S.solved[id]) return;
      if (!S.start) S.start = Date.now();
      if (cyrb53(normalise(id, input.value), 7155) === HASH[id]) {
        S.solved[id] = Date.now();
        if (Object.keys(S.solved).length === chals.length) S.done = Date.now();
        save(); paint(); renderScore();
      } else {
        save();
        msg.className = 'msg no';
        msg.textContent = 'Not that one. Check every character, then try again.';
      }
    }
    submit.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    hintBtn.addEventListener('click', function () { S.hints[id] = true; save(); paint(); renderScore(); });
    paint();
  });

  var team = el('team');
  team.value = S.team;
  team.addEventListener('input', function () { S.team = team.value; save(); });
  el('reset').addEventListener('click', function () {
    if (!window.confirm('Clear every flag and hint on this device?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
    window.location.reload();
  });
  renderScore();
  setInterval(renderScore, 1000);

  // Challenge 3: the shift tool.
  var cipher = el('ciphertext').textContent;
  var shift = el('shift'), shifted = el('shifted'), shiftN = el('shift-n');
  function back(text, k) {
    return text.replace(/[A-Z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 65 - k + 26) % 26 + 65); });
  }
  function drawShift() { shiftN.textContent = shift.value; shifted.textContent = back(cipher, Number(shift.value)); }
  shift.addEventListener('input', drawShift);
  drawShift();

  // Challenge 6: a passphrase checker. Length and the blocklist follow NIST
  // SP 800-63B. The other checks are mine.
  var COMMON = ['password', 'passw0rd', '123456', '12345678', '123456789', 'qwerty', 'qwertyuiop', 'abc123', 'iloveyou',
    'admin', 'letmein', 'welcome', 'football', 'monkey', 'dragon', 'sunshine', 'princess', 'singapore', '111111', '000000'];
  var SECRET = [1, 7, 17, 13, 1, 28, 6, 53, 3, 11, 19, 21, 25, 62, 13, 30, 4, 28, 4, 28, 15];
  function reveal() { var k = 'rajan'; return SECRET.map(function (c, i) { return String.fromCharCode(c ^ k.charCodeAt(i % 5)); }).join(''); }

  var pass = el('pass'), checks = el('checks'), passResult = el('pass-result');
  var RULES = [
    { text: 'At least 15 characters long (NIST, for a password used on its own)',
      ok: function (p) { return p.length >= 15; } },
    { text: 'Not on a list of common passwords, and does not contain one (NIST)',
      ok: function (p) { var q = p.toLowerCase().replace(/[^a-z0-9]/g, ''); return q.length > 0 && !COMMON.some(function (c) { return q.indexOf(c) >= 0; }); } },
    { text: 'No long runs, like aaaa or 1234 (my check)',
      ok: function (p) { return p.length > 0 && !/(.)\1{3}/.test(p) && !/(0123|1234|2345|3456|4567|5678|6789|abcd)/i.test(p); } },
    { text: 'Does not use your pair name (my check)',
      ok: function (p) { var t = (S.team || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return p.length > 0 && (t.length < 3 || p.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(t) < 0); } },
    { text: 'At least 3 words, split by spaces or dashes (my class rule, and NIST would not ask for it)',
      ok: function (p) { return p.split(/[\s\-_]+/).filter(function (w) { return /[a-z]{3,}/i.test(w); }).length >= 3; } }
  ];
  function drawChecks() {
    var p = pass.value;
    while (checks.firstChild) checks.removeChild(checks.firstChild);
    var all = true;
    RULES.forEach(function (r) {
      var ok = r.ok(p); all = all && ok;
      var li = document.createElement('li');
      li.className = ok ? 'pass' : 'fail';
      li.textContent = r.text + (ok ? ': yes' : ': not yet');
      checks.appendChild(li);
    });
    passResult.textContent = all ? 'Accepted. Your flag is ' + reveal() : '';
  }
  pass.addEventListener('input', drawChecks);
  drawChecks();
}());
