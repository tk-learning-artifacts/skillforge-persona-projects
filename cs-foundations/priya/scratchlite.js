// A small player for one Scratch project, so it runs on this page.
// It reads the same program description that the .sb3 file was built from,
// draws the blocks, runs them the way Scratch does (each script is a thread
// that pauses at waits and at the end of each loop) and lights up the block
// that each script is on.
(function () {
  'use strict';

  var FLAG = '<svg class="sb-flag" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1v14" stroke="#2b6a1f" stroke-width="2"/><path d="M4 2c3-1.6 5 1.6 9 0v7c-4 1.6-6-1.6-9 0z" fill="#4cbf56" stroke="#2b6a1f"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // Scratch compares numbers as numbers, and anything else as text with no
  // difference between capital and small letters.
  function compare(a, b) {
    var n1 = Number(a), n2 = Number(b);
    if (n1 === 0 && String(a).trim() === '') n1 = NaN;
    else if (n2 === 0 && String(b).trim() === '') n2 = NaN;
    if (isNaN(n1) || isNaN(n2)) {
      var s1 = String(a).toLowerCase(), s2 = String(b).toLowerCase();
      return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
    }
    return n1 - n2;
  }

  // ---- Drawing the blocks ----------------------------------------------
  var CAT = {
    whenflag: 'ev', whenclicked: 'ev', whenreceive: 'ev', broadcast: 'ev',
    set: 'var', change: 'var', say: 'looks', sayfor: 'looks', costume: 'looks',
    ask: 'sense', wait: 'ctl', waituntil: 'ctl', repeat: 'ctl', forever: 'ctl', if: 'ctl', ifelse: 'ctl'
  };

  function rep(r) {
    if (!Array.isArray(r)) return '<span class="sb-in">' + esc(r === '' ? ' ' : r) + '</span>';
    switch (r[0]) {
      case 'var': return '<span class="sb-r var">' + esc(r[1]) + '</span>';
      case 'answer': return '<span class="sb-r sense">answer</span>';
      case 'costumename': return '<span class="sb-r looks">costume <span class="sb-dd">name</span></span>';
      case 'join': return '<span class="sb-r op">join ' + rep(r[1]) + ' ' + rep(r[2]) + '</span>';
      case 'random': return '<span class="sb-r op">pick random ' + rep(r[1]) + ' to ' + rep(r[2]) + '</span>';
      case 'eq': return '<span class="sb-b op">' + rep(r[1]) + ' = ' + rep(r[2]) + '</span>';
      case 'or': return '<span class="sb-b op">' + rep(r[1]) + ' or ' + rep(r[2]) + '</span>';
    }
    return '';
  }

  function head(s) {
    switch (s[0]) {
      case 'whenflag': return 'when ' + FLAG + ' clicked';
      case 'whenclicked': return 'when this sprite clicked';
      case 'whenreceive': return 'when I receive <span class="sb-dd">' + esc(s[1]) + '</span>';
      case 'broadcast': return 'broadcast <span class="sb-dd">' + esc(s[1]) + '</span>';
      case 'set': return 'set <span class="sb-dd">' + esc(s[1]) + '</span> to ' + rep(s[2]);
      case 'change': return 'change <span class="sb-dd">' + esc(s[1]) + '</span> by ' + rep(s[2]);
      case 'say': return 'say ' + rep(s[1]);
      case 'sayfor': return 'say ' + rep(s[1]) + ' for ' + rep(s[2]) + ' seconds';
      case 'costume': return 'switch costume to <span class="sb-dd">' + esc(s[1]) + '</span>';
      case 'ask': return 'ask ' + rep(s[1]) + ' and wait';
      case 'wait': return 'wait ' + rep(s[1]) + ' seconds';
      case 'waituntil': return 'wait until ' + rep(s[1]);
      case 'repeat': return 'repeat ' + rep(s[1]);
      case 'forever': return 'forever';
      case 'if': case 'ifelse': return 'if ' + rep(s[1]) + ' then';
    }
    return esc(s[0]);
  }

  function Renderer() { this.ids = new Map(); this.n = 0; }
  Renderer.prototype.id = function (s) { var id = 'sb' + (++this.n); this.ids.set(s, id); return id; };
  Renderer.prototype.stmts = function (list) {
    var self = this;
    return list.map(function (s) { return self.stmt(s); }).join('');
  };
  Renderer.prototype.stmt = function (s) {
    var cat = CAT[s[0]] || 'ctl', id = this.id(s);
    if (s[0] === 'repeat' || s[0] === 'forever' || s[0] === 'if' || s[0] === 'ifelse') {
      var body = s[0] === 'forever' ? s[1] : s[2];
      var html = '<div class="sb-c ' + cat + '" id="' + id + '"><div class="sb-line">' + head(s) + '</div>' +
        '<div class="sb-mouth">' + (this.stmts(body) || '<div class="sb-empty"></div>') + '</div>';
      if (s[0] === 'ifelse') html += '<div class="sb-line">else</div><div class="sb-mouth">' + (this.stmts(s[3]) || '<div class="sb-empty"></div>') + '</div>';
      return html + '<div class="sb-foot"></div></div>';
    }
    return '<div class="sb-blk ' + cat + '" id="' + id + '">' + head(s) + '</div>';
  };
  Renderer.prototype.script = function (script) {
    var hat = script[0];
    return '<div class="sb-script"><div class="sb-blk sb-hat ev" id="' + this.id(hat) + '">' + head(hat) + '</div>' +
      this.stmts(script.slice(1)) + '</div>';
  };

  // ---- Running the program --------------------------------------------
  function mount(o) {
    var P = o.program;
    var vars = {}, answer = '', threads = [], asking = null, askQueue = [];
    var sprites = P.sprites.map(function (sp) {
      return { def: sp, name: sp.name, costume: 0, say: '', el: null, bubble: null };
    });
    var stageSprite = { def: P.stage, name: 'Stage', costume: 0, say: '' };
    var R = new Renderer();

    // Stage: backdrop, sprites, speech bubbles, variable monitors.
    var stage = o.stageEl;
    stage.innerHTML = '';
    var bd = document.createElement('img');
    bd.className = 'sl-backdrop'; bd.alt = ''; bd.src = P.stage.costumes[0].file;
    stage.appendChild(bd);

    sprites.forEach(function (s) {
      var clickable = s.def.scripts.some(function (sc) { return sc[0][0] === 'whenclicked'; });
      var el = document.createElement(clickable ? 'button' : 'div');
      if (clickable) el.type = 'button';
      el.className = 'sl-sprite';
      var img = document.createElement('img');
      img.alt = '';
      el.appendChild(img);
      stage.appendChild(el);
      s.el = el; s.img = img;
      var b = document.createElement('div');
      b.className = 'sl-bubble'; b.hidden = true;
      stage.appendChild(b);
      s.bubble = b;
      if (clickable) el.addEventListener('click', function () { startHats('whenclicked', s); });
    });

    var mons = document.createElement('div');
    mons.className = 'sl-monitors';
    stage.appendChild(mons);
    var monEls = {};
    (P.stage.monitors || []).forEach(function (name) {
      var m = document.createElement('div');
      m.className = 'sl-mon';
      m.innerHTML = '<span>' + esc(name) + '</span><b></b>';
      mons.appendChild(m);
      monEls[name] = m.querySelector('b');
    });

    Object.keys(P.stage.variables).forEach(function (k) { vars[k] = P.stage.variables[k]; });

    // Blocks, one panel per sprite, with tabs.
    if (o.blocksEl) {
      var all = [stageSprite].concat(sprites).filter(function (s) { return s.def.scripts.length; });
      var tabs = '', panels = '';
      all.forEach(function (s, i) {
        var label = s.def.label || s.name;
        tabs += '<button type="button" role="tab" id="sl-tab-' + i + '" aria-controls="sl-panel-' + i + '" aria-selected="' + (i === (o.firstTab || 0)) + '">' + esc(label) + '</button>';
        panels += '<div class="sl-panel" role="tabpanel" id="sl-panel-' + i + '" aria-labelledby="sl-tab-' + i + '"' + (i === (o.firstTab || 0) ? '' : ' hidden') + '>' +
          (s.def.note ? '<p class="sl-note">' + s.def.note + '</p>' : '') +
          s.def.scripts.map(function (sc) { return R.script(sc); }).join('') + '</div>';
      });
      o.blocksEl.innerHTML = '<div class="sl-tabs" role="tablist" aria-label="Sprites">' + tabs + '</div>' + panels;
      var tabBtns = o.blocksEl.querySelectorAll('[role=tab]');
      tabBtns.forEach(function (t, i) {
        t.addEventListener('click', function () {
          tabBtns.forEach(function (u, j) {
            u.setAttribute('aria-selected', String(i === j));
            document.getElementById('sl-panel-' + j).hidden = i !== j;
          });
        });
      });
    }

    function costumeOf(s) { return s.def.costumes[s.costume]; }

    function draw() {
      sprites.forEach(function (s) {
        var c = costumeOf(s);
        if (s.img.getAttribute('src') !== c.file) s.img.src = c.file;
        var left = (240 + s.def.x - c.cx) / 480 * 100, top = (180 - s.def.y - c.cy) / 360 * 100;
        s.el.style.left = left + '%';
        s.el.style.top = top + '%';
        s.el.style.width = (c.w / 480 * 100) + '%';
        if (s.def.describe) s.el.setAttribute('aria-label', s.def.describe(s, vars));
        var text = s.say;
        if (text) {
          s.bubble.hidden = false;
          s.bubble.textContent = text;
          // Beside the sprite, on the side with more room, level with its top.
          var side = s.def.x > 0 ? 'left' : 'right';
          s.bubble.className = 'sl-bubble ' + side;
          var sx = 240 + s.def.x - c.cx;
          if (side === 'right') { s.bubble.style.left = ((sx + c.w * 0.9) / 480 * 100) + '%'; s.bubble.style.right = ''; }
          else { s.bubble.style.right = ((480 - sx - c.w * 0.1) / 480 * 100) + '%'; s.bubble.style.left = ''; }
          s.bubble.style.top = (Math.max(4, 180 - s.def.y - c.cy) / 360 * 100) + '%';
        } else s.bubble.hidden = true;
      });
      Object.keys(monEls).forEach(function (k) { monEls[k].textContent = vars[k]; });
      // Light up the block each script is on.
      if (o.blocksEl) {
        o.blocksEl.querySelectorAll('.run').forEach(function (e) { e.classList.remove('run'); });
        threads.forEach(function (t) {
          var id = t.cur && R.ids.get(t.cur);
          var el = id && document.getElementById(id);
          if (el) el.classList.add('run');
        });
      }
    }

    function val(r, sp) {
      if (!Array.isArray(r)) return r;
      switch (r[0]) {
        case 'var': return vars[r[1]];
        case 'answer': return answer;
        case 'costumename': return costumeOf(sp).name;
        case 'join': return String(val(r[1], sp)) + String(val(r[2], sp));
        case 'random':
          var a = Number(val(r[1], sp)), b = Number(val(r[2], sp));
          if (a > b) { var t = a; a = b; b = t; }
          if (Number.isInteger(a) && Number.isInteger(b)) return a + Math.floor(Math.random() * (b - a + 1));
          return a + Math.random() * (b - a);
        case 'eq': return compare(val(r[1], sp), val(r[2], sp)) === 0;
        case 'or': return !!val(r[1], sp) || !!val(r[2], sp);
      }
    }

    function now() { return performance.now(); }

    function* waitSecs(secs) { var end = now() + Number(secs) * 1000; while (now() < end) yield; }

    function* run(list, sp, th) {
      for (var i = 0; i < list.length; i++) yield* exec(list[i], sp, th);
    }

    function* exec(s, sp, th) {
      th.cur = s;
      switch (s[0]) {
        case 'set': vars[s[1]] = val(s[2], sp); break;
        case 'change': vars[s[1]] = (Number(vars[s[1]]) || 0) + (Number(val(s[2], sp)) || 0); break;
        case 'say': sp.say = String(val(s[1], sp)); break;
        case 'sayfor':
          sp.say = String(val(s[1], sp));
          yield* waitSecs(val(s[2], sp));
          sp.say = '';
          yield; break;
        case 'costume':
          var idx = sp.def.costumes.findIndex(function (c) { return c.name === s[1]; });
          if (idx >= 0) sp.costume = idx; break;
        case 'broadcast': startHats('whenreceive', null, s[1]); break;
        case 'wait': yield* waitSecs(val(s[1], sp)); yield; break;
        case 'waituntil': while (!val(s[1], sp)) yield; break;
        case 'ask':
          var q = String(val(s[1], sp));
          var job = { q: q, sp: sp, done: false };
          askQueue.push(job);
          while (!job.done) { if (asking === null && askQueue[0] === job) showAsk(job); yield; }
          break;
        case 'repeat':
          var n = Math.round(Number(val(s[1], sp)));
          for (var i = 0; i < n; i++) { yield* run(s[2], sp, th); th.cur = s; yield; }
          break;
        case 'forever':
          for (;;) { yield* run(s[1], sp, th); th.cur = s; yield; }
        case 'if': if (val(s[1], sp)) yield* run(s[2], sp, th); break;
        case 'ifelse': if (val(s[1], sp)) yield* run(s[2], sp, th); else yield* run(s[3], sp, th); break;
      }
    }

    function showAsk(job) {
      asking = job;
      job.sp.say = job.q;
      o.askEl.hidden = false;
      var input = o.askEl.querySelector('input');
      var label = o.askEl.querySelector('.sl-q');
      if (label) label.textContent = job.q;
      input.value = '';
      if (o.onAsk) o.onAsk(job.q);
      if (o.liveEl) o.liveEl.textContent = job.sp.name + ' asks: ' + job.q;
      input.focus({ preventScroll: true });
    }

    o.askEl.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!asking) return;
      answer = o.askEl.querySelector('input').value;
      if (o.onAnswer) o.onAnswer(asking.q, answer);
      asking.sp.say = '';
      asking.done = true;
      askQueue.shift();
      asking = null;
      o.askEl.hidden = true;
    });

    function startHats(kind, only, msg) {
      var targets = only ? [only] : [stageSprite].concat(sprites);
      targets.forEach(function (sp) {
        sp.def.scripts.forEach(function (sc, k) {
          var h = sc[0];
          if (h[0] !== kind || (kind === 'whenreceive' && h[1] !== msg)) return;
          var key = sp.name + '#' + k;
          threads = threads.filter(function (t) { return t.key !== key; });
          var th = { key: key, cur: h, gen: null };
          th.gen = run(sc.slice(1), sp, th);
          threads.push(th);
        });
      });
    }

    function stopAll() {
      threads = [];
      askQueue = []; asking = null;
      o.askEl.hidden = true;
      sprites.forEach(function (s) { s.say = ''; });
      if (o.onStop) o.onStop();
      draw();
    }

    var last = 0;
    function tick(t) {
      requestAnimationFrame(tick);
      if (t - last < 1000 / 31) return;
      last = t;
      var live = threads.slice();
      live.forEach(function (th) {
        if (threads.indexOf(th) < 0) return;
        var r = th.gen.next();
        if (r.done) { threads = threads.filter(function (x) { return x !== th; }); }
      });
      draw();
      var said = sprites.map(function (s) { return s.say; }).join('|');
      if (o.liveEl && said !== tick.said) {
        tick.said = said;
        var parts = sprites.filter(function (s) { return s.say && s !== (asking && asking.sp); })
          .map(function (s) { return s.name + ' says: ' + s.say; });
        if (parts.length) o.liveEl.textContent = parts.join(' ');
      }
    }

    o.flagBtn.addEventListener('click', function () { stopAll(); startHats('whenflag'); });
    o.stopBtn.addEventListener('click', stopAll);
    draw();
    requestAnimationFrame(tick);
    return { vars: vars, stop: stopAll };
  }

  window.ScratchLite = { mount: mount, Renderer: Renderer };
})();
