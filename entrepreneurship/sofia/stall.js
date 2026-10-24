// Stall Day: a pretend showcase sale. The model is made up, tuned so that
// $4 with a pre-order sheet lands near our camp's real Friday.
(function () {
  var FAMILIES = 38;
  var UNIT = 1.10, SETUP = 14;
  var OUR_PROFIT = 74.80;
  var state = { price: 4, sheet: true, pre: null, spares: 6, print: 30 };
  var won = {};
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wantChance(price) { return Math.max(0, Math.min(1, 1.24 - 0.16 * price)); }
  function money(v) { return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2); }

  // Who wants a deck, and who signs the sheet.
  function rollFamilies(price) {
    var fams = [];
    for (var i = 0; i < FAMILIES; i++) {
      var wants = Math.random() < wantChance(price);
      var qty = wants ? (Math.random() < 0.24 ? 2 : 1) : 0;
      fams.push({ qty: qty, pre: 0 });
    }
    return fams;
  }
  function signSheet(fams) {
    var total = 0;
    fams.forEach(function (f) { if (f.qty && Math.random() < 0.9) { f.pre = f.qty; total += f.qty; } });
    return total;
  }

  // One showcase day. Returns counts and a status for every visitor.
  function runDay(price, sheet, fams, printed) {
    var preTotal = 0;
    fams.forEach(function (f) { preTotal += f.pre; });
    var stock = printed - preTotal;
    var visitors = fams.map(function (f) {
      if (f.pre) return { status: 'pre', qty: f.pre };
      var comes = Math.random() < 0.85;
      return { status: f.qty && comes ? 'want' : 'no', qty: f.qty };
    });
    var walk = 4 + Math.floor(Math.random() * 7);
    for (var w = 0; w < walk; w++) {
      visitors.push({ status: Math.random() < wantChance(price) * 0.5 ? 'want' : 'no', qty: 1, walk: true });
    }
    // Day buyers arrive in a random order.
    var order = visitors.map(function (v, i) { return i; }).filter(function (i) { return visitors[i].status === 'want'; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var dayBought = 0, missed = 0;
    order.forEach(function (idx) {
      var v = visitors[idx];
      var got = Math.min(v.qty, Math.max(0, stock));
      stock -= got; dayBought += got; missed += v.qty - got;
      v.status = got ? 'yes' : 'miss';
    });
    var sold = preTotal + dayBought;
    var cost = printed * UNIT + SETUP;
    return { visitors: visitors, sold: sold, pre: preTotal, day: dayBought, missed: missed,
      left: printed - sold, printed: printed, revenue: sold * price, cost: cost, profit: sold * price - cost };
  }

  function printed() { return state.sheet ? state.pre + state.spares : state.print; }

  function syncControls() {
    document.querySelectorAll('[data-price]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-price')) === state.price)); });
    document.querySelectorAll('[data-sheet]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-sheet') === 'yes') === state.sheet)); });
    $('sheet-box').hidden = !state.sheet;
    var input = $('print-in');
    if (state.sheet) {
      $('print-legend').textContent = '3. Spare decks on top of the pre-orders';
      input.max = 20; input.value = state.spares;
      $('print-out').textContent = state.spares;
      $('print-hint').textContent = state.pre === null ? 'Put the sheet up first, so you know your pre-orders.'
        : 'You will print ' + printed() + ' decks: ' + state.pre + ' pre-ordered and ' + state.spares + ' spare.';
    } else {
      $('print-legend').textContent = '3. How many decks will you print?';
      input.max = 60; input.value = state.print;
      $('print-out').textContent = state.print;
      $('print-hint').textContent = 'No sheet, so you are guessing. Printing ' + state.print + ' costs ' + money(state.print * UNIT + SETUP) + ' with set-up.';
    }
    $('run').disabled = state.sheet && state.pre === null;
  }

  var families = null;
  function resetSheet() { state.pre = null; families = null; $('sheet-result').textContent = ''; }

  document.querySelectorAll('[data-price]').forEach(function (b) {
    b.addEventListener('click', function () { state.price = Number(b.getAttribute('data-price')); resetSheet(); syncControls(); });
  });
  document.querySelectorAll('[data-sheet]').forEach(function (b) {
    b.addEventListener('click', function () { state.sheet = b.getAttribute('data-sheet') === 'yes'; resetSheet(); syncControls(); });
  });
  $('sheet-run').addEventListener('click', function () {
    families = rollFamilies(state.price);
    state.pre = signSheet(families);
    var who = families.filter(function (f) { return f.pre; }).length;
    $('sheet-result').textContent = 'Pre-orders: ' + state.pre + ' decks from ' + who + ' families, at ' + money(state.price).replace('.00', '') + ' each.';
    syncControls();
  });
  function setPrint(v) {
    var max = state.sheet ? 20 : 60;
    v = Math.max(0, Math.min(max, v));
    if (state.sheet) state.spares = v; else state.print = v;
    syncControls();
  }
  $('print-in').addEventListener('input', function () { setPrint(Number(this.value)); });
  $('minus').addEventListener('click', function () { setPrint((state.sheet ? state.spares : state.print) - 1); });
  $('plus').addEventListener('click', function () { setPrint((state.sheet ? state.spares : state.print) + 1); });

  function tile(n, label, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    var b = document.createElement('b'); b.textContent = n;
    var s = document.createElement('span'); s.textContent = label;
    d.appendChild(b); d.appendChild(s);
    return d;
  }

  function award(key) {
    if (won[key]) return;
    won[key] = true;
    var li = document.querySelector('[data-badge="' + key + '"]');
    if (li) li.className = 'won';
  }

  function coachFor(r) {
    if (r.profit < 0) return 'A loss of ' + money(-r.profit) + '. Set-up costs and unsold decks add up fast.';
    if (r.left >= 8) return r.left + ' decks left over. That is the sticker pack pile all over again. Ask first, make second.';
    if (r.missed >= 3) return r.missed + ' decks\' worth of buyers went home empty-handed. Was that worth the saving on spares?';
    if (r.profit > OUR_PROFIT) return 'You beat my campers. Run it again: was that a plan, or a lucky day?';
    return 'A good day. Run it again: does it hold, or was it luck?';
  }

  $('run').addEventListener('click', function () {
    if (!state.sheet) families = rollFamilies(state.price);
    var r = runDay(state.price, state.sheet, families, printed());
    $('day').hidden = false;
    var crowd = $('crowd');
    crowd.textContent = '';
    $('score').textContent = '';
    $('coach').textContent = '';
    crowd.setAttribute('aria-label', r.visitors.length + ' visitors. ' + r.pre + ' decks collected from pre-orders, ' + r.day + ' bought on the day, ' + r.missed + ' wanted but sold out.');
    var GLYPH = { pre: '✓', yes: '✓', miss: '!', no: '-' };
    var dots = r.visitors.map(function (v) {
      var d = document.createElement('span');
      d.className = 'fam' + (v.walk ? ' walk' : '');
      d.dataset.final = 'fam ' + (v.status === 'pre' ? 'yes pre' : v.status) + (v.walk ? ' walk' : '');
      d.dataset.glyph = GLYPH[v.status];
      crowd.appendChild(d);
      return d;
    });
    var i = 0;
    function reveal() {
      if (i < dots.length) {
        dots[i].className = dots[i].dataset.final;
        dots[i].textContent = dots[i].dataset.glyph;
        i++;
        if (reduceMotion) reveal(); else setTimeout(reveal, 45);
        return;
      }
      var score = $('score');
      score.appendChild(tile(r.printed, 'printed'));
      score.appendChild(tile(r.sold, 'sold'));
      score.appendChild(tile(r.left, 'left over'));
      score.appendChild(tile(r.missed, 'turned away'));
      score.appendChild(tile(money(r.revenue), 'money in'));
      score.appendChild(tile(money(r.cost), 'costs'));
      score.appendChild(tile(money(r.profit), 'profit', r.profit < 0 ? 'loss' : ''));
      $('coach').textContent = coachFor(r);
      if (r.profit > OUR_PROFIT) award('beat');
      if (r.left === 0 && r.missed === 0) award('tidy');
      if (!state.sheet && r.profit > 0) award('brave');
    }
    reveal();
    if (state.sheet) resetSheet();
    syncControls();
  });

  $('run20').addEventListener('click', function () {
    var rows = [];
    var tally = { profit: 0, left: 0, missed: 0, loss: 0, best: -Infinity, worst: Infinity };
    for (var d = 0; d < 20; d++) {
      var fams = rollFamilies(state.price);
      var p = state.print;
      if (state.sheet) p = signSheet(fams) + state.spares;
      var r = runDay(state.price, state.sheet, fams, p);
      tally.profit += r.profit; tally.left += r.left; tally.missed += r.missed;
      if (r.profit < 0) tally.loss++;
      tally.best = Math.max(tally.best, r.profit); tally.worst = Math.min(tally.worst, r.profit);
    }
    var avg = tally.profit / 20;
    rows.push(['Average profit', money(avg)]);
    rows.push(['Best day', money(tally.best)]);
    rows.push(['Worst day', money(tally.worst)]);
    rows.push(['Days with a loss', tally.loss + ' of 20']);
    rows.push(['Average decks left over', (tally.left / 20).toFixed(1)]);
    rows.push(['Average decks turned away', (tally.missed / 20).toFixed(1)]);
    var body = document.querySelector('#many-table tbody');
    body.textContent = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var a = document.createElement('td'); a.textContent = row[0];
      var b = document.createElement('td'); b.className = 'n'; b.textContent = row[1];
      tr.appendChild(a); tr.appendChild(b); body.appendChild(tr);
    });
    $('many').hidden = false;
    var setup = (state.sheet ? 'With a sheet and ' + state.spares + ' spares' : 'With no sheet and ' + state.print + ' decks printed') + ' at $' + state.price + '.';
    $('many-coach').textContent = setup + ' Try another price and compare the averages.';
    if (state.sheet) bestByPrice[state.price] = avg;
    // Won once three prices are tried with a sheet and the best average is
    // at $4 or $5, where the model's best price sits.
    var tried = Object.keys(bestByPrice);
    if (tried.length >= 3) {
      var top = tried.reduce(function (a, b) { return bestByPrice[a] >= bestByPrice[b] ? a : b; });
      if (top === '4' || top === '5') award('best');
    }
  });
  var bestByPrice = {};

  syncControls();
})();
