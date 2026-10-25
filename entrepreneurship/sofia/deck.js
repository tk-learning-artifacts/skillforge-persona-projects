// Lays out the Queue Quest deck on screen and as A4 print sheets.
(function () {
  var HOW_TO = '<article class="qq-card cat-move" aria-label="How to play">' +
    '<header>' + QQ.icon('move', 22) + '<span>How to play</span></header>' +
    '<h4>Queue Quest</h4>' +
    '<p>Pick any card. The grown-up reads the rule. Play it. Then pick the next one.</p>' +
    '<p><b>Look · Talk · Move · Listen</b><br>The colour, the icon and the word show the type.</p>' +
    '<footer><span>20 games</span><span>For waiting</span></footer></article>';
  var BLANK = '<div class="qq-blank" aria-label="Blank card to make your own game"><span>Make your own</span>' +
    '<div class="draw">Draw it here</div><div class="lines"></div></div>';
  var BACK = '<div class="qq-back"><b>Queue<br>Quest</b><span>20 games for waiting</span></div>';

  var faces = QQ.CARDS.map(QQ.face);
  var all = faces.concat([HOW_TO, BLANK, BLANK, BLANK]);

  document.getElementById('v2-sample').innerHTML = QQ.face(QQ.CARDS[0]);
  document.getElementById('deck').innerHTML = all.join('') + BACK;

  // Print: 12 cards a sheet, then one sheet of backs.
  var backs = [];
  for (var i = 0; i < 12; i++) backs.push(BACK);
  document.getElementById('print-sheets').innerHTML =
    '<div class="print-sheet">' + all.slice(0, 12).join('') + '</div>' +
    '<div class="print-sheet">' + all.slice(12, 24).join('') + '</div>' +
    '<div class="print-sheet">' + backs.join('') + '</div>';

  document.getElementById('print').addEventListener('click', function () { window.print(); });
})();
