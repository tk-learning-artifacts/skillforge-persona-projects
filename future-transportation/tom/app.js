// WalkTap prototype: a parent's phone and a walking-bus leader's phone,
// wired together. Tapping a child's bag tag on the leader's phone sends the
// "joined" message; the gate tap sends "arrived". No location is tracked.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var NAMES = ['Aisyah', 'Ethan', 'Mei Xin', 'Arjun', 'Nur Iman', 'Jun Hao', 'Kavya', 'Ryan', 'Siti', 'Wei Ling', 'Darius', 'Hana'];
  var LEVELS = ['P3', 'P1', 'P4', 'P2', 'P5', 'P3', 'P1', 'P6', 'P2', 'P4', 'P3', 'P5'];
  var state;

  function reset() {
    state = {
      kids: NAMES.map(function (n, i) { return { name: n, level: LEVELS[i], away: n === 'Jun Hao', on: null, at: null }; }),
      phase: 'boarding', clock: -5, adults: 2,
      parentTab: 'today', channel: 'app', lang: 'English', rota: {},
      log: []
    };
  }
  reset();

  // Demo clock: minutes after 7:00. Boarding starts at 6:55.
  function hhmm(min) { var m = Math.floor(min), s = 7 * 60 + m; return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function aisyah() { return state.kids[0]; }
  function expected() { return state.kids.filter(function (k) { return !k.away; }); }
  function onBoard() { return state.kids.filter(function (k) { return k.on !== null; }); }

  function send(kid, text) {
    if (kid.name === 'Aisyah') {
      if (state.channel === 'off') { state.log.unshift('No message to Aisyah\'s parent: they turned messages off.'); return; }
      state.log.unshift((state.channel === 'sms' ? 'SMS' : 'App message') + ' to Aisyah\'s parent: "' + text + '"');
    } else {
      state.log.unshift('App message to ' + kid.name + '\'s parent: "' + text + '"');
    }
  }

  // ---------- Leader's phone ----------
  function renderLeader() {
    var exp = expected().length, on = onBoard().length;
    var html = '<div class="bar">Walking Bus A <span>' + hhmm(state.clock) + '</span></div>';
    html += '<p class="small" style="margin:0">Leader: Mdm Rosnah. Back: Mr Lim. From Block 214, then the Drop-and-Walk point.</p>';
    if (state.phase === 'boarding') {
      html += '<p class="count" aria-live="polite">On the bus: ' + on + ' of ' + exp + '</p>';
      html += '<ul class="list">' + state.kids.map(function (k, i) {
        if (k.away) return '<li class="away"><span>' + esc(k.name) + ' <small>' + k.level + '</small></span><span class="tag">Not walking today</span></li>';
        if (k.on !== null) return '<li class="on"><span>' + esc(k.name) + ' <small>' + k.level + '</small></span><span class="tag">On, ' + hhmm(k.on) + '</span></li>';
        return '<li><span>' + esc(k.name) + ' <small>' + k.level + '</small></span><button type="button" data-tap="' + i + '">Tap tag</button></li>';
      }).join('') + '</ul>';
      html += '<div class="row"><button type="button" id="all">Tap everyone left</button><button type="button" class="primary" id="go"' + (on ? '' : ' disabled') + '>Start walking</button></div>';
      if (on && on < exp) html += '<p class="notice">' + (exp - on) + ' not tapped yet. Their parents get no "joined" message. The bus leaves at 7:00 even if some are missing.</p>';
    } else if (state.phase === 'walking') {
      var need = Math.ceil(on / 8), ok = state.adults >= Math.max(2, need) && on <= 16;
      html += '<p class="count">Walking with ' + on + ' children</p>';
      html += '<p class="notice">' + (ok ? 'Ratio check: ' + state.adults + ' adults for ' + on + ' children. OK.' : 'Ratio check: need ' + Math.max(2, need) + ' adults. Wait for another volunteer.') + '</p>';
      html += '<ol class="steps"><li class="done">Block 214, left ' + hhmm(state.left) + '</li><li>Drop-and-Walk point, about ' + hhmm(state.left + 5) + '</li><li>Signalled crossing</li><li>School gate</li></ol>';
      html += '<div class="row"><button type="button" class="primary" id="gate">At the gate: teacher taps tags</button></div>';
    } else {
      var arrived = state.kids.filter(function (k) { return k.at !== null; }).length;
      html += '<p class="count">Arrived: ' + arrived + ' of ' + on + ' at ' + hhmm(state.clock) + '</p>';
      html += '<p class="notice">Headcount matches. Bus A is done for today. Vests go back in the box at the gate.</p>';
      html += '<div class="row"><button type="button" id="again">Reset the demo</button></div>';
    }
    $('leader').innerHTML = html;
  }

  $('leader').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-tap')) tap(Number(b.getAttribute('data-tap')));
    else if (b.id === 'all') expected().forEach(function (k) { if (k.on === null) tap(state.kids.indexOf(k), true); });
    else if (b.id === 'go') { state.phase = 'walking'; state.clock = Math.max(state.clock, 0); state.left = state.clock; }
    else if (b.id === 'gate') {
      state.phase = 'arrived'; state.clock = state.left + 15;
      onBoard().forEach(function (k) { k.at = state.clock; send(k, k.name + ' reached the school gate at ' + hhmm(k.at) + '.'); });
    } else if (b.id === 'again') { var ch = state.channel, lang = state.lang; reset(); state.channel = ch; state.lang = lang; }
    renderAll();
  });

  function tap(i) {
    var k = state.kids[i];
    if (k.on !== null || k.away) return;
    state.clock += 0.4;
    k.on = state.clock;
    send(k, k.name + ' joined Walking Bus A at Block 214, ' + hhmm(k.on) + '.');
    renderAll();
  }

  // ---------- Parent's phone ----------
  var TABS = [['today', 'Today'], ['routes', 'Routes'], ['help', 'Help out'], ['settings', 'Settings']];
  function renderParent() {
    var k = aisyah(), html = '<div class="bar">WalkTap <span>' + hhmm(state.clock) + '</span></div>';
    if (state.parentTab === 'today') {
      html += '<div class="kid"><h3>Aisyah, P3</h3><p class="small" style="margin:0">Walking Bus A, from Block 214</p>';
      if (k.away) html += '<p class="notice">You said Aisyah is not walking today. The leader can see this.</p>';
      else html += '<ol class="steps"><li class="' + (k.on !== null ? 'done' : '') + '">Joined the walking bus' + (k.on !== null ? ', ' + hhmm(k.on) : '') + '</li>' +
        '<li class="' + (k.at !== null ? 'done' : '') + '">Reached the school gate' + (k.at !== null ? ', ' + hhmm(k.at) : '') + '</li></ol>';
      html += '</div>';
      html += '<div class="row"><button type="button" id="away"' + (k.on !== null ? ' disabled' : '') + '>' + (k.away ? 'Aisyah is walking today' : 'Not walking today') + '</button></div>';
      html += '<p class="notice">Bus A leaves Block 214 at 7:00 and the Drop-and-Walk point at 7:05. It reaches the gate by about 7:15.</p>';
      html += '<p class="small" style="margin:0">WalkTap never shows where Aisyah is on the way. Only the two taps.</p>';
    } else if (state.parentTab === 'routes') {
      html += '<h3>Bus A</h3><ol class="steps"><li class="done">Block 214 void deck, 7:00</li><li class="done">Drop-and-Walk point 1, community club lay-by, 7:05</li><li class="done">School gate, about 7:15</li></ol>';
      html += '<p class="small" style="margin:0">Step-free. Crosses one road at a signalled crossing.</p>';
      html += '<h3>Bus B</h3><ol class="steps"><li class="done">Block 188 void deck, 6:58</li><li class="done">Drop-and-Walk point 2, car park entrance, 7:04</li><li class="done">School gate, about 7:14</li></ol>';
      html += '<p class="small" style="margin:0">Step-free. Covered walkway most of the way.</p>';
      html += '<p class="notice">Lightning warning or heavy rain at 6:45? The walk is cancelled and you get a message by 6:45.</p>';
    } else if (state.parentTab === 'help') {
      html += '<h3>Walk with us next week</h3><p class="small" style="margin:0">Each bus needs a leader in front and one adult at the back. The school checks every volunteer first.</p>';
      html += '<ul class="list">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(function (d) {
        var mine = state.rota[d];
        return '<li' + (mine ? ' class="on"' : '') + '><span>' + d + ', Bus A, back</span>' + (mine ? '<span class="tag">You</span>' : '<button type="button" data-day="' + d + '">Sign up</button>') + '</li>';
      }).join('') + '</ul>';
      var n = Object.keys(state.rota).length;
      if (n) html += '<p class="notice">You are on ' + n + (n === 1 ? ' morning' : ' mornings') + '. Bring nothing: vests are at Block 214.</p>';
    } else {
      html += '<h3>Messages</h3>';
      html += '<label for="chan">How should we tell you?</label><select id="chan">' +
        [['app', 'App message'], ['sms', 'SMS, for any phone'], ['off', 'No messages']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.channel === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>';
      html += '<label for="lang">Language</label><select id="lang">' + ['English', '中文', 'Bahasa Melayu', 'தமிழ்'].map(function (l) {
        return '<option' + (state.lang === l ? ' selected' : '') + '>' + l + '</option>';
      }).join('') + '</select>';
      html += '<p class="small" style="margin:0">In this demo, messages stay in English.</p>';
      html += '<h3>What we keep</h3><ul style="margin:0;padding-left:18px;font-size:0.9rem"><li>Tap times, for 30 days.</li><li>Your phone number, until you leave.</li><li>No location. No photos.</li></ul>';
    }
    html += '<div class="nav" role="group" aria-label="Parent app sections">' + TABS.map(function (t) {
      return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (state.parentTab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    $('parent').innerHTML = html;
  }

  $('parent').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-tab')) state.parentTab = b.getAttribute('data-tab');
    else if (b.hasAttribute('data-day')) state.rota[b.getAttribute('data-day')] = true;
    else if (b.id === 'away') {
      var k = aisyah(); k.away = !k.away;
      state.log.unshift(k.away ? 'Leader\'s list: Aisyah marked "Not walking today" by her parent.' : 'Leader\'s list: Aisyah is walking today.');
    }
    renderAll();
  });
  $('parent').addEventListener('change', function (e) {
    if (e.target.id === 'chan') state.channel = e.target.value;
    if (e.target.id === 'lang') state.lang = e.target.value;
  });

  function renderLog() {
    $('log').innerHTML = state.log.length ? state.log.slice(0, 8).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('')
      : '<li>Nothing sent yet. Tap a tag on the leader\'s phone.</li>';
  }

  function renderAll() { renderLeader(); renderParent(); renderLog(); }
  renderAll();
})();
