// Copy buttons for the prompt cards. Falls back to selecting the text.
document.querySelectorAll('button.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var box = document.getElementById(btn.dataset.copy);
    var status = document.getElementById('copy-status');
    var text = box.textContent;
    function selectIt() {
      var range = document.createRange();
      range.selectNodeContents(box);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      status.textContent = 'Prompt selected. Press Ctrl+C or Cmd+C to copy it.';
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        status.textContent = 'Prompt copied.';
        setTimeout(function () { btn.textContent = 'Copy prompt'; }, 2000);
      }, selectIt);
    } else {
      selectIt();
    }
  });
});
