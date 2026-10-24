// Copy buttons for the starter files. Falls back to selecting the code.
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var pre = document.getElementById(btn.getAttribute('data-copy'));
    var live = document.getElementById('copied');
    function selectIt() {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      live.textContent = 'The code is selected. Press Ctrl+C to copy it.';
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(pre.textContent).then(function () {
        live.textContent = 'Copied ' + btn.getAttribute('data-name') + '.';
      }, selectIt);
    } else {
      selectIt();
    }
  });
});
