// Reading options: text size, spacing and background. Saved on this device only.
(function () {
  var root = document.documentElement;
  var KEYS = ['size', 'spacing', 'ground'];
  function load(k) { try { return localStorage.getItem('nadia-' + k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem('nadia-' + k, v); } catch (e) { /* private mode */ } }
  function apply(k, v) {
    if (v && v !== 'normal' && v !== 'auto') root.setAttribute('data-' + k, v);
    else root.removeAttribute('data-' + k);
    Array.prototype.forEach.call(document.querySelectorAll('[data-opt="' + k + '"]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-val') === (v || b.parentNode.getAttribute('data-default'))));
    });
  }
  KEYS.forEach(function (k) { apply(k, load(k)); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-opt]'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-opt'), v = b.getAttribute('data-val');
      apply(k, v); save(k, v);
    });
  });
})();
