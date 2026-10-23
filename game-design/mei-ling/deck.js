// The Make One deck, shared by the game and the printable cards.
// Every card is stored in twelfths, so 1/4 is 3 and 2/3 is 8.
var MakeOne = (function () {
  'use strict';
  var FULL = [
    { v: 6, n: 4 },  // 1/2
    { v: 4, n: 6 },  // 1/3
    { v: 8, n: 3 },  // 2/3
    { v: 3, n: 6 },  // 1/4
    { v: 9, n: 3 },  // 3/4
    { v: 2, n: 6 },  // 1/6
    { v: 10, n: 2 }, // 5/6
    { v: 1, n: 6 },  // 1/12
    { v: 5, n: 4 }   // 5/12
  ];
  // The starter deck: halves and quarters only.
  var STARTER = [{ v: 6, n: 6 }, { v: 3, n: 10 }, { v: 9, n: 4 }];
  var WORDS = { '1/2': 'one half', '1/3': 'one third', '2/3': 'two thirds', '1/4': 'one quarter',
    '3/4': 'three quarters', '1/6': 'one sixth', '5/6': 'five sixths', '1/12': 'one twelfth',
    '5/12': 'five twelfths', '1': 'one whole' };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  // Twelfths to simplest form: 9 becomes [3, 4].
  function simplest(k) {
    if (k === 0) return [0, 1];
    var g = gcd(k, 12);
    return [k / g, 12 / g];
  }
  function label(k) { var f = simplest(k); return f[1] === 1 ? String(f[0]) : f[0] + '/' + f[1]; }
  function word(k) { return WORDS[label(k)] || label(k); }

  function deck(starter) {
    var out = [];
    (starter ? STARTER : FULL).forEach(function (c) { for (var i = 0; i < c.n; i++) out.push(c.v); });
    return out;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // A fraction drawn as a stack, built with DOM nodes.
  function fracEl(k) {
    var f = simplest(k);
    if (f[1] === 1) { var w = document.createElement('span'); w.className = 'frac'; w.textContent = String(f[0]); return w; }
    return fracParts(f[0], f[1]);
  }
  function fracParts(top, bot) {
    var s = document.createElement('span'); s.className = 'frac';
    s.setAttribute('aria-label', top + ' over ' + bot);
    var t = document.createElement('span'); t.className = 'top'; t.textContent = String(top);
    var b = document.createElement('span'); b.className = 'bot'; b.textContent = String(bot);
    s.appendChild(t); s.appendChild(b);
    return s;
  }
  // A strip cut into the card's own number of parts, with the top shaded.
  function stripEl(k) {
    var f = simplest(k);
    var s = document.createElement('span'); s.className = 'strip'; s.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < f[1]; i++) { var c = document.createElement('i'); if (i < f[0]) c.className = 'on'; s.appendChild(c); }
    return s;
  }

  return { deck: deck, shuffle: shuffle, simplest: simplest, label: label, word: word,
           fracEl: fracEl, fracParts: fracParts, stripEl: stripEl, FULL: FULL, STARTER: STARTER };
})();
