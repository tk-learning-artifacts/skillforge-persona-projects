// A naive Bayes text model. It counts how often each word appeared in spam
// and in normal texts, then weighs the words of a new message.
(function () {
  'use strict';
  var base = SMS_MODEL;
  var m, added = [];

  function reset() {
    m = { docs: { spam: base.docs.spam, ham: base.docs.ham }, words: {}, tot: [0, 0] };
    Object.keys(base.words).forEach(function (w) {
      var c = base.words[w];
      m.words[w] = [c[0], c[1]];
      m.tot[0] += c[0]; m.tot[1] += c[1];
    });
    added = [];
  }

  function tokens(text) {
    return text.toLowerCase().replace(/[0-9]{5,}/g, ' longnumber ').match(/[a-z]+|[0-9]+|[£$]/g) || [];
  }

  function weigh(w) {
    var c = m.words[w], V = Object.keys(m.words).length;
    return Math.log((c[0] + 1) / (m.tot[0] + V)) - Math.log((c[1] + 1) / (m.tot[1] + V));
  }

  function score(text) {
    var z = Math.log(m.docs.spam / m.docs.ham);
    var parts = {}, unknown = [];
    tokens(text).forEach(function (w) {
      if (!m.words[w]) { if (unknown.indexOf(w) < 0) unknown.push(w); return; }
      var k = weigh(w);
      z += k;
      if (!parts[w]) parts[w] = { w: w, k: 0, n: 0 };
      parts[w].k += k; parts[w].n++;
    });
    var p = 1 / (1 + Math.exp(-z));
    var list = Object.keys(parts).map(function (w) { return parts[w]; })
      .sort(function (a, b) { return Math.abs(b.k) - Math.abs(a.k); });
    return { p: p, parts: list, unknown: unknown };
  }

  function pct(p) {
    if (p > 0.999) return 'over 99.9%';
    if (p < 0.001) return 'under 0.1%';
    return (p * 100).toFixed(1) + '%';
  }
  function label(w) { return w === 'longnumber' ? '[long number]' : w; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  window.SmsModel = { score: score, tokens: tokens, reset: reset };
  reset();
  if (!document.getElementById('msg')) return;

  // ---------- Try it ----------
  var live = document.getElementById('live');
  var msg = document.getElementById('msg');

  function check() {
    var text = msg.value.trim();
    if (!text) { live.textContent = 'Type or pick a message first.'; return; }
    var r = score(text);
    var scam = r.p >= 0.5;
    var out = document.getElementById('out');
    out.hidden = false;
    out.className = 'out ' + (scam ? 'is-scam' : 'is-ok');
    document.getElementById('verdict').textContent = scam ? 'Looks like spam' : 'Looks normal';
    document.getElementById('prob').textContent = 'Spam score: ' + pct(r.p);
    document.getElementById('meter').style.width = Math.max(1, Math.round(r.p * 100)) + '%';
    var why = document.getElementById('why');
    why.textContent = '';
    var max = r.parts.reduce(function (a, x) { return Math.max(a, Math.abs(x.k)); }, 0.01);
    r.parts.slice(0, 12).forEach(function (x) {
      var c = m.words[x.w];
      var li = el('li', x.k > 0 ? 'push-spam' : 'push-ok');
      li.appendChild(el('code', '', label(x.w) + (x.n > 1 ? ' ×' + x.n : '')));
      var bar = el('span', 'wbar');
      var fill = el('span', 'wfill');
      fill.style.width = Math.max(4, Math.round(Math.abs(x.k) / max * 100)) + '%';
      bar.appendChild(fill);
      li.appendChild(bar);
      li.appendChild(el('span', 'wnote', (x.k > 0 ? 'spam side. ' : 'normal side. ') + 'In ' + c[0] + ' spam and ' + c[1] + ' normal uses.'));
      why.appendChild(li);
    });
    var unk = document.getElementById('unknown');
    unk.textContent = r.unknown.length ? 'Words it has never seen, so it ignores them: ' + r.unknown.map(label).join(', ') + '.' : 'It has seen every word in this message.';
    live.textContent = (scam ? 'Looks like spam. ' : 'Looks normal. ') + 'Spam score ' + pct(r.p) + '.';
  }
  document.getElementById('check').addEventListener('click', check);
  Array.prototype.forEach.call(document.querySelectorAll('[data-sample]'), function (b) {
    b.addEventListener('click', function () { msg.value = b.getAttribute('data-sample'); check(); });
  });

  // ---------- The audit ----------
  function runAudit() {
    var body = document.getElementById('audit-body');
    body.textContent = '';
    var caught = 0, scams = 0, okRight = 0, oks = 0;
    AUDIT.forEach(function (a) {
      var r = score(a.text);
      var says = r.p >= 0.5 ? 'scam' : 'normal';
      var right = says === a.truth;
      if (a.truth === 'scam') { scams++; if (right) caught++; } else { oks++; if (right) okRight++; }
      var tr = el('tr', right ? '' : 'miss');
      [['', a.kind, 'Type'], ['msg-cell', a.text, 'Message'], ['', a.truth === 'scam' ? 'Scam' : 'Normal', 'Really'],
        ['num', pct(r.p), 'Spam score'], [right ? 'yes' : 'no', right ? 'Right' : 'Wrong', 'Model']].forEach(function (c) {
        var td = el('td', c[0], c[1]);
        td.setAttribute('data-l', c[2]);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    document.getElementById('audit-sum').textContent = 'Caught ' + caught + ' of ' + scams + ' scams. Left ' + okRight + ' of ' + oks + ' normal messages alone.';
    document.getElementById('audit-wrap').hidden = false;
    live.textContent = 'Audit done. Caught ' + caught + ' of ' + scams + ' scams.';
    pairs();
  }
  document.getElementById('run-audit').addEventListener('click', runAudit);

  function pairs() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pair]'), function (cell) {
      cell.textContent = pct(score(cell.getAttribute('data-pair')).p);
    });
  }
  pairs();

  // ---------- Teach it more ----------
  function showAdded() {
    var ul = document.getElementById('added');
    ul.textContent = '';
    added.forEach(function (a) {
      var li = el('li');
      li.appendChild(el('b', '', a.label === 'spam' ? 'Spam: ' : 'Normal: '));
      li.appendChild(document.createTextNode(a.text));
      ul.appendChild(li);
    });
    document.getElementById('count').textContent = (m.docs.spam + m.docs.ham) + ' training messages: ' + m.docs.spam + ' spam, ' + m.docs.ham + ' normal. You added ' + added.length + '.';
  }
  var PRESET = [
    'Earn $300 a day from home. Simple online tasks, no experience needed. WhatsApp us now.',
    'Part-time job offer: rate products online and get paid daily. Message me to join.',
    'Hiring now! Like videos and earn commission. Only a few places left, reply to start.'
  ];
  function learn(lab, t) {
    var i = lab === 'spam' ? 0 : 1;
    m.docs[lab]++;
    tokens(t).forEach(function (w) {
      if (!m.words[w]) m.words[w] = [0, 0];
      m.words[w][i]++; m.tot[i]++;
    });
    added.push({ label: lab, text: t });
  }
  function after(text) {
    showAdded();
    if (!document.getElementById('audit-wrap').hidden) runAudit(); else pairs();
    live.textContent = text;
  }
  document.getElementById('teach').addEventListener('click', function () {
    var t = document.getElementById('teach-text').value.trim();
    var lab = document.getElementById('teach-label').value;
    if (!t) { live.textContent = 'Type a made-up message to teach it.'; return; }
    learn(lab, t);
    document.getElementById('teach-text').value = '';
    after('Added as ' + (lab === 'spam' ? 'spam' : 'normal') + '. The audit table has been updated if it is open.');
  });
  document.getElementById('preset').addEventListener('click', function () {
    PRESET.forEach(function (t) { learn('spam', t); });
    after('Added my 3 made-up job scams as spam.');
  });
  document.getElementById('reset').addEventListener('click', function () {
    reset(); showAdded();
    if (!document.getElementById('audit-wrap').hidden) runAudit(); else pairs();
    live.textContent = 'Back to the original model.';
  });
  document.getElementById('download').addEventListener('click', function () {
    var out = JSON.parse(JSON.stringify(base));
    out.name = base.name + ', with ' + added.length + ' added messages';
    out.docs = m.docs; out.words = m.words;
    out.added = added;
    delete out.test_result;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = 'my-sms-model.json';
    document.body.appendChild(a); a.click(); a.remove();
    live.textContent = 'Saved my-sms-model.json.';
  });
  showAdded();
})();
