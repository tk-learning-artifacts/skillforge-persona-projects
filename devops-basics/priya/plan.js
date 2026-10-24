// The cohort planner: checks ages, sizes teams and fits the tasks into sessions.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SETTLE = 5, PACK = 5;

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function list(parent, items) {
    var ul = el('ul');
    items.forEach(function (t) { ul.appendChild(el('li', t)); });
    parent.appendChild(ul);
  }

  function read() {
    var n = parseInt($('students').value, 10);
    if (!(n >= 6)) n = 6;
    if (n > 40) n = 40;
    return { group: $('group').value, month: parseInt($('month').value, 10), length: parseInt($('length').value, 10), students: n };
  }

  // Sec 1 students mostly turn 13 during the school year. If you start on the
  // 1st of a month, anyone whose birthday is in that month or later is still 12.
  function ages(p) {
    var hasSec1 = p.group === 'sec1' || p.group === 'cca';
    if (!hasSec1) {
      return { under: false, title: 'Everyone can hold an account',
        lines: [p.group === 'sec2' ? 'Most Sec 2 students turn 14 this year, so all are 13 or older.' : 'Sec 3 and 4 students are 14 to 16.',
          'Each student signs up with a made-up account name, with a parent\'s okay.',
          'Lesson 1 starts with Keep my email addresses private.'] };
    }
    var still = 12 - p.month + 1;
    var most = still >= 6;
    var who = p.month === 1 ? 'Almost every Sec 1 student is still 12.' :
      'Sec 1 students born from ' + MONTHS[p.month - 1] + ' to December are still 12. That is about ' + still + ' months of birthdays out of 12.';
    return { under: true, title: 'Some students are still 12',
      lines: [who,
        'GitHub needs every user to be 13 or older. They can\'t have accounts yet.',
        'They draft their page on paper or on their device. A teammate aged 13 or over commits it on a branch. The pull request credits "our drafter", never a name.',
        'They review on the shared screen and say approve or change. The account holder clicks.',
        'After their birthday, with a parent\'s okay, they get their own account.'].concat(most && p.group === 'sec1' ?
        ['Half the class or more is still 12. Think about running this in Term 4 instead.'] : []),
      most: most && p.group === 'sec1' };
  }

  function teams(n) {
    var t = Math.ceil(n / 4);
    var small = t * 4 - n; // teams of 3
    if (small > t) small = t;
    return { count: t, fours: t - small, threes: small };
  }

  function tasks(under) {
    return [
      ['"Who can see it?" starter', 10],
      [under ? 'Account check. Drafters meet their partner.' : 'Account check. Tick Keep my email addresses private.', 15],
      ['Demo: one change through a pull request, on screen', 15],
      ['Make your page on a branch', 40],
      ['Open your pull request. Fill the checklist.', 10],
      ['Review a teammate. Click every link.', 20],
      ['Merge in turn. Fix any conflict together.', 20],
      ['Watch the deploy in Actions. Open the live site.', 10],
      ['Task 3: name the site, as one more pull request', 15],
      ['Show the site. What did review catch?', 15]
    ];
  }

  function plan(p, under) {
    var usable = p.length - SETTLE - PACK;
    var queue = tasks(under).map(function (t) { return { name: t[0], left: t[1], started: false }; });
    var sessions = [];
    while (queue.length) {
      var rows = [], t = 0;
      rows.push({ from: 0, to: SETTLE, name: 'Settle. Open the team repository.', fixed: true });
      t = SETTLE;
      var room = usable;
      while (room > 0 && queue.length) {
        var job = queue[0];
        // Only long tasks are split, and never into a scrap under 15 minutes.
        if (job.left > room && (job.left < 30 || room < 15 || job.left - room < 15)) break;
        var take = Math.min(job.left, room);
        rows.push({ from: t, to: t + take, name: job.name + (job.started ? ' (continued)' : '') });
        t += take; room -= take; job.left -= take; job.started = true;
        if (job.left === 0) queue.shift();
      }
      if (room > 0) { rows.push({ from: t, to: t + room, name: 'Buffer: catch up, or add a second page', fixed: true }); t += room; }
      rows.push({ from: t, to: t + PACK, name: queue.length ? 'Pack up. Write your next step in your issue.' : 'Pack up.', fixed: true });
      sessions.push(rows);
    }
    return sessions;
  }

  function render() {
    var p = read();
    var a = ages(p);
    var box = $('age');
    box.textContent = '';
    box.className = 'box age ' + (a.under ? 'warn' : 'okay');
    box.appendChild(el('h3', 'Ages: ' + a.title));
    list(box, a.lines);

    var tm = teams(p.students);
    var tb = $('teams');
    tb.textContent = '';
    tb.appendChild(el('h3', tm.count + ' teams, ' + tm.count + ' repositories'));
    var parts = [];
    if (tm.fours) parts.push(tm.fours + ' of 4');
    if (tm.threes) parts.push(tm.threes + ' of 3');
    list(tb, [
      p.students + ' students: ' + parts.join(' and ') + '.',
      'Copy the template ' + tm.count + ' times, then set Pages and the ruleset on each copy.',
      'Open one issue per student, plus one for task 3.',
      a.most ? 'There may not be one student aged 13 or over per team. Then you commit for those teams from your account.' :
        (a.under ? 'Put at least one student aged 13 or over in every team.' : 'Mix confident and new students in each team.')
    ]);

    var ss = plan(p, a.under);
    $('sessions-title').textContent = ss.length + ' sessions of ' + p.length + ' minutes';
    var grid = $('sessions');
    grid.textContent = '';
    ss.forEach(function (rows, i) {
      var card = el('div', null, 'session');
      card.appendChild(el('h4', 'Session ' + (i + 1)));
      var ol = el('ol');
      rows.forEach(function (r) {
        var li = el('li', null, r.fixed ? 'fixed' : '');
        li.appendChild(el('b', r.from + ' to ' + r.to));
        li.appendChild(el('span', r.name));
        ol.appendChild(li);
      });
      card.appendChild(ol);
      var total = rows[rows.length - 1].to;
      card.appendChild(el('p', 'Adds up to ' + total + ' minutes.', 'sum'));
      grid.appendChild(card);
    });

    var rb = $('ready');
    rb.textContent = '';
    rb.appendChild(el('h3', 'Before session 1'));
    var ready = [
      'Ask your school\'s ICT team to allow github.com and your github.io address. Test on a student device.',
      'A letter home: a public site, made-up account names, no photos or names.',
      'Your template is ready, and one copy per team is set up.'
    ];
    if (a.under) ready.splice(1, 0, 'A class list with birthdays, so you know who drafts and who commits.');
    list(rb, ready);
  }

  ['group', 'month', 'length', 'students'].forEach(function (id) {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });
  var q = new URLSearchParams(location.search);
  ['group', 'month', 'length', 'students'].forEach(function (id) { if (q.get(id)) $(id).value = q.get(id); });
  render();
})();
