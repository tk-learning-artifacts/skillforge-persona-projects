// Builds the printable secret-picture cards from the same pictures as the game.
(function () {
  var box = document.getElementById('cards');
  function card(title, rows, blank) {
    var c = document.createElement('section');
    c.className = 'pcard';
    var h = document.createElement('h3'); h.textContent = title; c.appendChild(h);
    var board = document.createElement('div'); board.className = 'board';
    var codes = document.createElement('div'); codes.className = 'codes';
    for (var r = 0; r < 8; r++) {
      var s = document.createElement('span');
      s.textContent = blank ? '__________' : encodeRow(rows[r]).join(' ');
      codes.appendChild(s);
    }
    var g = document.createElement('div'); g.className = 'pgrid';
    for (var i = 0; i < 64; i++) g.appendChild(document.createElement('i'));
    board.appendChild(codes); board.appendChild(g); c.appendChild(board);
    var p = document.createElement('p'); p.className = 'small';
    p.textContent = blank ? 'Draw a picture. Write each row’s numbers. Swap with another pair.' : 'First number is always white. Colour the black squares.';
    c.appendChild(p);
    box.appendChild(c);
  }
  ['cat', 'rocket', 'umbrella', 'ghost'].forEach(function (k) { card(PICTURES[k].name, PICTURES[k].rows); });
  card('Make your own', null, true);
})();
