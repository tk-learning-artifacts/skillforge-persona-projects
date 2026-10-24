// Plan tester for one Second Round window. All inputs are guesses the
// reader can change; the presets match the scenario table above it.
(function () {
  var HOURS = 15;      // people-hours per window
  var KG_PER_ITEM = 0.2; // from 20 weighed items, 4.1 kg
  var PRESETS = {
    cautious: { donated: 50, usable: 70, sold: 40, swap: 15, price: 2, cost: 18 },
    expected: { donated: 80, usable: 80, sold: 55, swap: 20, price: 2, cost: 18 },
    hopeful: { donated: 110, usable: 85, sold: 65, swap: 15, price: 2, cost: 18 }
  };
  var keys = ['donated', 'usable', 'sold', 'swap', 'price', 'cost'];
  var inputs = {};
  keys.forEach(function (k) { inputs[k] = document.getElementById('in-' + k); });
  var $ = function (id) { return document.getElementById(id); };

  function money(v) {
    var neg = v < 0;
    var s = '$' + Math.abs(v).toFixed(Math.abs(v) % 1 ? 2 : 0);
    return neg ? '-' + s : s;
  }

  function setPreset(name) {
    var p = PRESETS[name];
    keys.forEach(function (k) { inputs[k].value = p[k]; });
    markPreset(name);
    update();
  }

  function markPreset(name) {
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === name));
    });
  }

  function update() {
    var v = {};
    keys.forEach(function (k) { v[k] = Number(inputs[k].value); });
    // Sold and swapped can't add up to more than every usable item.
    if (v.sold + v.swap > 100) { v.swap = 100 - v.sold; inputs.swap.value = v.swap; }

    $('out-donated').textContent = v.donated;
    $('out-usable').textContent = v.usable + '%';
    $('out-sold').textContent = v.sold + '%';
    $('out-swap').textContent = v.swap + '%';
    $('out-price').textContent = money(v.price);
    $('out-cost').textContent = money(v.cost);

    var usable = Math.round(v.donated * v.usable / 100);
    var sold = Math.round(usable * v.sold / 100);
    var swapped = Math.round(usable * v.swap / 100);
    var revenue = sold * v.price;
    var surplus = revenue - v.cost;
    var reused = sold + swapped;

    $('r-usable').textContent = usable;
    $('r-sold').textContent = sold;
    $('r-revenue').textContent = money(revenue);
    $('r-surplus').textContent = money(surplus);
    $('r-surplus-box').className = surplus < 0 ? 'neg' : '';
    $('r-break').textContent = v.price > 0 ? Math.ceil(v.cost / v.price) : 'never';
    $('r-reused').textContent = reused;
    $('r-kg').textContent = (reused * KG_PER_ITEM).toFixed(1);
    $('r-hour').textContent = money(Math.round(surplus / HOURS * 100) / 100);

    var msg;
    if (v.price === 0) msg = 'At $0 this is a free swap. It meets the social aim, but someone else must pay the $' + v.cost + ' of costs.';
    else if (surplus < 0) msg = 'This window loses ' + money(-surplus) + '. You need ' + Math.ceil(v.cost / v.price) + ' sales to cover costs, and you have ' + sold + '.';
    else if (sold < 25) msg = 'It covers its costs, but ' + sold + ' sales misses the January gate of 25. The plan says: try $1, or go swap-only.';
    else msg = 'It covers its costs and passes the January gate of 25 sales. ' + money(surplus) + ' goes to the welfare fund.';
    $('verdict').textContent = msg;
  }

  keys.forEach(function (k) {
    inputs[k].addEventListener('input', function () { markPreset(''); update(); });
  });
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { setPreset(b.getAttribute('data-preset')); });
  });
  setPreset('expected');
})();
