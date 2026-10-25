// The Caesar wheel: draws two rings of letters, turns the inner one by the
// shift, and hides or reveals the message as you type.
(function () {
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var NS = 'http://www.w3.org/2000/svg';
  var shift = 3;

  var wheel = document.querySelector('#wheel');
  var shiftOut = document.querySelector('#shift');
  var message = document.querySelector('#message');
  var result = document.querySelector('#result');
  var strip = document.querySelector('#strip');

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  // Draw a ring of 26 letters at radius r.
  function ring(r, cls) {
    var g = svg('g', { 'aria-hidden': 'true' });
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * 2 * Math.PI - Math.PI / 2;
      var t = svg('text', { x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) + 5, 'text-anchor': 'middle', 'class': cls,
        transform: 'rotate(' + (i * 360 / 26) + ' ' + (150 + r * Math.cos(a)) + ' ' + (150 + r * Math.sin(a)) + ')' });
      t.textContent = ABC[i];
      g.appendChild(t);
    }
    return g;
  }

  wheel.appendChild(svg('circle', { cx: 150, cy: 150, r: 146, 'class': 'ring' }));
  wheel.appendChild(ring(130, 'outer-text'));
  var inner = svg('g', { id: 'inner' });
  inner.style.transformOrigin = '150px 150px';
  inner.appendChild(svg('circle', { cx: 150, cy: 150, r: 112, 'class': 'ring-2' }));
  inner.appendChild(ring(96, 'inner-text'));
  wheel.appendChild(inner);
  wheel.appendChild(svg('circle', { cx: 150, cy: 150, r: 10, 'class': 'hub' }));
  wheel.appendChild(svg('path', { d: 'M150 3 l7 0 l-7 11 l-7 -11 z', 'class': 'pointer' }));

  // Build the strip once: one cell per letter.
  var cells = [];
  for (var i = 0; i < 26; i++) {
    var li = document.createElement('li');
    var top = document.createElement('span');
    var bottom = document.createElement('span');
    top.textContent = ABC[i];
    li.appendChild(top);
    li.appendChild(bottom);
    strip.appendChild(li);
    cells.push(bottom);
  }

  function move(text, by) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var n = ABC.indexOf(text[i]);
      out += n < 0 ? text[i] : ABC[(n + by + 26) % 26];
    }
    return out;
  }

  function update() {
    var hiding = document.querySelector('input[name="mode"]:checked').value === 'hide';
    // The inner ring turns backwards, so the letter under A is the secret for A.
    inner.style.transform = 'rotate(' + (-shift * 360 / 26) + 'deg)';
    shiftOut.textContent = shift;
    for (var i = 0; i < 26; i++) cells[i].textContent = ABC[(i + shift) % 26];
    var text = message.value.toUpperCase();
    result.textContent = move(text, hiding ? shift : -shift) || 'Type a message above.';
  }

  document.querySelector('#up').addEventListener('click', function () { shift = (shift + 1) % 26; update(); });
  document.querySelector('#down').addEventListener('click', function () { shift = (shift + 25) % 26; update(); });
  message.addEventListener('input', update);
  document.querySelectorAll('input[name="mode"]').forEach(function (r) { r.addEventListener('change', update); });

  document.querySelector('#swap').addEventListener('click', function () {
    message.value = result.textContent;
    update();
    message.focus();
  });

  document.querySelector('#copy').addEventListener('click', function () {
    var btn = this;
    function done(word) { btn.textContent = word; setTimeout(function () { btn.textContent = 'Copy result'; }, 1500); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(result.textContent).then(function () { done('Copied'); }, function () { done('Select and copy it'); });
    } else {
      done('Select and copy it');
    }
  });

  update();
})();
