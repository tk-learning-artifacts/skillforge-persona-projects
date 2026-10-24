// React Pad: a small React editor that runs in the browser with no account.
// It compiles each file with Sucrase, then runs the files in a sandboxed
// iframe with development builds of React. games.json is served by a fake
// fetch, so you can slow it down or break it on purpose.
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var key = params.get('p') === 'full' ? 'full' : 'starter';
  var project = window.PAD_PROJECTS[key];
  var storeKey = 'react-pad:' + key + ':v1';

  var $ = function (id) { return document.getElementById(id); };
  var editor = $('editor');
  var gutter = $('gutter');
  var tabs = $('tabs');
  var frameBox = $('frame-box');
  var consoleList = $('console');
  var count = $('count');

  var files = project.files.map(function (f) { return { path: f.path, text: f.text }; });
  var current = project.open;
  var frame = null;
  var token = 0;
  var errors = 0;
  var timer = null;

  $('project-name').textContent = project.title;
  $(key === 'full' ? 'go-full' : 'go-starter').setAttribute('aria-current', 'page');
  document.title = 'React Pad: ' + project.title + ', by Kenji Watanabe';

  // Saved work, if any. localStorage can fail (private browsing), so guard it.
  try {
    var saved = JSON.parse(localStorage.getItem(storeKey) || 'null');
    if (saved && saved.files) {
      saved.files.forEach(function (s) {
        var f = find(s.path);
        if (f) f.text = s.text;
      });
      $('saved').textContent = 'Your saved changes are back. Reset all files to start again.';
    }
  } catch (e) { /* no saving on this device */ }

  function find(path) {
    for (var i = 0; i < files.length; i++) if (files[i].path === path) return files[i];
    return null;
  }

  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify({ files: files })); } catch (e) { /* ignore */ }
  }

  function shortName(path) { return path.split('/').pop(); }

  // ---------- Tabs and editor ----------
  function drawTabs() {
    tabs.textContent = '';
    files.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = shortName(f.path);
      b.title = f.path;
      b.setAttribute('aria-pressed', String(f.path === current));
      b.addEventListener('click', function () { open(f.path); });
      tabs.appendChild(b);
    });
  }

  function open(path) {
    current = path;
    editor.value = find(path).text;
    editor.scrollTop = 0;
    editor.scrollLeft = 0;
    drawTabs();
    drawGutter();
  }

  function drawGutter() {
    var n = editor.value.split('\n').length;
    var out = '';
    for (var i = 1; i <= n; i++) out += i + '\n';
    gutter.textContent = out;
    gutter.scrollTop = editor.scrollTop;
  }

  var escaped = false;
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) {
      e.preventDefault();
      run();
      return;
    }
    if (e.key === 'Escape') { escaped = true; return; }
    if (e.key === 'Tab' && !escaped && !e.shiftKey) {
      e.preventDefault();
      insert('  ');
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      // Keep the indent of the line above.
      var before = editor.value.slice(0, editor.selectionStart);
      var line = before.slice(before.lastIndexOf('\n') + 1);
      var indent = line.match(/^\s*/)[0];
      if (/[{([]\s*$/.test(line)) indent += '  ';
      e.preventDefault();
      insert('\n' + indent);
      return;
    }
    escaped = false;
  });

  function insert(text) {
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    editor.setRangeText(text, start, end, 'end');
    changed();
  }

  editor.addEventListener('input', changed);
  editor.addEventListener('scroll', function () { gutter.scrollTop = editor.scrollTop; });

  function changed() {
    find(current).text = editor.value;
    drawGutter();
    save();
    if ($('live').checked) {
      clearTimeout(timer);
      timer = setTimeout(run, 900);
    }
  }

  // ---------- Console ----------
  function log(type, text) {
    if (consoleList.children.length > 200) consoleList.removeChild(consoleList.firstChild);
    var li = document.createElement('li');
    li.className = 'pad-msg ' + type;
    var tag = document.createElement('span');
    tag.className = 'pad-tag';
    tag.textContent = { log: 'log', warn: 'warning', error: 'error', net: 'network', run: 'run' }[type] || type;
    var body = document.createElement('span');
    body.textContent = text;
    li.appendChild(tag);
    li.appendChild(body);
    consoleList.appendChild(li);
    consoleList.scrollTop = consoleList.scrollHeight;
    if (type === 'error') errors++;
    count.textContent = errors ? '(' + errors + (errors === 1 ? ' error' : ' errors') + ')' : '';
  }

  $('clear').addEventListener('click', function () {
    consoleList.textContent = '';
    errors = 0;
    count.textContent = '';
  });

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!frame || e.source !== frame.contentWindow || !d || d.pad !== token) return;
    log(d.type, d.text);
  });

  // ---------- Compile and run ----------
  function compile() {
    var out = {};
    var publicFiles = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (/^public\//.test(f.path)) {
        publicFiles[f.path.slice(7)] = f.text;
        continue;
      }
      if (/\.(jsx?|mjs)$/.test(f.path)) {
        try {
          var code = window.padTransform(f.text, {
            transforms: ['jsx', 'imports'],
            jsxRuntime: 'automatic',
            production: false,
            filePath: f.path
          }).code;
          out[f.path] = { kind: 'js', code: code };
        } catch (err) {
          return { error: f.path + ': ' + err.message.replace(/^Error transforming [^:]*: /, ''), path: f.path };
        }
      } else if (/\.css$/.test(f.path)) {
        out[f.path] = { kind: 'css', code: f.text };
      } else if (/\.json$/.test(f.path)) {
        out[f.path] = { kind: 'json', code: f.text };
      }
    }
    return { modules: out, publicFiles: publicFiles };
  }

  // This function is turned into text and runs inside the preview iframe.
  function runner(p) {
    var send = function (type, text) { parent.postMessage({ pad: p.token, type: type, text: text }, '*'); };
    var show = function (v) {
      if (typeof v === 'string') return v;
      if (v instanceof Error) return v.name + ': ' + v.message;
      try { var s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
    };
    var format = function (args) {
      args = Array.prototype.slice.call(args);
      var head = '';
      if (typeof args[0] === 'string') {
        head = args.shift().replace(/%([sdifoOc])/g, function (m, c) {
          if (!args.length) return m;
          var v = args.shift();
          return c === 'c' ? '' : show(v);
        });
      }
      return [head].concat(args.map(show)).filter(function (s) { return s !== ''; }).join(' ').trim();
    };
    ['log', 'info', 'debug', 'warn', 'error'].forEach(function (k) {
      console[k] = function () { send(k === 'warn' || k === 'error' ? k : 'log', format(arguments)); };
    });
    var crash = function (message) {
      send('error', message);
      var box = document.createElement('pre');
      box.className = 'pad-crash';
      box.textContent = 'Your app stopped with an error:\n\n' + message + '\n\nFix the code, and it runs again.';
      document.body.appendChild(box);
    };
    window.addEventListener('error', function (e) { crash((e.error && e.error.message) || e.message); });
    window.addEventListener('unhandledrejection', function (e) { send('error', 'Unhandled promise: ' + show(e.reason)); });

    // A pretend web server for the files in public/.
    window.fetch = function (input) {
      var url = String((input && input.url) || input);
      var name = url.replace(/^\.\//, '').split(/[?#]/)[0];
      var status = 200;
      var note = '';
      if (name.charAt(0) === '/') {
        status = 404;
        note = ' A slash at the start asks for the top of the site. On a GitHub Pages project site, that is the wrong folder.';
      } else if (p.broken && name === 'games.json') {
        status = 404;
        note = ' (You ticked Break games.json.)';
      } else if (!Object.prototype.hasOwnProperty.call(p.publicFiles, name)) {
        status = 404;
        note = ' There is no public/' + name + '.';
      }
      var delay = p.slow ? 2000 : 250;
      return new Promise(function (resolve) {
        setTimeout(function () {
          send('net', 'GET ' + url + ' → ' + status + (status === 200 ? ' OK' : ' Not Found') + ' after ' + delay + ' ms.' + note);
          resolve(new Response(status === 200 ? p.publicFiles[name] : 'Not Found', {
            status: status,
            headers: { 'Content-Type': status === 200 ? 'application/json' : 'text/plain' }
          }));
        }, delay);
      });
    };

    var packages = window.__padModules;
    var cache = {};
    var resolve = function (from, spec) {
      var parts = from.split('/').slice(0, -1);
      spec.split('/').forEach(function (s) {
        if (s === '..') parts.pop();
        else if (s !== '.' && s !== '') parts.push(s);
      });
      var path = parts.join('/');
      if (p.modules[path]) return path;
      var tries = ['.jsx', '.js', '/index.jsx', '/index.js'];
      for (var i = 0; i < tries.length; i++) if (p.modules[path + tries[i]]) return path + tries[i];
      return null;
    };
    var load = function (from, spec) {
      if (packages[spec]) return packages[spec];
      if (spec.charAt(0) !== '.') throw new Error('React Pad has no package called "' + spec + '". It has react and react-dom only.');
      var path = resolve(from, spec);
      if (!path) throw new Error(from + ' imports "' + spec + '", but there is no such file.');
      if (cache[path]) return cache[path].exports;
      var mod = { exports: {} };
      cache[path] = mod;
      var file = p.modules[path];
      if (file.kind === 'css') {
        var style = document.createElement('style');
        style.textContent = file.code;
        document.head.appendChild(style);
      } else if (file.kind === 'json') {
        mod.exports = JSON.parse(file.code);
      } else {
        var fn = new Function('require', 'module', 'exports', file.code + '\n//# sourceURL=' + path);
        fn(function (s) { return load(path, s); }, mod, mod.exports);
      }
      return mod.exports;
    };
    try {
      load('index.html', './src/main.jsx');
    } catch (err) {
      crash(err.message);
    }
  }

  function run() {
    clearTimeout(timer);
    var result = compile();
    token++;
    if (frame) frame.remove();
    frame = document.createElement('iframe');
    frame.title = 'Preview of your app';
    frame.setAttribute('sandbox', 'allow-scripts allow-modals');
    if (result.error) {
      log('error', result.error);
      frame.srcdoc = page('<pre class="pad-crash">' + escapeHtml('Your code has a mistake, so it can\'t run yet:\n\n' + result.error) + '</pre>', '');
      frameBox.appendChild(frame);
      return;
    }
    log('run', 'Ran your code at ' + new Date().toLocaleTimeString() + '.');
    var payload = {
      token: token,
      modules: result.modules,
      publicFiles: result.publicFiles,
      slow: $('slow').checked,
      broken: $('broken').checked
    };
    var data = JSON.stringify(payload).replace(/</g, '\\u003c');
    var script = '<script>(' + window.padReact.toString() + ')();<\/script>' +
      '<script>(' + runner.toString() + ')(' + data + ');<\/script>';
    frame.srcdoc = page('<div id="root"></div>', script);
    frameBox.appendChild(frame);
  }

  function page(body, scripts) {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>.pad-crash{margin:12px;padding:12px;border-radius:10px;background:#fbe7e4;color:#7a1f16;' +
      'font:14px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;border:2px solid #a3352a}</style>' +
      '</head><body>' + body + scripts + '</body></html>';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  $('run').addEventListener('click', run);
  $('slow').addEventListener('change', run);
  $('broken').addEventListener('change', run);
  $('reset').addEventListener('click', function () {
    if (!window.confirm('Reset every file to how it started? Your changes will be lost.')) return;
    files = project.files.map(function (f) { return { path: f.path, text: f.text }; });
    try { localStorage.removeItem(storeKey); } catch (e) { /* ignore */ }
    $('saved').textContent = 'All files are back to how they started.';
    open(current);
    run();
  });

  // ---------- Download as a zip (stored, not compressed) ----------
  var crcTable = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(entries) {
    var enc = new TextEncoder();
    var parts = [];
    var central = [];
    var offset = 0;
    entries.forEach(function (e) {
      var name = enc.encode(e.path);
      var data = enc.encode(e.text);
      var crc = crc32(data);
      var head = new DataView(new ArrayBuffer(30));
      head.setUint32(0, 0x04034b50, true);
      head.setUint16(4, 20, true);
      head.setUint16(6, 0x0800, true);
      head.setUint32(14, crc, true);
      head.setUint32(18, data.length, true);
      head.setUint32(22, data.length, true);
      head.setUint16(26, name.length, true);
      parts.push(head.buffer, name, data);
      var cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(cd.buffer, name);
      offset += 30 + name.length + data.length;
    });
    var size = central.reduce(function (n, b) { return n + b.byteLength; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }
  $('download').addEventListener('click', function () {
    var folder = project.zip + '/';
    var entries = project.shell.concat(files).map(function (f) { return { path: folder + f.path, text: f.text }; });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(zip(entries));
    a.download = project.zip + '.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  open(current);
  run();
})();
