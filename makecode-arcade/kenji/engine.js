// A tiny copy of how MakeCode Arcade runs a game, so it can be played on this page.
// Screen 160 x 120, 16-pixel tiles, sprites with velocity (vx, vy) and acceleration (ay),
// wall tiles that stop sprites, and overlap checks. The game file sets the rules.
(function () {
  'use strict';

  // MakeCode Arcade's 16 colours. 0 is see-through.
  var PALETTE = [null, '#ffffff', '#ff2121', '#ff93c4', '#ff8135', '#fff609', '#249ca3', '#78dc52',
    '#003fad', '#87f2ff', '#8e2ec4', '#a4839f', '#5c406c', '#e5cdc4', '#91463d', '#000000'];
  var W = 160, H = 120, T = 16;

  function makeImage(rows) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var g = c.getContext('2d');
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) {
        var col = PALETTE[parseInt(r[x], 16)];
        if (r[x] !== '.' && col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }

  function Engine(opts) {
    var self = this;
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx.imageSmoothingEnabled = false;
    this.data = opts.data;
    this.images = {};
    Object.keys(this.data.ART).forEach(function (k) { self.images[k] = makeImage(self.data.ART[k]); });
    this.sky = opts.sky || null;
    this.sprites = [];
    this.keys = {};
    this.paused = true;
    this.cam = { x: 0, y: 0 };
    this.shake = 0;
    this.muted = false;
    this.onUpdate = function () {};
    this.onPressA = function () {};
    this.bindKeys();
  }

  Engine.prototype.loadLevel = function (rows) {
    var d = this.data;
    this.map = rows.map(function (r) { return r.split('').map(function (ch) { return d.TILES[d.KEY[ch]]; }); });
    this.walls = this.map.map(function (r) { return r.map(function (t) { return d.WALLS.indexOf(t) >= 0; }); });
    this.mapW = rows[0].length; this.mapH = rows.length;
  };
  Engine.prototype.tilesOfType = function (name) {
    var out = [];
    for (var y = 0; y < this.mapH; y++) for (var x = 0; x < this.mapW; x++) if (this.map[y][x] === name) out.push({ col: x, row: y });
    return out;
  };
  Engine.prototype.setTile = function (loc, name) { this.map[loc.row][loc.col] = name; };
  Engine.prototype.setWall = function (loc, on) { this.walls[loc.row][loc.col] = on; };
  Engine.prototype.isWall = function (col, row) {
    if (col < 0 || row < 0 || col >= this.mapW || row >= this.mapH) return true;
    return this.walls[row][col];
  };

  Engine.prototype.create = function (imgName, kind) {
    var img = this.images[imgName];
    var s = { img: img, kind: kind, w: img.width, h: img.height, x: 0, y: 0, vx: 0, vy: 0, ay: 0,
      bounce: false, ghost: false, follow: null, followSpeed: 0, hit: {}, dead: false, flip: false };
    this.sprites.push(s);
    return s;
  };
  Engine.prototype.placeOnTile = function (s, loc) { s.x = loc.col * T + T / 2; s.y = loc.row * T + T / 2; s.vx = s.vx || 0; };
  Engine.prototype.destroyKind = function (kind) { this.sprites.forEach(function (s) { if (s.kind === kind) s.dead = true; }); };
  Engine.prototype.ofKind = function (kind) { return this.sprites.filter(function (s) { return s.kind === kind && !s.dead; }); };
  Engine.prototype.overlaps = function (a, b) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
  };
  // Tiles under a sprite's box, like Arcade's "on overlap tile".
  Engine.prototype.tilesUnder = function (s) {
    var out = [];
    var c0 = Math.floor((s.x - s.w / 2) / T), c1 = Math.floor((s.x + s.w / 2 - 0.01) / T);
    var r0 = Math.floor((s.y - s.h / 2) / T), r1 = Math.floor((s.y + s.h / 2 - 0.01) / T);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      if (r >= 0 && c >= 0 && r < this.mapH && c < this.mapW) out.push({ col: c, row: r, name: this.map[r][c] });
    }
    return out;
  };

  // Move one axis at a time and stop at wall tiles.
  Engine.prototype.moveAxis = function (s, dx, dy) {
    var hw = s.w / 2, hh = s.h / 2;
    if (dx) {
      var nx = s.x + dx;
      var edge = dx > 0 ? nx + hw - 0.01 : nx - hw;
      var col = Math.floor(edge / T);
      var r0 = Math.floor((s.y - hh) / T), r1 = Math.floor((s.y + hh - 0.01) / T);
      var blocked = false;
      for (var r = r0; r <= r1; r++) if (this.isWall(col, r)) blocked = true;
      if (blocked && !s.ghost) {
        s.x = dx > 0 ? col * T - hw : (col + 1) * T + hw;
        if (dx > 0) s.hit.right = true; else s.hit.left = true;
        s.vx = s.bounce ? -s.vx : 0;
      } else s.x = nx;
    }
    if (dy) {
      var ny = s.y + dy;
      var edgeY = dy > 0 ? ny + hh - 0.01 : ny - hh;
      var row = Math.floor(edgeY / T);
      var c0 = Math.floor((s.x - hw) / T), c1 = Math.floor((s.x + hw - 0.01) / T);
      var hitY = false;
      for (var c = c0; c <= c1; c++) if (this.isWall(c, row)) hitY = true;
      if (hitY && !s.ghost) {
        s.y = dy > 0 ? row * T - hh : (row + 1) * T + hh;
        if (dy > 0) s.hit.bottom = true; else s.hit.top = true;
        s.vy = s.bounce ? -s.vy : 0;
      } else s.y = ny;
    }
  };

  Engine.prototype.step = function (dt) {
    var self = this;
    this.sprites.forEach(function (s) {
      if (s.dead) return;
      s.hit = {};
      if (s.follow && !s.follow.dead) {
        var fx = s.follow.x - s.x, fy = s.follow.y - s.y, d = Math.sqrt(fx * fx + fy * fy);
        if (d > 12) { s.vx = fx / d * s.followSpeed; s.vy = fy / d * s.followSpeed; } else { s.vx = 0; s.vy = 0; }
      }
      s.vy += s.ay * dt;
      // Small steps, so a fast sprite can't skip through a wall.
      var steps = Math.max(1, Math.ceil(Math.max(Math.abs(s.vx), Math.abs(s.vy)) * dt / 4));
      for (var i = 0; i < steps; i++) {
        self.moveAxis(s, s.vx * dt / steps, 0);
        self.moveAxis(s, 0, s.vy * dt / steps);
      }
      if (s.vx < 0) s.flip = true; else if (s.vx > 0) s.flip = false;
    });
    this.sprites = this.sprites.filter(function (s) { return !s.dead; });
  };

  Engine.prototype.follow = function (s) {
    var mw = this.mapW * T, mh = this.mapH * T;
    this.cam.x = Math.max(0, Math.min(mw - W, Math.round(s.x - W / 2)));
    this.cam.y = Math.max(0, Math.min(mh - H, Math.round(s.y - H / 2)));
    if (mw < W) this.cam.x = Math.round((mw - W) / 2);
    if (mh < H) this.cam.y = Math.round((mh - H) / 2);
  };

  Engine.prototype.draw = function () {
    var g = this.ctx, self = this;
    var sx = 0, sy = 0;
    if (this.shake > 0) { sx = Math.round((Math.random() - 0.5) * 6); sy = Math.round((Math.random() - 0.5) * 6); }
    g.fillStyle = this.sky || '#000';
    g.fillRect(0, 0, W, H);
    var cx = this.cam.x + sx, cy = this.cam.y + sy;
    var c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(this.mapW - 1, Math.floor((cx + W) / T));
    var r0 = Math.max(0, Math.floor(cy / T)), r1 = Math.min(this.mapH - 1, Math.floor((cy + H) / T));
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      var name = this.map[r][c];
      if (this.images[name]) g.drawImage(this.images[name], c * T - cx, r * T - cy);
    }
    this.sprites.forEach(function (s) {
      var x = Math.round(s.x - s.w / 2 - cx), y = Math.round(s.y - s.h / 2 - cy);
      if (s.blink && Math.floor(performance.now() / 80) % 2) return;
      if (s.flip) { g.save(); g.scale(-1, 1); g.drawImage(s.img, -x - s.w, y); g.restore(); }
      else g.drawImage(s.img, x, y);
    });
    if (this.afterDraw) this.afterDraw(g, cx, cy);
    if (this.say) {
      g.font = '8px monospace';
      var tw = Math.ceil(g.measureText(this.say.text).width) + 6;
      var bx = Math.max(1, Math.min(W - tw - 1, Math.round(this.say.sprite.x - cx - tw / 2))), by = Math.max(1, Math.round(this.say.sprite.y - cy - this.say.sprite.h / 2 - 13));
      g.fillStyle = '#ffffff'; g.fillRect(bx, by, tw, 11);
      g.fillStyle = '#000000'; g.fillText(this.say.text, bx + 3, by + 8);
    }
  };

  // Sounds made with the Web Audio API: a few short notes each.
  Engine.prototype.play = function (notes) {
    if (this.muted) return;
    try {
      this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)();
      var a = this.audio, t = a.currentTime;
      notes.forEach(function (n, i) {
        var o = a.createOscillator(), v = a.createGain();
        o.type = n[2] || 'square';
        o.frequency.setValueAtTime(n[0], t + i * n[1]);
        v.gain.setValueAtTime(0.05, t + i * n[1]);
        v.gain.exponentialRampToValueAtTime(0.001, t + (i + 1) * n[1]);
        o.connect(v); v.connect(a.destination);
        o.start(t + i * n[1]); o.stop(t + (i + 1) * n[1]);
      });
    } catch (e) { /* no sound on this browser */ }
  };

  Engine.prototype.bindKeys = function () {
    var self = this;
    var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', Space: 'A', KeyZ: 'A', Enter: 'A' };
    function onKey(e, down) {
      var k = map[e.code];
      if (!k) return;
      var inGame = document.activeElement === self.canvas || document.activeElement === document.body || self.canvas.parentNode.contains(document.activeElement);
      if (!inGame) return;
      e.preventDefault();
      if (down && !self.keys[k] && k === 'A') self.pressA();
      self.keys[k] = down;
    }
    window.addEventListener('keydown', function (e) { onKey(e, true); });
    window.addEventListener('keyup', function (e) { onKey(e, false); });
    window.addEventListener('blur', function () { self.keys = {}; });
  };
  // On-screen buttons: hold for directions, tap for A.
  Engine.prototype.bindPad = function (root) {
    var self = this;
    root.querySelectorAll('[data-key]').forEach(function (b) {
      var k = b.getAttribute('data-key');
      function down(e) { e.preventDefault(); if (k === 'A') self.pressA(); self.keys[k] = true; b.classList.add('down'); }
      function up() { self.keys[k] = false; b.classList.remove('down'); }
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  };
  Engine.prototype.pressA = function () { this.onPressA(); };

  Engine.prototype.run = function () {
    var self = this, last = performance.now();
    function frame(now) {
      var dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (!self.paused) {
        self.onUpdate(dt);
        self.step(dt);
        if (self.shake > 0) self.shake -= dt;
        if (self.say && (self.say.until -= dt) <= 0) self.say = null;
      }
      self.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () { if (document.hidden && self.onHide) self.onHide(); });
  };

  window.ArcadeLite = { Engine: Engine, W: W, H: H, T: T, PALETTE: PALETTE, makeImage: makeImage };
})();
