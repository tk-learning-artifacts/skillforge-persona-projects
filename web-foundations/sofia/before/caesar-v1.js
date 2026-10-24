// First draft of the wheel: buttons and the result only, no drawing yet.
var shift = 3;
function run() {
  var hide = document.querySelector('input[name="mode"]:checked').value === 'hide';
  var t = document.querySelector('#msg').value.toUpperCase(), o = '';
  for (var i = 0; i < t.length; i++) {
    var c = t.charCodeAt(i);
    o += c >= 65 && c <= 90 ? String.fromCharCode((c - 65 + (hide ? shift : 26 - shift)) % 26 + 65) : t[i];
  }
  document.querySelector('#shift').textContent = shift;
  document.querySelector('#out').textContent = o;
}
document.querySelector('#up').addEventListener('click', function () { shift = (shift + 1) % 26; run(); });
document.querySelector('#down').addEventListener('click', function () { shift = (shift + 25) % 26; run(); });
document.querySelector('#msg').addEventListener('input', run);
document.querySelectorAll('input[name="mode"]').forEach(function (r) { r.addEventListener('change', run); });
run();
