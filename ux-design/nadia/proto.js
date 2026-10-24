// The homework page mock-up, in two versions, plus the accessibility checks.
(function () {
  var V = new URLSearchParams(location.search).get('v') === '1' ? 1 : 2;
  var app = document.getElementById('app');

  // Made-up homework for a Wednesday night. Tomorrow is Thursday.
  var tasks = [
    { id: 'ma', subj: 'Maths', what: 'Workbook page 34, questions 1 to 6', day: 'Thursday', short: 'Thu', tomorrow: true,
      steps: ['Open your workbook to page 34.', 'Do questions 1 to 6. Show your working.', 'Put the workbook in your bag.'],
      example: 'Question 1 asks for 3/4 of 24. Working: 24 ÷ 4 = 6, then 6 × 3 = 18.' },
    { id: 'en', subj: 'English', what: 'Read your reader, pages 12 to 15', day: 'Thursday', short: 'Thu', tomorrow: true,
      steps: ['Read pages 12 to 15.', 'Find 3 words you did not know.', 'Write them in your word book.'],
      example: 'A word I found: "drizzle". It means light rain.' },
    { id: 'sc', subj: 'Science', what: 'Finish worksheet 7 on the water cycle', day: 'Friday', short: 'Fri', tomorrow: false,
      steps: ['Fill in the 4 empty boxes on the diagram.', 'Answer question 5 in one sentence.'],
      example: 'Box 1: the sun heats water in the sea. The water evaporates.' },
    { id: 'mt', subj: 'Mother Tongue', what: 'Practise spelling list 6', day: 'Friday', short: 'Fri', tomorrow: false,
      steps: ['Say each word out loud.', 'Cover it, write it, check it.'],
      example: 'Do 5 words tonight and 5 words tomorrow.' }
  ];
  var bag = [
    { id: 'pe', name: 'PE shirt and shorts', why: 'PE is on Thursday' },
    { id: 'wb', name: 'Maths workbook', why: 'For the Maths homework' },
    { id: 'rd', name: 'English reader', why: 'For the English homework' },
    { id: 'wt', name: 'Water bottle', why: 'Every day' },
    { id: 'lb', name: 'Library book', why: 'Return it on Thursday' }
  ];
  var state = { screen: 'tonight', task: null, done: {}, packed: {}, size: 'normal', spacing: 'normal', settingsOpen: false };

  // Version links and note
  document.querySelectorAll('.versions a').forEach(function (a) {
    if (Number(a.dataset.v) === V) a.setAttribute('aria-current', 'page');
  });
  document.getElementById('v-about').textContent = V === 1
    ? 'Version 1 is what my 5 testers used. Watch for the 6 problems in my notes.'
    : 'The final version, with the fixes from testing.';
  app.classList.toggle('v1', V === 1);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dueText(t) {
    if (V === 1) return 'Due ' + t.short;
    return t.tomorrow ? 'Due tomorrow, ' + t.day : 'Due ' + t.day;
  }
  function say(msg) { var l = document.getElementById('live'); if (l) l.textContent = msg; }

  function header() {
    var h = '<p class="school">Sunbird Primary · 5 Kindness</p>';
    if (V === 2) {
      h += '<div class="tabs">' +
        '<button type="button" data-go="tonight" aria-pressed="' + (state.screen !== 'bag') + '">Tonight</button>' +
        '<button type="button" data-go="bag" aria-pressed="' + (state.screen === 'bag') + '">Pack my bag</button></div>';
      h += '<details class="settings"' + (state.settingsOpen ? ' open' : '') + '><summary>Text and spacing</summary>' +
        radio('size', 'Text size', [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']]) +
        radio('spacing', 'Spacing', [['normal', 'Normal'], ['wide', 'Wide']]) + '</details>';
    }
    return h;
  }
  function radio(name, legend, opts) {
    return '<fieldset><legend>' + legend + '</legend>' + opts.map(function (o) {
      return '<label><input type="radio" name="' + name + '" value="' + o[0] + '"' + (state[name] === o[0] ? ' checked' : '') + '> ' + o[1] + '</label>';
    }).join('') + '</fieldset>';
  }

  function tonight() {
    var list = V === 1 ? tasks.filter(function (t) { return !state.done[t.id]; }) : tasks;
    var left = tasks.filter(function (t) { return !state.done[t.id]; }).length;
    var h = '<h2 tabindex="-1">Tonight: Wednesday</h2><p class="count">' + left + ' of ' + tasks.length + ' tasks left</p><ul class="tasks">';
    list.forEach(function (t) {
      var d = !!state.done[t.id];
      h += '<li class="task' + (d ? ' is-done' : '') + '">' +
        '<button type="button" class="open" data-open="' + t.id + '"><span class="subj">' + esc(t.subj.toUpperCase()) + '</span>' +
        '<span class="what">' + esc(t.what) + '</span>' +
        (d ? '<span class="done-tag">Done ✓</span>' : '<span class="due' + (t.tomorrow ? '' : ' later') + '">' + dueText(t) + '</span>') + '</button>';
      if (V === 1) {
        h += '<button type="button" class="tick" data-tick="' + t.id + '"><span class="box" aria-hidden="true"></span></button>';
      } else {
        h += d
          ? '<button type="button" class="tick" data-undo="' + t.id + '"><span class="box" aria-hidden="true">✓</span>Undo</button>'
          : '<button type="button" class="tick" data-tick="' + t.id + '" aria-label="Mark ' + esc(t.subj) + ' done"><span class="box" aria-hidden="true"></span>Done</button>';
      }
      h += '</li>';
    });
    h += '</ul>';
    if (V === 1) h += '<button type="button" class="ghost-btn" data-go="bag">Pack my bag</button>';
    return h;
  }

  function taskScreen() {
    var t = tasks.filter(function (x) { return x.id === state.task; })[0];
    var d = !!state.done[t.id];
    var h = '<button type="button" class="back" data-go="tonight">← Back to Tonight</button>' +
      '<p class="school">' + esc(t.subj.toUpperCase()) + ' · ' + dueText(t) + '</p>' +
      '<h2 tabindex="-1">' + esc(t.what) + '</h2>';
    if (V === 1) {
      h += '<p>' + esc(t.steps.join(' ')) + '</p>';
    } else {
      h += '<ol class="steps-list">' + t.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    }
    h += '<details class="example"><summary>See an example</summary><p>' + esc(t.example) + '</p></details>';
    h += d ? '<p class="allset">Done ✓</p><button type="button" class="ghost-btn" data-undo="' + t.id + '">Undo: not done yet</button>'
      : '<button type="button" class="main-btn" data-tick="' + t.id + '">I\'m done</button>';
    return h;
  }

  function bagScreen() {
    var n = bag.filter(function (b) { return state.packed[b.id]; }).length;
    var h = (V === 1 ? '<button type="button" class="back" data-go="tonight">← Back to Tonight</button>' : '') +
      '<h2 tabindex="-1">Pack for Thursday</h2><p class="count">' + n + ' of ' + bag.length + ' packed</p><ul class="bag">';
    bag.forEach(function (b) {
      var on = !!state.packed[b.id];
      h += '<li><label class="' + (on ? 'on' : '') + '"><input type="checkbox" data-pack="' + b.id + '"' + (on ? ' checked' : '') + '>' +
        '<span>' + esc(b.name) + '<span class="why">' + esc(b.why) + '</span></span></label></li>';
    });
    h += '</ul>';
    if (n === bag.length) h += '<p class="allset">All packed. Good night.</p>';
    return h;
  }

  function render(focus) {
    var body = state.screen === 'task' ? taskScreen() : state.screen === 'bag' ? bagScreen() : tonight();
    app.className = 'app' + (V === 1 ? ' v1' : '') + ' size-' + state.size + ' spacing-' + state.spacing;
    app.innerHTML = header() + body + '<p class="live" id="live" aria-live="polite"></p>';
    if (focus) {
      var target = typeof focus === 'string' ? app.querySelector(focus) : app.querySelector('h2');
      if (target) target.focus();
    }
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.go) { state.screen = b.dataset.go; render(true); }
    else if (b.dataset.open) { state.task = b.dataset.open; state.screen = 'task'; render(true); }
    else if (b.dataset.tick) {
      var id = b.dataset.tick; state.done[id] = true;
      var t = tasks.filter(function (x) { return x.id === id; })[0];
      if (state.screen === 'task') { state.screen = 'tonight'; render(true); }
      else render(V === 2 ? '[data-undo="' + id + '"]' : 'h2');
      if (V === 2) say(t.subj + ' marked done. Press Undo to change it.');
    } else if (b.dataset.undo) {
      var u = b.dataset.undo; delete state.done[u];
      render(state.screen === 'task' ? '.main-btn' : '[data-tick="' + u + '"]');
      say('Marked not done.');
    }
  });
  app.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.pack) {
      state.packed[el.dataset.pack] = el.checked;
      render('[data-pack="' + el.dataset.pack + '"]');
      var n = bag.filter(function (x) { return state.packed[x.id]; }).length;
      say(n + ' of ' + bag.length + ' packed.');
    } else if (el.name === 'size' || el.name === 'spacing') {
      state[el.name] = el.value; state.settingsOpen = true;
      render('input[name="' + el.name + '"][value="' + el.value + '"]');
    }
  });
  app.addEventListener('toggle', function (e) {
    if (e.target.classList && e.target.classList.contains('settings')) state.settingsOpen = e.target.open;
  }, true);

  render(false);

  // ---- The checks ----
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; })
      .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toHex(rgb) {
    var m = rgb.match(/\d+/g); if (!m) return '';
    return '#' + m.slice(0, 3).map(function (n) { return ('0' + Number(n).toString(16)).slice(-2); }).join('');
  }
  function row(ok, html) { return '<li><span class="' + (ok ? 'pass">Pass' : 'fail">Fail') + '</span><span>' + html + '</span></li>'; }
  function sw(c) { return '<span class="sw" style="background:' + c + '"></span>'; }

  function nameOf(el) {
    var n = el.getAttribute('aria-label') || '';
    if (!n && el.getAttribute('aria-labelledby')) {
      n = el.getAttribute('aria-labelledby').split(' ').map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ''; }).join(' ');
    }
    if (!n) n = el.textContent;
    return n.replace(/\s+/g, ' ').trim();
  }

  document.getElementById('run').addEventListener('click', function () {
    var P = window.PALETTE, out = '', fails = 0, total = 0;
    var mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    // Does palette.js match the live page?
    var live = getComputedStyle(document.documentElement);
    var mismatch = Object.keys(P[mode]).filter(function (k) { return live.getPropertyValue('--' + k).trim().toLowerCase() !== P[mode][k]; });

    ['light', 'dark'].forEach(function (m) {
      var items = '';
      window.TEXT_PAIRS.forEach(function (p) {
        var r = ratio(P[m][p[1]], P[m][p[2]]), need = p[3] ? 3 : 4.5, ok = r >= need;
        total++; if (!ok) fails++;
        items += row(ok, sw(P[m][p[1]]) + sw(P[m][p[2]]) + ' ' + p[0] + ': ' + r.toFixed(2) + ':1 (needs ' + need + ':1)');
      });
      window.UI_PAIRS.forEach(function (p) {
        var r = ratio(P[m][p[1]], P[m][p[2]]), ok = r >= 3;
        total++; if (!ok) fails++;
        items += row(ok, sw(P[m][p[1]]) + sw(P[m][p[2]]) + ' ' + p[0] + ': ' + r.toFixed(2) + ':1 (needs 3:1)');
      });
      out += '<h3>Contrast, ' + m + ' mode' + (m === mode ? ' (what you see now)' : '') + '</h3><ul class="res">' + items + '</ul>';
    });
    // Render each screen in turn, check it, then put the pupil's screen back.
    var keep = { screen: state.screen, task: state.task };
    var labels = '', targets = '', small = 0, checked = 0, red = '';
    [['tonight', 'Tonight'], ['task', 'One task'], ['bag', 'Pack my bag']].forEach(function (sc) {
      state.screen = sc[0]; if (sc[0] === 'task') state.task = 'ma';
      render(false);
      if (sc[0] === 'tonight' && V === 1 && app.querySelector('.due')) red = toHex(getComputedStyle(app.querySelector('.due')).color);
      app.querySelectorAll('input').forEach(function (el) {
        var ok = el.labels && el.labels.length > 0 && el.labels[0].textContent.trim() !== '';
        total++; if (!ok) fails++;
        labels += row(ok, sc[1] + ': input "' + esc(ok ? el.labels[0].textContent.trim() : el.name || el.type) + '" ' + (ok ? 'has a label' : 'has no label'));
      });
      app.querySelectorAll('button, summary').forEach(function (el) {
        var n = nameOf(el), ok = /[A-Za-z]/.test(n);
        total++; if (!ok) fails++;
        labels += row(ok, sc[1] + ': ' + (ok ? 'button "' + esc(n) + '" has a name' : 'a button has no name. A screen reader just says "button".'));
      });
      app.querySelectorAll('button, summary, input, label').forEach(function (el) {
        if (el.matches('input') && el.closest('label')) return; // the label is the target
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        checked++;
        if (r.width < 24 || r.height < 24) {
          small++;
          targets += row(false, sc[1] + ': "' + esc(nameOf(el) || 'tick box') + '" is ' + Math.round(r.width) + ' by ' + Math.round(r.height) + ' px');
        }
      });
    });
    state.screen = keep.screen; state.task = keep.task;
    render(false);

    if (red) {
      var bg = P[mode].surface, r1 = ratio(red, bg);
      total++; if (r1 < 4.5) fails++;
      out += '<ul class="res">' + row(r1 >= 4.5, sw(red) + sw(bg) + ' Version 1 red "Due" text: ' + r1.toFixed(2) + ':1.') + '</ul>' +
        '<p class="small">That contrast is fine. But red is the only clue that a task is due, which fails WCAG 1.4.1. A script cannot see that, so I flag it here by hand.</p>';
    }
    out += '<h3>Labels and names, all 3 screens</h3><ul class="res">' + labels + '</ul>';
    total++; if (small) fails++;
    out += '<h3>Target size, all 3 screens</h3><ul class="res">' +
      row(!small, checked + ' targets measured. ' + (small ? small + ' smaller than 24 by 24 px.' : 'All are at least 24 by 24 px.')) + targets + '</ul>';

    var head = '<p class="summary">' + (fails ? fails + ' of ' + total + ' checks fail.' : 'All ' + total + ' checks pass.') + '</p>';
    if (mismatch.length) head += '<p class="fail">palette.js does not match style.css for: ' + mismatch.join(', ') + '</p>';
    document.getElementById('report').innerHTML = head + out;
  });
})();
