// Cool-Down Dock simulator. Runs the logic of the version 1 and version 2
// MakeCode programs on a drawn 5 x 5 display. Countdown time is sped up;
// the micro:bit's own pauses (scrolling, the warning) stay in real time so
// you can see them.
(function () {
  'use strict';
  var COOL_MS = 10 * 60000;
  var TOTAL = COOL_MS;

  var FONT = {
    '0': ['.##..', '#..#.', '#..#.', '#..#.', '.##..'],
    '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
    '2': ['###..', '...#.', '.##..', '#....', '####.'],
    '3': ['####.', '...#.', '..#..', '#..#.', '.##..'],
    '4': ['..##.', '.#.#.', '#..#.', '####.', '...#.'],
    '5': ['####.', '#....', '###..', '...#.', '###..'],
    '6': ['..#..', '.#...', '###..', '#..#.', '.##..'],
    '7': ['####.', '...#.', '..#..', '.#...', '#....'],
    '8': ['.##..', '#..#.', '.##..', '#..#.', '.##..'],
    '9': ['.###.', '#..#.', '.###.', '...#.', '..#..']
  };
  var ICONS = {
    yes: ['.....', '....#', '...#.', '#.#..', '.#...'],
    no: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    smallSquare: ['.....', '.###.', '.#.#.', '.###.', '.....'],
    blank: ['.....', '.....', '.....', '.....', '.....']
  };

  var $ = function (id) { return document.getElementById(id); };
  var ledsEl = $('leds');
  var cells = [];
  for (var i = 0; i < 25; i++) {
    var s = document.createElement('span');
    ledsEl.appendChild(s);
    cells.push(s);
  }

  var state = {
    version: 2, speed: 30, sound: true,
    gunIn: false, handUntil: 0, lightsOn: true,
    simT: 0, lastReal: 0,
    parkedAt: -1, done: false, firstReading: true,
    busyUntil: 0, busyShow: null, scrollStart: 0,
    grid: ICONS.blank, lastMsg: ''
  };

  // Sound, made on first click.
  var audio = null;
  function tone(freq, ms, delay) {
    if (!state.sound) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime + (delay || 0) / 1000;
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + ms / 1000 + 0.02);
    } catch (e) { /* no sound available: the words still show */ }
  }

  function clock(ms) {
    var sec = Math.max(0, Math.round(ms / 1000));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function say(msg) {
    if (msg === state.lastMsg) return;
    state.lastMsg = msg;
    $('live').textContent = msg;
    var li = document.createElement('li');
    li.textContent = msg;
    $('log').prepend(li);
    while ($('log').children.length > 12) $('log').lastChild.remove();
  }

  function draw(grid) {
    state.grid = grid;
    var any = false;
    for (var y = 0; y < 5; y++) for (var x = 0; x < 5; x++) {
      var on = grid[y][x] === '#';
      any = any || on;
      cells[y * 5 + x].classList.toggle('on', on);
    }
    var mini = $('mini');
    if (mini) mini.setAttribute('fill', any ? '#ff3b24' : '#5a1a12');
  }
  function leftGrid(count) {
    var rows = [];
    for (var y = 0; y < 5; y++) {
      var r = '';
      for (var x = 0; x < 5; x++) r += (y * 5 + x >= 25 - count) ? '#' : '.';
      rows.push(r);
    }
    return rows;
  }
  function numberGrid(n, now) {
    var digits = String(n);
    if (digits.length === 1) return FONT[digits];
    // Two digits scroll on a real micro:bit. Here they take turns.
    var k = Math.floor((now - state.scrollStart) / 500) % (digits.length + 1);
    return k < digits.length ? FONT[digits[k]] : ICONS.blank;
  }

  function lightLevel(now) {
    var level = state.lightsOn ? 160 : 18;
    if (now < state.handUntil) level = Math.min(level, 24);
    if (state.gunIn) level = 6;
    return level;
  }

  // One pass of basic.forever.
  function stepV1(now) {
    var level = lightLevel(now);
    var boot = state.firstReading;
    if (boot) { level = 0; state.firstReading = false; }
    $('readout').textContent = 'Light level: ' + level + ' (dark is below 40)' +
      (state.parkedAt >= 0 ? ' · Counting: ' + clock(state.simT - state.parkedAt) : '');
    if (level < 40) {
      if (state.parkedAt < 0) {
        state.parkedAt = state.simT;
        state.scrollStart = now;
        if (boot) say('Switched on: the first light reading is 0, so it started counting with no gun.');
        else if (!state.gunIn) say(now < state.handUntil ? 'A hand shaded the sensor. The empty dock started counting.' :
          !state.lightsOn ? 'The room went dark. The empty dock started counting.' :
          'The light dropped. The empty dock started counting.');
        else say('Gun parked. The countdown started, under the gun.');
        if (boot) {
          // showNumber(10) scrolls for about 2 seconds before the next reading.
          state.busyUntil = now + 2000;
          state.busyShow = function (t) { return numberGrid(10, t); };
        }
      }
      var left = Math.ceil((COOL_MS - (state.simT - state.parkedAt)) / 60000);
      if (left > 0) draw(numberGrid(left, now));
      else {
        draw(ICONS.yes);
        say(state.gunIn ? 'Ten minutes: a tick. But nobody can see it under the gun.' : 'A tick on an empty dock. It means nothing.');
      }
    } else {
      if (state.parkedAt >= 0) {
        var was = state.simT - state.parkedAt;
        say(was < COOL_MS && state.lastLift ? 'Gun lifted after ' + clock(was) + '. The screen went blank. No warning.' : 'Light is back. The screen cleared.');
      }
      state.lastLift = false;
      state.parkedAt = -1;
      draw(ICONS.blank);
    }
  }

  function stepV2(now) {
    var pressed = state.gunIn;
    $('readout').textContent = 'Pin 0 pressed: ' + (pressed ? 'yes' : 'no') +
      (state.parkedAt >= 0 ? ' · In dock: ' + clock(state.simT - state.parkedAt) : '');
    if (pressed) {
      if (state.parkedAt < 0) {
        state.parkedAt = state.simT;
        state.done = false;
        tone(523, 150);
        say('Gun parked. Short beep. All 25 lights on: hot.');
      }
      var left = TOTAL - (state.simT - state.parkedAt);
      if (left > 0) draw(leftGrid(Math.ceil(left * 25 / TOTAL)));
      else if (!state.done) {
        state.done = true;
        draw(ICONS.yes);
        tone(988, 300);
        say('Ten minutes: a tick and a high beep. Safe to put away.');
      }
    } else {
      if (state.parkedAt >= 0 && !state.done) {
        tone(262, 500); tone(262, 500, 600);
        say('Lifted after ' + clock(state.simT - state.parkedAt) + ', still cooling. A cross and two low beeps.');
        state.busyUntil = now + 3000;
        state.busyShow = function () { return ICONS.no; };
        state.parkedAt = -1;
        state.done = false;
        return;
      }
      if (state.parkedAt >= 0 && state.done) say('Gun taken out after the tick. The dock is empty again.');
      state.parkedAt = -1;
      state.done = false;
      draw(ICONS.smallSquare);
    }
  }

  function frame(real) {
    if (!state.lastReal) state.lastReal = real;
    var dt = Math.min(real - state.lastReal, 250);
    state.lastReal = real;
    state.simT += dt * state.speed;
    if (real < state.busyUntil) {
      draw(state.busyShow(real));
      if (state.version === 2) $('readout').textContent = 'Pin 0 pressed: ' + (state.gunIn ? 'yes' : 'no') + ' · Showing the warning';
    } else if (state.version === 1) stepV1(real);
    else stepV2(real);
    render(real);
    requestAnimationFrame(frame);
  }

  function render(now) {
    var v1 = state.version === 1;
    $('v1-parts').style.display = v1 ? '' : 'none';
    $('v2-parts').style.display = v1 ? 'none' : '';
    $('gun').setAttribute('transform', state.gunIn ? 'translate(0,0)' : 'translate(10,-92)');
    $('hand').setAttribute('opacity', now < state.handUntil ? '1' : '0');
    $('room').setAttribute('fill', state.lightsOn ? '#fff8ea' : '#3b352c');
    $('lights-label').textContent = state.lightsOn ? 'Room lights on' : 'Room lights off';
    $('lights-label').setAttribute('fill', state.lightsOn ? '#55462f' : '#f3ebe0');
    $('mb').classList.toggle('covered', v1 && state.gunIn);
  }

  function reboot(quiet) {
    state.parkedAt = -1;
    state.done = false;
    state.firstReading = true;
    state.busyUntil = 0;
    state.lastLift = false;
    draw(ICONS.blank);
    if (!quiet) say('The micro:bit restarted.');
  }

  document.querySelectorAll('.versions button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.version = Number(b.dataset.v);
      document.querySelectorAll('.versions button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      state.gunIn = false;
      state.handUntil = 0;
      $('park').textContent = 'Park the gun';
      $('log').textContent = '';
      state.lastMsg = '';
      reboot(true);
      say(state.version === 1 ? 'Version 1 is running. The dock is empty.' : 'Version 2 is running. The dock is empty.');
    });
  });
  $('park').addEventListener('click', function () {
    state.gunIn = !state.gunIn;
    if (!state.gunIn) state.lastLift = true;
    $('park').textContent = state.gunIn ? 'Lift the gun' : 'Park the gun';
  });
  $('hand-btn').addEventListener('click', function () {
    state.handUntil = performance.now() + 2500;
    if (state.version === 2) say('A hand passed over. Pin 0 is not pressed, so nothing happened.');
  });
  $('lights').addEventListener('click', function () {
    state.lightsOn = !state.lightsOn;
    $('lights').setAttribute('aria-pressed', String(!state.lightsOn));
    $('lights').textContent = state.lightsOn ? 'Lights off' : 'Lights on';
    if (state.version === 2) say(state.lightsOn ? 'Lights on. Version 2 does not use light.' : 'Lights off. Version 2 does not use light, so nothing changed.');
  });
  $('reboot').addEventListener('click', function () { reboot(false); });
  $('speed').addEventListener('change', function () { state.speed = Number($('speed').value); });
  $('sound').addEventListener('click', function () {
    state.sound = !state.sound;
    $('sound').setAttribute('aria-pressed', String(state.sound));
    $('sound').textContent = state.sound ? 'Sound: on' : 'Sound: off';
  });

  // Start on version 2, already switched on.
  state.firstReading = false;
  requestAnimationFrame(frame);
})();
