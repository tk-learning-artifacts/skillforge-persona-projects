document.addEventListener('DOMContentLoaded', function () {
  window.ScratchLite.mount({
    program: window.PROGRAM,
    stageEl: document.getElementById('stage'),
    blocksEl: document.getElementById('blocks'),
    askEl: document.getElementById('ask'),
    flagBtn: document.getElementById('flag'),
    stopBtn: document.getElementById('stop'),
    liveEl: document.getElementById('live')
  });
});
