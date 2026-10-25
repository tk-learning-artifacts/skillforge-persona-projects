// Morse lab: shows a word in Morse, then flashes it on the lamp with the
// standard timing (dash = 3 dots, gaps of 1, 3 and 7 dots).
(function () {
  var CODE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
    K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
    U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----'
  };
  var DOT = 250; // ms. Never more than 2 flashes a second.

  var word = document.querySelector('#word');
  var lamp = document.querySelector('#lamp');
  var now = document.querySelector('#now');
  var list = document.querySelector('#code');
  var beep = document.querySelector('#beep');
  var timers = [];
  var audio = null;

  // Dots and dashes drawn as · and − so they are easy to read.
  function pretty(code) { return code.replace(/\./g, '·').replace(/-/g, '−'); }
  function spoken(code) { return code.split('').map(function (c) { return c === '.' ? 'dot' : 'dash'; }).join(' '); }

  // One letter: the letter, the signs to see, and words for a screen reader.
  function cell(ch) {
    var li = document.createElement('li');
    var b = document.createElement('b'); b.textContent = ch;
    var s = document.createElement('span'); s.textContent = pretty(CODE[ch]); s.setAttribute('aria-hidden', 'true');
    var w = document.createElement('span'); w.className = 'sr'; w.textContent = spoken(CODE[ch]);
    li.appendChild(b); li.appendChild(s); li.appendChild(w);
    return li;
  }

  function clean() { return word.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''); }

  function show() {
    list.textContent = '';
    clean().split('').forEach(function (ch) {
      var li = document.createElement('li');
      if (ch === ' ') li.textContent = '/ (gap)';
      list.appendChild(ch === ' ' ? li : cell(ch));
    });
  }

  function tone(on) {
    if (!beep.checked) return;
    if (!audio) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio = { ctx: new Ctx() };
      audio.gain = audio.ctx.createGain();
      audio.gain.gain.value = 0;
      audio.osc = audio.ctx.createOscillator();
      audio.osc.frequency.value = 600;
      audio.osc.connect(audio.gain).connect(audio.ctx.destination);
      audio.osc.start();
    }
    audio.gain.gain.setTargetAtTime(on ? 0.15 : 0, audio.ctx.currentTime, 0.01);
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    lamp.classList.remove('on');
    tone(false);
    list.querySelectorAll('li').forEach(function (li) { li.classList.remove('now'); });
  }

  function flash() {
    stop();
    show();
    var t = 0;
    var items = list.querySelectorAll('li');
    clean().split('').forEach(function (ch, i) {
      if (ch === ' ') { t += DOT * 4; return; } // 3 already added after the last letter, 7 in all
      timers.push(setTimeout(function () {
        items.forEach(function (li) { li.classList.remove('now'); });
        items[i].classList.add('now');
        now.textContent = ch + ': ' + spoken(CODE[ch]);
      }, t));
      CODE[ch].split('').forEach(function (sig) {
        var len = sig === '.' ? DOT : DOT * 3;
        timers.push(setTimeout(function () { lamp.classList.add('on'); tone(true); }, t));
        timers.push(setTimeout(function () { lamp.classList.remove('on'); tone(false); }, t + len));
        t += len + DOT;
      });
      t += DOT * 2;
    });
    timers.push(setTimeout(function () { stop(); now.textContent = 'Done. Sent ' + clean() + '.'; }, t));
  }

  // The chart, built from the same table the lamp uses.
  var chart = document.querySelector('#chart');
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('').forEach(function (ch) {
    chart.appendChild(cell(ch));
  });

  word.addEventListener('input', function () { stop(); show(); });
  document.querySelector('#flash').addEventListener('click', flash);
  document.querySelector('#stop').addEventListener('click', function () { stop(); now.textContent = 'Stopped.'; });
  show();
})();
