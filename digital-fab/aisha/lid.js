// Builds the case lid for any clearance, as a mesh and as a binary STL.
// The lid is made of boxes, so it is meshed on a grid: every cell is solid
// or empty, and a face is drawn wherever solid meets empty.
(function () {
  const W = 69, H = 77, D = 21, wall = 2.5, batH = 26.8, div = 2;
  const cav = { x: wall, y: wall, w: W - 2 * wall, h: H - 2 * wall };
  const boardY0 = cav.y + batH + div, bayH = cav.y + cav.h - boardY0;
  const pocket = { w: 52.4, h: 42.8 };
  const px = (W - pocket.w) / 2, py = boardY0 + (bayH - pocket.h) / 2;
  const lipT = 1.6, lipD = 3, plate = 2, bw = 56;

  function boxes(c) {
    const b = (op, x, y, z, w, h, d) => ({ op, lo: [x, y, z], hi: [x + w, y + h, z + d] });
    const list = [
      b('+', 0, 0, 0, W, H, plate),
      b('+', cav.x + c, cav.y + c, plate, cav.w - 2 * c, cav.h - 2 * c, lipD),
      b('-', cav.x + c + lipT, cav.y + c + lipT, plate, cav.w - 2 * c - 2 * lipT, cav.h - 2 * c - 2 * lipT, lipD),
      b('-', px + 2, py + 3, 0, pocket.w - 4, pocket.h - 5, plate),
      b('-', (W - bw) / 2, cav.y + 3, 0, bw, batH - 6, plate)
    ];
    for (const [qx, qy, qh] of [[px + 0.2, py + 0.2, 3], [px + pocket.w - 2.2, py + 0.2, 3], [px + 0.2, py + pocket.h - 2.2, 2], [px + pocket.w - 2.2, py + pocket.h - 2.2, 2]])
      list.push(b('+', qx, qy, plate, 2, qh, D - 13.8));
    return list;
  }

  function mesh(c) {
    const list = boxes(c);
    const axes = [0, 1, 2].map((a) => {
      const s = new Set();
      for (const bx of list) { s.add(+bx.lo[a].toFixed(4)); s.add(+bx.hi[a].toFixed(4)); }
      return [...s].sort((p, q) => p - q);
    });
    const [nx, ny, nz] = axes.map((g) => g.length - 1);
    const solid = new Uint8Array(nx * ny * nz);
    const at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? 0 : solid[(k * ny + j) * nx + i];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p = [(axes[0][i] + axes[0][i + 1]) / 2, (axes[1][j] + axes[1][j + 1]) / 2, (axes[2][k] + axes[2][k + 1]) / 2];
      let s = 0;
      for (const bx of list) {
        if (p[0] > bx.lo[0] && p[0] < bx.hi[0] && p[1] > bx.lo[1] && p[1] < bx.hi[1] && p[2] > bx.lo[2] && p[2] < bx.hi[2]) s = bx.op === '+' ? 1 : 0;
      }
      solid[(k * ny + j) * nx + i] = s;
    }
    const v = [], t = [], index = new Map();
    const vert = (x, y, z) => {
      const key = x + ',' + y + ',' + z;
      if (!index.has(key)) { index.set(key, v.length / 3); v.push(x, y, z); }
      return index.get(key);
    };
    const quad = (a, b, c2, d) => { t.push(a, b, c2, a, c2, d); };
    const X = axes[0], Y = axes[1], Z = axes[2];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!at(i, j, k)) continue;
      const x0 = X[i], x1 = X[i + 1], y0 = Y[j], y1 = Y[j + 1], z0 = Z[k], z1 = Z[k + 1];
      // outward faces, counter-clockwise seen from outside
      if (!at(i - 1, j, k)) quad(vert(x0, y0, z0), vert(x0, y0, z1), vert(x0, y1, z1), vert(x0, y1, z0));
      if (!at(i + 1, j, k)) quad(vert(x1, y0, z0), vert(x1, y1, z0), vert(x1, y1, z1), vert(x1, y0, z1));
      if (!at(i, j - 1, k)) quad(vert(x0, y0, z0), vert(x1, y0, z0), vert(x1, y0, z1), vert(x0, y0, z1));
      if (!at(i, j + 1, k)) quad(vert(x0, y1, z0), vert(x0, y1, z1), vert(x1, y1, z1), vert(x1, y1, z0));
      if (!at(i, j, k - 1)) quad(vert(x0, y0, z0), vert(x0, y1, z0), vert(x1, y1, z0), vert(x1, y0, z0));
      if (!at(i, j, k + 1)) quad(vert(x0, y0, z1), vert(x1, y0, z1), vert(x1, y1, z1), vert(x0, y1, z1));
    }
    return { v, t };
  }

  function stl(m, name) {
    const n = m.t.length / 3;
    const buf = new ArrayBuffer(84 + n * 50);
    const dv = new DataView(buf);
    const head = (name || 'lid').slice(0, 79);
    for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 127);
    dv.setUint32(80, n, true);
    for (let f = 0; f < n; f++) {
      const p = [0, 1, 2].map((q) => { const i = m.t[f * 3 + q] * 3; return [m.v[i], m.v[i + 1], m.v[i + 2]]; });
      const u = p[1].map((x, a) => x - p[0][a]), w = p[2].map((x, a) => x - p[0][a]);
      let nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const l = Math.hypot(nn[0], nn[1], nn[2]) || 1; nn = nn.map((x) => x / l);
      let o = 84 + f * 50;
      for (const x of [...nn, ...p[0], ...p[1], ...p[2]]) { dv.setFloat32(o, x, true); o += 4; }
    }
    return buf;
  }

  const api = { mesh, stl, size: { W, H, D } };
  if (typeof module !== 'undefined') module.exports = api;
  else window.LidMaker = api;
})();
