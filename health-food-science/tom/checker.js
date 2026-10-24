// Water First drink checker. Type in what a drink label says and see its
// Nutri-Grade, its sugar in teaspoons, and whether it fits the school rules.
// Grade cut-offs: HPB's Nutri-Grade page. School rules: HPB's Healthy Meals in
// Schools Programme guidelines (updated 30 July 2026).
(function () {
  'use strict';

  // Made-up example drinks. Real labels differ, so students should check their own.
  var PRESETS = [
    { name: 'Bottled water', ml: 500, sugar: 0, fat: 0, sweetener: false, price: 1.0 },
    { name: 'Packet lemon tea', ml: 250, sugar: 9.5, fat: 0, sweetener: false, price: 1.2 },
    { name: 'Soya milk, less sugar', ml: 250, sugar: 4.5, fat: 0.3, sweetener: false, price: 1.4 },
    { name: 'Cola can', ml: 320, sugar: 10.6, fat: 0, sweetener: false, price: 1.5 },
    { name: 'Diet cola can', ml: 320, sugar: 0, fat: 0, sweetener: true, price: 1.5 },
    { name: 'Milk tea cup', ml: 500, sugar: 8.5, fat: 1.6, sweetener: false, price: 4.5 }
  ];
  var SPOON_G = 5;      // the module task counts one teaspoon as 5 g
  var WHO_LIMIT_G = 50; // WHO: under 10% of energy, about 50 g a day

  var $ = function (id) { return document.getElementById(id); };
  var fields = { ml: $('f-ml'), sugar: $('f-sugar'), fat: $('f-fat'), price: $('f-price') };
  var sweet = $('f-sweet');
  var presetBox = $('presets');

  function num(input) {
    var v = parseFloat(input.value);
    return isFinite(v) && v >= 0 ? v : 0;
  }

  function gradeFor(sugar, fat, sweetener) {
    var s = sugar <= 1 && !sweetener ? 'A' : sugar <= 5 ? 'B' : sugar <= 10 ? 'C' : 'D';
    var f = fat <= 0.7 ? 'A' : fat <= 1.2 ? 'B' : fat <= 2.8 ? 'C' : 'D';
    return s > f ? s : f; // the poorer of the two grades
  }

  function fmt(n, d) { return n.toFixed(d).replace(/\.0+$/, ''); }

  function verdict(list, ok, title, text) {
    var li = document.createElement('li');
    li.className = ok ? 'yes' : 'no';
    var b = document.createElement('strong');
    b.textContent = (ok ? '\u2713 ' : '\u2717 ') + title;
    li.appendChild(b);
    li.appendChild(document.createTextNode(' ' + text));
    list.appendChild(li);
  }

  function update() {
    var ml = num(fields.ml), sugar = num(fields.sugar), fat = num(fields.fat), price = num(fields.price);
    var g = gradeFor(sugar, fat, sweet.checked);
    var grade = $('grade');
    grade.textContent = g;
    grade.setAttribute('data-g', g);
    grade.setAttribute('aria-label', 'Nutri-Grade ' + g);

    var packSugar = sugar * ml / 100;
    var spoons = Math.round(packSugar / SPOON_G * 2) / 2; // to the nearest half spoon
    $('o-sugar').textContent = fmt(packSugar, 1) + ' g of sugar in the pack. About ' + fmt(spoons, 1) + ' teaspoons.';
    $('o-who').textContent = 'That is ' + Math.round(packSugar / WHO_LIMIT_G * 100) + '% of the WHO daily limit of about 50 g.';
    $('o-price').textContent = price > 0 && ml > 0
      ? 'Price: $' + price.toFixed(2) + ', or ' + Math.round(price / ml * 100 * 100) + ' cents per 100 ml.'
      : 'Add a price to compare value.';

    var row = $('spoons');
    while (row.firstChild) row.removeChild(row.firstChild);
    var whole = Math.floor(spoons);
    for (var i = 0; i < Math.min(whole, 40); i++) {
      var s = document.createElement('span');
      s.className = 'spoon';
      row.appendChild(s);
    }
    if (spoons > whole && whole < 40) {
      var p = document.createElement('span');
      p.className = 'spoon part';
      row.appendChild(p);
    }

    var list = $('verdicts');
    while (list.firstChild) list.removeChild(list.firstChild);
    var labelNeeded = g === 'C' || g === 'D';
    verdict(list, !labelNeeded, labelNeeded ? 'Must show the label.' : 'No label needed.',
      labelNeeded ? 'Grade C and D drinks must show the Nutri-Grade label.' : 'A and B labels are optional, so many A and B drinks show none.');
    verdict(list, g !== 'D', g === 'D' ? 'Cannot be advertised.' : 'Can be advertised.', 'Only grade D drinks are banned from ads.');
    var calorieFree = sugar === 0 && fat === 0 && !sweet.checked;
    var sizeOk = ml <= 330 || calorieFree;
    verdict(list, sizeOk, sizeOk ? 'Pack size fits school rules.' : 'Too big for a school canteen.',
      calorieFree ? 'Calorie-free drinks like water have no size limit.' : 'School drinks must be 330 ml or less. This one is ' + fmt(ml, 0) + ' ml.');
    verdict(list, !sweet.checked, sweet.checked ? 'Sweetener: not allowed in schools.' : 'No sweetener.',
      sweet.checked ? 'Schools may not sell drinks with sweeteners, even sugar-free ones.' : 'Schools do not allow sweeteners, and this drink has none.');
    var freshOk = sugar <= 5 && fat <= 1.2;
    verdict(list, freshOk, freshOk ? 'Within the school limit for freshly made drinks.' : 'Over the school limit for freshly made drinks.',
      'Freshly made school drinks need 5 g sugar or less, and 1.2 g saturated fat or less, per 100 ml.');

    $('live').textContent = 'Grade ' + g + '. ' + fmt(spoons, 1) + ' teaspoons of sugar in the pack.';
  }

  function load(p, btn) {
    fields.ml.value = p.ml; fields.sugar.value = p.sugar; fields.fat.value = p.fat; fields.price.value = p.price.toFixed(2);
    sweet.checked = p.sweetener;
    var all = presetBox.querySelectorAll('button');
    for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', all[i] === btn ? 'true' : 'false');
    update();
  }

  PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.name;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { load(p, b); });
    presetBox.appendChild(b);
    if (i === 1) load(p, b);
  });

  function clearPressed() {
    var all = presetBox.querySelectorAll('button');
    for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', 'false');
  }
  Object.keys(fields).forEach(function (k) {
    fields[k].addEventListener('input', function () { clearPressed(); update(); });
  });
  sweet.addEventListener('change', function () { clearPressed(); update(); });
})();
