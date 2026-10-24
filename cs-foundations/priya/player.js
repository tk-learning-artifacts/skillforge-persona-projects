// Runs Key Bot and shows the path through the numbered key as you answer.
document.addEventListener('DOMContentLoaded', function () {
  var key = document.getElementById('key');
  function clear() {
    key.querySelectorAll('.on').forEach(function (e) { e.classList.remove('on'); });
  }
  window.ScratchLite.mount({
    program: window.PROGRAM,
    stageEl: document.getElementById('stage'),
    blocksEl: document.getElementById('blocks'),
    askEl: document.getElementById('ask'),
    flagBtn: document.getElementById('flag'),
    stopBtn: document.getElementById('stop'),
    liveEl: document.getElementById('live'),
    onStop: clear,
    onAsk: function (q) {
      var plain = q.replace(' (y/n)', '');
      if (plain === 'Does it conduct electricity?') clear();
      var step = key.querySelector('[data-q="' + plain + '"]');
      if (step) step.classList.add('on');
      var m = plain.match(/^Is it the (.+)\?$/);
      if (m) {
        var leaf = key.querySelector('[data-leaf="' + m[1] + '"]');
        if (leaf) leaf.classList.add('on');
      }
    }
  });
});
