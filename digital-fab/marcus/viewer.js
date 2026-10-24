// A small 3D viewer on a 2D canvas: drag to turn, flat shading, and a cut
// plane that plays the print back layer by layer. Colours come from CSS.
(function () {
  function css(el, name, fallback) {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }
  function rgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Clip a triangle (array of [x,y,z]) to z <= h. Returns a polygon or null.
  function clip(tri, h) {
    const out = [];
    for (let i = 0; i < tri.length; i++) {
      const a = tri[i], b = tri[(i + 1) % tri.length];
      const ina = a[2] <= h, inb = b[2] <= h;
      if (ina) out.push(a);
      if (ina !== inb) {
        const t = (h - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, h]);
      }
    }
    return out.length >= 3 ? out : null;
  }

  function Viewer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.yaw = -0.6; this.pitch = 0.55;
    this.parts = [];
    this.cut = null; // { part index or -1 for all, h }
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.yaw += (e.clientX - drag[0]) * 0.01;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + (e.clientY - drag[1]) * 0.01));
      drag = [e.clientX, e.clientY];
      this.draw();
    });
    const stop = () => { drag = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('keydown', (e) => {
      const step = 0.15;
      if (e.key === 'ArrowLeft') this.yaw -= step;
      else if (e.key === 'ArrowRight') this.yaw += step;
      else if (e.key === 'ArrowUp') this.pitch = Math.max(-1.45, this.pitch - step);
      else if (e.key === 'ArrowDown') this.pitch = Math.min(1.45, this.pitch + step);
      else return;
      e.preventDefault();
      this.draw();
    });
    window.addEventListener('resize', () => this.draw());
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', () => this.draw());
  }

  // parts: [{ mesh: {v, t}, color: '--css-var', map: fn([x,y,z]) -> [x,y,z] }]
  Viewer.prototype.setParts = function (parts) {
    this.parts = parts.map((p) => {
      const v = p.mesh.v, pts = [];
      for (let i = 0; i < v.length; i += 3) pts.push([v[i], v[i + 1], v[i + 2]]);
      return { raw: pts, t: p.mesh.t, color: p.color, map: p.map || ((q) => q) };
    });
    this.draw();
  };

  Viewer.prototype.draw = function () {
    const c = this.canvas, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 320, h = Math.round(w * 0.75);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    c.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = css(c, '--view-bg', '#f4f6f5');
    ctx.fillRect(0, 0, w, h);

    // gather world points, find the centre and scale
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const parts = this.parts.map((p) => {
      const pts = p.raw.map(p.map);
      for (const q of pts) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], q[a]); hi[a] = Math.max(hi[a], q[a]); }
      return { pts, local: p.raw, t: p.t, color: rgb(css(c, p.color, '#888888')) };
    });
    if (!parts.length) return;
    const mid = lo.map((x, a) => (x + hi[a]) / 2);
    // fit the bounding sphere, so the model never leaves the frame as it turns
    const radius = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
    const scale = Math.min(w, h) * 0.47 / radius;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    // world: x right, y back, z up. Screen: turn by yaw about z, tilt by pitch.
    const view = (q) => {
      const x = q[0] - mid[0], y = q[1] - mid[1], z = q[2] - mid[2];
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      const y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;
      return [w / 2 + x1 * scale, h / 2 - z2 * scale, y2];
    };
    const light = [0.35, -0.55, 0.76];

    // build plate grid under the model
    const plate = css(c, '--view-grid', '#dde3e1');
    ctx.strokeStyle = plate; ctx.lineWidth = 1;
    const g0 = [lo[0] - 10, lo[1] - 10], g1 = [hi[0] + 10, hi[1] + 10];
    for (let x = Math.floor(g0[0] / 10) * 10; x <= g1[0]; x += 10) {
      const a = view([x, g0[1], lo[2]]), b = view([x, g1[1], lo[2]]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (let y = Math.floor(g0[1] / 10) * 10; y <= g1[1]; y += 10) {
      const a = view([g0[0], y, lo[2]]), b = view([g1[0], y, lo[2]]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    // z-buffer fill, so long thin faces never overlap in the wrong order
    const W2 = Math.round(w * dpr), H2 = Math.round(h * dpr);
    const img = ctx.getImageData(0, 0, W2, H2);
    const px = img.data;
    const zb = new Float32Array(W2 * H2).fill(Infinity);
    const cut = this.cut;
    const fillTri = (a, b, c2, col) => {
      const ax = a[0] * dpr, ay = a[1] * dpr, bx = b[0] * dpr, by = b[1] * dpr, cx = c2[0] * dpr, cy2 = c2[1] * dpr;
      const area = (bx - ax) * (cy2 - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-6) return;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W2 - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy2))), y1 = Math.min(H2 - 1, Math.ceil(Math.max(ay, by, cy2)));
      for (let y = y0; y <= y1; y++) {
        const py = y + 0.5;
        for (let x = x0; x <= x1; x++) {
          const pxx = x + 0.5;
          const w0 = ((bx - pxx) * (cy2 - py) - (by - py) * (cx - pxx)) / area;
          const w1 = ((cx - pxx) * (ay - py) - (cy2 - py) * (ax - pxx)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
          const z = w0 * a[2] + w1 * b[2] + w2 * c2[2];
          const i = y * W2 + x;
          if (z >= zb[i]) continue;
          zb[i] = z;
          px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = 255;
        }
      }
    };
    parts.forEach((p, pi) => {
      const map = this.parts[pi].map;
      for (let i = 0; i < p.t.length; i += 3) {
        let poly = [p.pts[p.t[i]], p.pts[p.t[i + 1]], p.pts[p.t[i + 2]]];
        if (cut && (cut.part === -1 || cut.part === pi)) {
          const loc = [p.local[p.t[i]], p.local[p.t[i + 1]], p.local[p.t[i + 2]]];
          const c3 = clip(loc, cut.h);
          if (!c3) continue;
          poly = c3.map(map);
        }
        const A = poly[0], B = poly[1], C = poly[2];
        const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const l = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map((x) => x / l);
        const k = 0.5 + 0.55 * Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        const col = p.color.map((x) => Math.round(Math.min(255, x * k)));
        const s = poly.map(view);
        for (let j = 1; j + 1 < s.length; j++) fillTri(s[0], s[j], s[j + 1], col);
      }
    });
    ctx.putImageData(img, 0, 0);
  };

  window.Viewer = Viewer;
})();
