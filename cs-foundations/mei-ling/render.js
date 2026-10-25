// Draws Scratch scripts into any element with data-sprite (and optional
// data-script, the script's index). Scripts come from program.js, or from
// window.SAMPLES for pupil work.
document.addEventListener('DOMContentLoaded', function () {
  var R = new window.ScratchLite.Renderer();
  document.querySelectorAll('[data-sprite]').forEach(function (el) {
    var name = el.getAttribute('data-sprite');
    var scripts;
    if (window.SAMPLES && window.SAMPLES[name]) scripts = window.SAMPLES[name];
    else {
      var sp = window.PROGRAM.sprites.filter(function (s) { return s.name === name; })[0];
      scripts = sp.scripts;
    }
    var which = el.getAttribute('data-script');
    if (which !== null) scripts = [scripts[Number(which)]];
    el.innerHTML = scripts.map(function (sc) { return R.script(sc); }).join('');
  });
});
