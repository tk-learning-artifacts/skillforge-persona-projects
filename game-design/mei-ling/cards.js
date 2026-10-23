// Builds the strip mat and the 40 printable cards from the shared deck.
(function () {
  'use strict';
  var M = MakeOne;

  var mat = document.getElementById('mat');
  [1, 2, 3, 4, 6, 12].forEach(function (parts) {
    var label = document.createElement('span'); label.className = 'label';
    label.textContent = parts === 1 ? '1 whole' : parts === 2 ? 'Halves' : parts === 3 ? 'Thirds' : parts === 4 ? 'Quarters' : parts === 6 ? 'Sixths' : 'Twelfths';
    var strip = document.createElement('span'); strip.className = 'strip';
    for (var i = 0; i < parts; i++) {
      var c = document.createElement('i');
      c.textContent = parts === 1 ? '1' : '1/' + parts;
      strip.appendChild(c);
    }
    mat.appendChild(label); mat.appendChild(strip);
  });

  var deck = document.getElementById('deck');
  M.deck(false).forEach(function (v) {
    var card = document.createElement('div'); card.className = 'pcard';
    var tl = document.createElement('span'); tl.className = 'corner tl'; tl.textContent = M.label(v);
    var br = document.createElement('span'); br.className = 'corner br'; br.textContent = M.label(v);
    var big = document.createElement('span'); big.className = 'big'; big.appendChild(M.fracEl(v));
    var word = document.createElement('span'); word.className = 'word'; word.textContent = M.word(v);
    card.appendChild(tl); card.appendChild(big); card.appendChild(word); card.appendChild(M.stripEl(v)); card.appendChild(br);
    deck.appendChild(card);
  });

  document.getElementById('print').addEventListener('click', function () { window.print(); });
})();
