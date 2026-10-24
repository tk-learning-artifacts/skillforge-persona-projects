// The guessing calculator from the talk. Nobody types a password: you pick a
// kind and a length, and it counts the combinations and the time to try them all.
(function () {
  var kind = document.getElementById('kind');
  var rate = document.getElementById('rate');
  var lenOut = document.getElementById('len');
  var combos = document.getElementById('combos');
  var timeOut = document.getElementById('how-long');
  var unit = document.getElementById('unit');
  var len = 6;
  var KINDS = {
    words: { n: 7776, unit: 'words', max: 10 },
    any: { n: 94, unit: 'characters', max: 20 },
    lower: { n: 26, unit: 'characters', max: 20 },
    digits: { n: 10, unit: 'digits', max: 20 }
  };

  function big(n, power) { var r = 1n; for (var i = 0; i < power; i++) r *= BigInt(n); return r; }
  function commas(b) { return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',\u200b'); }
  function round2(x) { return Number(x.toPrecision(2)).toLocaleString('en-SG'); }
  function span(seconds) {
    if (seconds < 1) return 'under a second';
    if (seconds < 60) return round2(seconds) + ' seconds';
    if (seconds < 3600) return round2(seconds / 60) + ' minutes';
    if (seconds < 86400) return round2(seconds / 3600) + ' hours';
    var days = seconds / 86400;
    if (days < 365.25) return round2(days) + ' days';
    var years = days / 365.25;
    if (years < 1e3) return round2(years) + ' years';
    if (years < 1e6) return 'about ' + round2(years / 1e3) + ' thousand years';
    if (years < 1e9) return 'about ' + round2(years / 1e6) + ' million years';
    if (years < 1e12) return 'about ' + round2(years / 1e9) + ' billion years';
    return 'more than a trillion years';
  }

  function update() {
    var k = KINDS[kind.value];
    if (len > k.max) len = k.max;
    lenOut.textContent = len;
    unit.textContent = k.unit;
    var b = big(k.n, len);
    var digits = b.toString().length;
    combos.textContent = digits <= 27 ? commas(b) + ' combinations' : 'a ' + digits + '-digit number of combinations';
    var secs = Number(b) / Number(rate.value);
    timeOut.textContent = 'Time to try every one: ' + span(secs) + '.';
    document.getElementById('minus').disabled = len <= 1;
    document.getElementById('plus').disabled = len >= k.max;
  }
  document.getElementById('minus').addEventListener('click', function () { len = Math.max(1, len - 1); update(); });
  document.getElementById('plus').addEventListener('click', function () { len = Math.min(KINDS[kind.value].max, len + 1); update(); });
  kind.addEventListener('change', function () { len = kind.value === 'words' ? 6 : kind.value === 'digits' ? 6 : 8; update(); });
  rate.addEventListener('change', update);
  update();
})();
