// The merge gate simulator. It runs the same tests as tools/check-site.mjs
// on a copy of the team's files, then plays the workflow's jobs as a log.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stallPage(n, name, items, extraHead, extraFoot) {
    var lis = items.map(function (it) { return '  <li><span>' + it[0] + '</span><span>' + it[1] + '</span></li>'; }).join('\n');
    return '<!doctype html>\n<html lang="en">\n<head>\n<title>' + name + ' | Stall Board</title>\n' +
      '<link rel="stylesheet" href="../style.css">\n' + (extraHead || '') + '</head>\n<body>\n' +
      '<header class="top"><a href="../index.html">Stall Board</a></header>\n<main>\n<h1>Stall ' + n + ': ' + name + '</h1>\n' +
      '<ul class="menu">\n' + lis + '\n</ul>\n</main>\n<footer>Made-up menus for a class project.' + (extraFoot || '') + '</footer>\n</body>\n</html>\n';
  }
  var STALLS = [
    ['drinks', 'Drinks', 1], ['chicken-rice', 'Chicken rice', 3], ['mixed-rice', 'Mixed rice', 4], ['western-food', 'Western food', 5]
  ];
  function baseFiles(extraLi) {
    var lis = STALLS.map(function (s) { return '  <li><a href="stalls/' + s[0] + '.html">' + s[1] + '</a></li>'; });
    if (extraLi) lis.push(extraLi);
    var f = {
      'index.html': '<!doctype html>\n<html lang="en">\n<head>\n<title>Stall Board</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<main>\n<h1>What\'s in the canteen today</h1>\n<ul class="stalls">\n' + lis.join('\n') + '\n</ul>\n</main>\n<script src="script.js"></script>\n</body>\n</html>\n',
      'style.css': 'body { margin: 0; }\n',
      'script.js': "const box = document.getElementById('find');\n"
    };
    STALLS.forEach(function (s) { f['stalls/' + s[0] + '.html'] = stallPage(s[2], s[1], [['Dish', '$3.00']]); });
    return f;
  }
  var NOODLES = [['Fishball noodles, dry', '$3.20'], ['Fishball noodles, soup', '$3.20'], ['Laksa', '$3.80'], ['Extra fishballs', '$0.80']];
  var LI_OK = '  <li><a href="stalls/noodles.html">Noodles</a></li>';

  var SCENARIOS = {
    clean: {
      files: function () { var f = baseFiles(LI_OK); f['stalls/noodles.html'] = stallPage(2, 'Noodles', NOODLES); return f; },
      changed: ['A stalls/noodles.html', 'M index.html'],
      fix: null
    },
    link: {
      files: function () { var f = baseFiles('  <li><a href="stalls/noodle.html">Noodles</a></li>'); f['stalls/noodles.html'] = stallPage(2, 'Noodles', NOODLES); return f; },
      changed: ['A stalls/noodles.html', 'M index.html   (link: stalls/noodle.html)'],
      fix: 'Fix the link to stalls/noodles.html'
    },
    key: {
      files: function () {
        var f = baseFiles(LI_OK);
        f['stalls/noodles.html'] = stallPage(2, 'Noodles', NOODLES, '<script src="menu-config.js"></script>\n');
        f['stalls/menu-config.js'] = '// Settings for the menu app\nconst MENU_API_KEY = "demo-not-a-real-key";\n';
        return f;
      },
      changed: ['A stalls/noodles.html', 'A stalls/menu-config.js', 'M index.html'],
      fix: 'Remove menu-config.js and its script tag'
    },
    email: {
      files: function () { var f = baseFiles(LI_OK); f['stalls/noodles.html'] = stallPage(2, 'Noodles', NOODLES, '', ' Contact: noodles.stall@example.com'); return f; },
      changed: ['A stalls/noodles.html   (footer has an email)', 'M index.html'],
      fix: 'Take the email out of the footer'
    }
  };

  // Same tests as tools/check-site.mjs.
  function normalize(p) {
    var out = [];
    p.split('/').forEach(function (part) {
      if (part === '..') out.pop(); else if (part && part !== '.') out.push(part);
    });
    return out.join('/');
  }
  function check(files) {
    var names = Object.keys(files).sort();
    var problems = [], checked = 0;
    names.forEach(function (file) {
      if (!/\.(html|js|css|json)$/.test(file)) return;
      var text = files[file];
      checked++;
      var key = text.match(/(api[_-]?key|secret|password|passwd|token)["']?\s*[:=]/i);
      if (key) problems.push(file + ': looks like a key or password ("' + key[0] + '"). Take it out. If it was real, cancel it.');
      if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(text)) problems.push(file + ': has an email address. Take it out.');
      if (!/\.html$/.test(file)) return;
      var t = text.match(/<title>([^<]*)<\/title>/i);
      if (!t || !t[1].trim()) problems.push(file + ': no <title>.');
      var h1s = (text.match(/<h1[\s>]/gi) || []).length;
      if (h1s !== 1) problems.push(file + ': needs exactly 1 <h1>, found ' + h1s + '.');
      if (file.indexOf('stalls/') === 0) {
        if (!/class="menu"/.test(text)) problems.push(file + ': no menu list (class="menu").');
        else if (!/\$\d+\.\d\d/.test(text)) problems.push(file + ': the menu has no prices like $2.50.');
      }
      var re = /(?:href|src)="([^"]+)"/g, m;
      var dir = file.indexOf('/') >= 0 ? file.slice(0, file.lastIndexOf('/') + 1) : '';
      while ((m = re.exec(text))) {
        var link = m[1];
        if (/^(https?:|mailto:|#)/.test(link)) continue;
        var target = normalize(dir + link.split(/[?#]/)[0]);
        if (names.indexOf(target) < 0) problems.push(file + ': link to "' + link + '" goes nowhere.');
      }
    });
    var lines = ['Checked ' + checked + ' files.'];
    problems.forEach(function (p) { lines.push('FAIL ' + p); });
    if (problems.length) lines.push(problems.length + ' problem(s). Fix them, commit, and the check runs again.');
    else lines.push('All good. Ready to merge.');
    return { ok: !problems.length, lines: lines };
  }

  var S = {};
  var timers = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function line(text, cls) {
    var span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text + '\n';
    $('log').appendChild(span);
    $('log').scrollTop = $('log').scrollHeight;
  }
  function play(steps, done) {
    var t = 0;
    steps.forEach(function (s) {
      t += reduce ? 0 : (s[2] || 260);
      timers.push(setTimeout(function () { line(s[0], s[1]); }, t));
    });
    timers.push(setTimeout(done, t + (reduce ? 0 : 200)));
  }
  function checkSteps(result, where) {
    var steps = [
      ['Run "Check and deploy" on ' + where, 's', 50],
      ['check / Set up job', 'd'], ['check / Checkout', 'd'], ['check / Check the site', 'd'],
      ['$ node tools/check-site.mjs', null, 400]
    ];
    result.lines.forEach(function (l) { steps.push([l, /^FAIL/.test(l) ? 'f' : (/^All good/.test(l) ? 'ok' : null), 180]); });
    if (!result.ok) steps.push(['Error: Process completed with exit code 1.', 'f', 200]);
    return steps;
  }

  function setDot(id, kind, mark, text) {
    var d = $('dot-' + id);
    d.className = 'dot ' + kind;
    d.textContent = mark;
    $('txt-' + id).textContent = text;
  }
  function render() {
    var sc = SCENARIOS[S.key];
    var files = S.fixed ? ['A stalls/noodles.html', 'M index.html', '(fix pushed: ' + sc.fix + ')'] : sc.changed;
    $('pr-files').textContent = files.join('\n');
    $('pr-meta').textContent = 'cobalt-otter wants to merge ' + (S.fixed ? 2 : 1) + ' commit' + (S.fixed ? 's' : '') + ' into main from add-noodles';
    if (S.check === 'none') setDot('check', 'idle', '·', 'Not run yet.');
    else if (S.check === 'running') setDot('check', 'wait', '…', 'Running.');
    else if (S.check === 'pass') setDot('check', 'go', '✓', 'Passed.');
    else setDot('check', 'stop', '✗', 'Failed. Read the first FAIL line in the log.');
    if (S.approved) setDot('review', 'go', '✓', 'lime-kite approved these changes.');
    else setDot('review', 'idle', '·', 'No approvals yet. The ruleset needs 1.');
    var blockers = [];
    if (S.check !== 'pass') blockers.push('the check must pass');
    if (!S.approved) blockers.push('1 approval is needed');
    if (S.merged) setDot('merge', S.mainOk ? 'go' : 'stop', S.mainOk ? '✓' : '!', S.mainOk ? 'Merged and deployed.' : 'Merged, but main now fails the check.');
    else if (!S.ruleset) setDot('merge', 'wait', '!', 'Ruleset off. Anyone can merge, ready or not.');
    else if (blockers.length) setDot('merge', 'idle', '·', 'Blocked: ' + blockers.join(' and ') + '.');
    else setDot('merge', 'go', '✓', 'Ready to merge.');
    var busy = S.check === 'running' || S.deploying;
    $('b-run').disabled = busy || S.merged;
    $('b-fix').disabled = busy || S.merged || !sc.fix || S.fixed;
    $('b-approve').disabled = busy || S.merged || S.approved;
    $('b-merge').disabled = busy || S.merged || (S.ruleset && blockers.length > 0);
    $('ruleset').disabled = S.merged || busy;
    renderLive();
  }
  function renderLive() {
    var ul = $('live-list');
    ul.textContent = '';
    var list = STALLS.map(function (s) { return [s[1], s[2]]; });
    if (S.live) list.push(['Noodles', 2]);
    list.sort(function (a, b) { return a[1] - b[1]; });
    list.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = 'Stall ' + s[1] + ': ' + s[0];
      if (s[0] === 'Noodles') li.className = 'new';
      ul.appendChild(li);
    });
  }
  function verdict(text, kind) { var v = $('verdict'); v.textContent = text; v.className = 'verdict' + (kind ? ' ' + kind : ''); }

  function currentFiles() {
    var sc = SCENARIOS[S.key];
    return S.fixed ? SCENARIOS.clean.files() : sc.files();
  }
  function runCheck() {
    clearTimers();
    S.check = 'running';
    render();
    var result = check(currentFiles());
    line('');
    play(checkSteps(result, 'pull request #11'), function () {
      S.check = result.ok ? 'pass' : 'fail';
      render();
      verdict(result.ok ? 'The check passed.' : (S.ruleset ? 'The check failed. The merge button stays grey while the ruleset is on.' : 'The check failed. With the ruleset off, nothing stops a merge.'), result.ok ? 'good' : 'bad');
    });
  }
  function merge() {
    clearTimers();
    S.merged = true;
    S.deploying = true;
    var files = currentFiles();
    var result = check(files);
    var hadKey = !S.fixed && S.key === 'key';
    var reviewed = S.approved;
    render();
    line('');
    line('Squash and merge: "Add noodles stall (#11)" is now on main.', 's');
    var steps = checkSteps(result, 'push to main');
    if (result.ok) {
      steps = steps.concat([
        ['deploy / Set up job', 'd'], ['deploy / Checkout', 'd'], ['deploy / Setup Pages', 'd'],
        ['deploy / Upload artifact', 'd', 500], ['deploy / Deploy to GitHub Pages', 'd', 700],
        ['Deployed to https://mr-pillai-cs.github.io/stall-board-t1/', 'ok', 300]
      ]);
    } else {
      steps.push(['deploy / Skipped: the job it needs (check) failed.', 'f', 300]);
    }
    play(steps, function () {
      S.deploying = false;
      S.mainOk = result.ok;
      if (result.ok) S.live = true;
      render();
      if (result.ok && reviewed) verdict('Merged and live. Noodles is on the site.', 'good');
      else if (result.ok) verdict('Live, but nobody reviewed it. It worked this time.', 'bad');
      else if (hadKey) verdict('The site did not change, but the fake key is now public on main. Every new pull request will fail until someone fixes main.', 'bad');
      else verdict('The deploy was skipped, so the site did not change. But main is broken. Every new pull request will fail until someone fixes it.', 'bad');
    });
  }
  function reset() {
    clearTimers();
    S = { key: $('scenario').value, ruleset: $('ruleset').checked, check: 'none', approved: false, fixed: false, merged: false, deploying: false, live: false, mainOk: false };
    $('log').textContent = '';
    verdict('', '');
    render();
    runCheck();
  }

  $('scenario').addEventListener('change', reset);
  $('ruleset').addEventListener('change', function () { S.ruleset = $('ruleset').checked; render(); });
  $('b-run').addEventListener('click', runCheck);
  $('b-fix').addEventListener('click', function () {
    S.fixed = true;
    line('');
    line('cobalt-otter pushed 1 commit: ' + SCENARIOS[S.key].fix, 's');
    runCheck();
  });
  $('b-approve').addEventListener('click', function () { S.approved = true; render(); verdict('lime-kite approved.', 'good'); });
  $('b-merge').addEventListener('click', merge);
  $('b-reset').addEventListener('click', reset);

  // ?scenario=key&ruleset=off starts in a given state, for screenshots.
  var q = new URLSearchParams(location.search);
  if (q.get('scenario') && SCENARIOS[q.get('scenario')]) $('scenario').value = q.get('scenario');
  if (q.get('ruleset') === 'off') $('ruleset').checked = false;
  reset();
})();
