// Copy buttons for the code boxes, and the print button on the sheets.
document.querySelectorAll('[data-copy]').forEach(function (b) {
  b.addEventListener('click', function () {
    var box = document.getElementById(b.getAttribute('data-copy'));
    var done = function () { var old = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = old; }, 1500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(box.value).then(done, function () { box.select(); document.execCommand('copy'); done(); });
    } else { box.select(); document.execCommand('copy'); done(); }
  });
});
var printBtn = document.getElementById('print');
if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
