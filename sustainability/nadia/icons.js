// Simple line icons, drawn with SVG shapes. Each icon is a list of [tag, attributes].
// They use currentColor, so they follow light and dark mode.
var ICONS = {
  paper: [['path', { d: 'M18 8h20l10 10v38H18z' }], ['path', { d: 'M38 8v10h10' }], ['path', { d: 'M24 28h18M24 36h18M24 44h12' }]],
  cardboard: [['path', { d: 'M8 26l24-10 24 10-24 10z' }], ['path', { d: 'M8 26v20l24 10 24-10V26' }], ['path', { d: 'M32 36v20' }], ['path', { d: 'M20 21l24 10' }]],
  bottle: [['path', { d: 'M27 6h10v8l5 7v35a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3V21l5-7z' }], ['path', { d: 'M22 30h20M22 44h20' }]],
  can: [['ellipse', { cx: 32, cy: 12, rx: 13, ry: 4 }], ['path', { d: 'M19 12v40c0 2 6 4 13 4s13-2 13-4V12' }], ['path', { d: 'M19 24h26M19 42h26' }]],
  carton: [['path', { d: 'M20 18h24v40H20z' }], ['path', { d: 'M20 18l4-8h16l4 8' }], ['path', { d: 'M36 10l4-6' }], ['path', { d: 'M26 34h12v10H26z' }]],
  jar: [['path', { d: 'M22 8h20v6H22z' }], ['path', { d: 'M20 14h24a4 4 0 0 1 4 4v34a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z' }], ['path', { d: 'M24 30h16' }]],
  tissue: [['path', { d: 'M10 34h44v20H10z' }], ['path', { d: 'M24 34c0-8 4-14 8-20 4 6 8 12 8 20' }], ['path', { d: 'M18 44h28' }]],
  foam: [['path', { d: 'M8 36h48l-5 16H13z' }], ['path', { d: 'M8 36c2-12 10-20 24-20s22 8 24 20' }], ['circle', { cx: 22, cy: 44, r: 1.5 }], ['circle', { cx: 32, cy: 46, r: 1.5 }], ['circle', { cx: 42, cy: 44, r: 1.5 }]],
  oily: [['path', { d: 'M10 22h44v32H10z' }], ['path', { d: 'M10 22l6-10h32l6 10' }], ['path', { d: 'M22 32c3-3 7 0 5 4s-8 2-5-4z', fill: 'currentColor' }], ['path', { d: 'M38 40c3-2 6 1 4 4s-7 1-4-4z', fill: 'currentColor' }]],
  spoon: [['ellipse', { cx: 32, cy: 16, rx: 9, ry: 11 }], ['path', { d: 'M32 27v31' }]],
  battery: [['path', { d: 'M22 12h20v46H22z' }], ['path', { d: 'M28 6h8v6h-8z' }], ['path', { d: 'M32 22v10M27 27h10' }], ['path', { d: 'M27 48h10' }]],
  toy: [['path', { d: 'M8 40h48v10H8z' }], ['path', { d: 'M16 40l6-12h18l8 12' }], ['circle', { cx: 19, cy: 52, r: 5 }], ['circle', { cx: 45, cy: 52, r: 5 }]],
  binBlue: [['path', { d: 'M14 16h36l-4 42H18z' }], ['path', { d: 'M10 16h44M26 16v-6h12v6' }], ['path', { d: 'M24 34a8 8 0 0 1 14-4' }], ['path', { d: 'M38 24v6h-6' }], ['path', { d: 'M40 40a8 8 0 0 1-14 4' }], ['path', { d: 'M26 50v-6h6' }]],
  binGeneral: [['path', { d: 'M14 16h36l-4 42H18z' }], ['path', { d: 'M10 16h44M26 16v-6h12v6' }], ['path', { d: 'M26 26v24M32 26v24M38 26v24' }]],
  elsewhere: [['path', { d: 'M8 30h30v24H8z' }], ['path', { d: 'M8 30l6-8h18l6 8' }], ['path', { d: 'M40 22h14M48 14l8 8-8 8' }]]
};

function makeIcon(name, size) {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('width', size || 56);
  svg.setAttribute('height', size || 56);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  (ICONS[name] || []).forEach(function (part) {
    var el = document.createElementNS(NS, part[0]);
    Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
    svg.appendChild(el);
  });
  return svg;
}

// Fill any <span data-icon="name"> on the page.
document.querySelectorAll('[data-icon]').forEach(function (el) {
  el.appendChild(makeIcon(el.getAttribute('data-icon'), el.getAttribute('data-size')));
});
