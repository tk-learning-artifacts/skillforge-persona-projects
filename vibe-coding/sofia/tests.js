// The order checker tests. Claude wrote these from my prompt 7. They run in
// the page with no test library, and print what passed.
(function () {
  'use strict';
  const K = window.Kopi;
  const out = document.getElementById('test-result');
  const list = document.getElementById('test-fails');

  function run() {
    const results = [];
    const check = (name, ok) => results.push({ name: name, ok: ok });

    const all = K.allDrinks();
    check('The stall makes 44 different drinks', all.length === 44);
    check('Level 1 has 6 orders, level 2 has 22', K.drinksForLevel(1).length === 6 && K.drinksForLevel(2).length === 22);
    all.forEach((d) => {
      const back = K.parse(K.name(d));
      check(K.name(d) + ' reads back as the same drink', back !== null && K.mistakes(back, d).length === 0);
    });
    check('"Kopi kosong" is not on the menu', K.parse('Kopi kosong') === null);
    check('Words in the wrong order are not an order', K.parse('Kopi peng C') === null);
    check('Small letters still work', K.parse('teh o kosong peng') !== null);
    const oneOff = K.mistakes({ drink: 'teh', milk: 'condensed', sugar: 'less', temp: 'hot' },
      { drink: 'teh', milk: 'evaporated', sugar: 'less', temp: 'hot' });
    check('One wrong part gives one message, about the milk', oneOff.length === 1 && oneOff[0].part === 'milk');

    const passed = results.filter((r) => r.ok).length;
    out.textContent = passed + ' of ' + results.length + ' checks passed.';
    out.className = 'tests ' + (passed === results.length ? 'pass' : 'fail');
    list.textContent = '';
    results.filter((r) => !r.ok).forEach((r) => {
      const li = document.createElement('li');
      li.textContent = 'Failed: ' + r.name;
      list.append(li);
    });
  }

  document.getElementById('run-tests').addEventListener('click', run);
  run();
})();
