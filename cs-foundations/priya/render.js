// Draws Scratch scripts into any element with data-sprite. data-program picks
// PROGRAM (the default) or STARTER from program.js; window.SAMPLES holds
// scripts from student work and the fix.
window.SAMPLES = window.SAMPLES || {};
window.SAMPLES.fix = [
  [['whenflag'],
    ['ask', 'Does it conduct electricity? (y/n)'],
    ['ifelse', ['or', ['eq', ['answer'], 'y'], ['eq', ['answer'], 'yes']],
      [['say', 'It goes to question 2.']],
      [['say', 'It goes to question 3.']]]]
];
document.addEventListener('DOMContentLoaded', function () {
  var R = new window.ScratchLite.Renderer();
  document.querySelectorAll('[data-sprite]').forEach(function (el) {
    var name = el.getAttribute('data-sprite');
    var scripts = window.SAMPLES[name];
    if (!scripts) {
      var prog = window[el.getAttribute('data-program') || 'PROGRAM'];
      scripts = prog.sprites.filter(function (s) { return s.name === name; })[0].scripts;
    }
    el.innerHTML = scripts.map(function (sc) { return R.script(sc); }).join('');
  });
});
