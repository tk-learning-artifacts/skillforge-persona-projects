// Box Box simulator: the M5Stack, the Wi-Fi, Adafruit IO and the pit wall.
// Everything is simulated in this page. The rules follow the real sketch on
// code.html and Adafruit IO's published limits: 30 data points a minute on a
// free account, a rejected MQTT publish disconnects the client, and more than
// 10 rejected publishes in a minute starts a ban of 30 seconds.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const RATE_LIMIT = 30;           // data points per minute, free account
  const BAN_S = 30;                // first temporary ban
  const LOW_V = 6.6;               // warn below this, under load
  const CHART_S = 90;              // seconds shown on the chart
  const VERSIONS = {
    v1: { name: 'Version 1', normal: 2, fast: 1, slow: 5, backoff: false, guard: false, whitelist: false, getOnReconnect: false },
    final: { name: 'Final version', normal: 5, fast: 3, slow: 10, backoff: true, guard: true, whitelist: true, getOnReconnect: true }
  };

  let S;            // the whole simulation state
  let rng = 1;      // a fixed seed, so the demo video and a replay match
  function rand() { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; }

  function fresh(version) {
    rng = 1;
    const v = VERSIONS[version];
    return {
      version, cfg: v, t: 0,
      soc: 1, running: false, wifiOn: true,
      wifiUp: true, wifiBackAt: 0,
      mqtt: true, frozen: false, connecting: false,
      nextTry: 0, backoff: 5, tries: 0, offlineSince: null, missedOffline: 0,
      interval: v.normal, mode: 'NORMAL',
      lastSend: -99, lastScreen: -99, screenV: 0, vMin: null, vMax: null,
      box: false, msg: 'Online', missed: 0, ignored: 0,
      ownSends: [],                 // device publish times, for the local guard
      points: [],                   // cloud feed robot-volts: {t, v}
      account: [],                  // every data point on the account, for the rate limit
      banUntil: -1, rejects: [], lastSeen: 0, statusText: 'booted',
      inbox: [],                    // control messages on their way to the device
      lastCommand: null,
      log: []
    };
  }

  // Battery: 6 NiMH cells, 1.2 V nominal each. A made-up curve, close enough to teach with.
  function packVolts() {
    let cell = 1.12 + 0.2 * S.soc + 0.05 * Math.pow(S.soc, 8);
    let v = cell * 6;
    if (S.soc < 0.1) v -= 6 * (0.1 - S.soc);
    if (S.running) v -= 0.3;
    return v;
  }
  function sample() { return packVolts() + (rand() - 0.5) * (S.running ? 0.24 : 0.04); }
  function readAveraged() { let s = 0; for (let i = 0; i < 10; i++) s += sample(); return s / 10; }

  function log(kind, text) {
    S.log.unshift({ kind, text: fmtClock(S.t) + ' ' + text });
    if (S.log.length > 80) S.log.pop();
  }
  function fmtClock(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function say(text) { const el = $('sim-live'); if (el) el.textContent = text; }

  // Adafruit IO: count a data point, or reject it and disconnect.
  function accountPublish(from) {
    S.account = S.account.filter((x) => S.t - x < 60);
    if (S.account.length >= RATE_LIMIT) {
      log('err', 'IO: rate limit, publish from ' + from + ' rejected. Notice on /throttle.');
      if (from === 'device') {
        S.mqtt = false;
        S.offlineSince = S.offlineSince == null ? S.t : S.offlineSince;
        S.rejects = S.rejects.filter((x) => S.t - x < 60);
        S.rejects.push(S.t);
        if (S.rejects.length > 10) {
          S.banUntil = S.t + BAN_S; S.rejects = [];
          log('err', 'IO: more than 10 rejected in a minute. Device banned for ' + BAN_S + ' s.');
        } else log('err', 'IO: rejected publish. Device disconnected.');
        S.msg = 'THROTTLED';
        // The final version slows down and waits. Version 1 reconnects at once and keeps sending.
        if (S.cfg.guard) { setMode('SLOW', true); S.nextTry = S.t + 5; }
        else { S.tries = 0; S.nextTry = S.t + 0.5; }
      }
      return false;
    }
    S.account.push(S.t);
    return true;
  }

  function setMode(mode, quiet) {
    S.mode = mode;
    S.interval = mode === 'FAST' ? S.cfg.fast : mode === 'SLOW' ? S.cfg.slow : S.cfg.normal;
    if (!quiet) log('sys', 'device: send every ' + S.interval + ' s (' + mode + ')');
  }

  function handleCommand(cmd) {
    const c = cmd.trim().toUpperCase();
    S.lastCommand = c;
    if (c === 'BOX') { S.box = true; S.msg = 'BOX BOX'; beep(); say('Pit call: BOX BOX on the robot screen.'); }
    else if (c === 'CLEAR') { S.box = false; S.msg = 'Clear'; say('Pit call cleared.'); }
    else if (c === 'FAST' || c === 'SLOW') { setMode(c); S.msg = c + ': every ' + S.interval + ' s'; }
    else if (S.cfg.whitelist) { S.ignored++; S.msg = 'Ignored a command'; log('err', 'device: "' + cmd.slice(0, 20) + '" is not a command. Ignored.'); return; }
    else { S.msg = cmd.slice(0, 20); S.box = false; }
    log('down', 'device got "' + c + '"');
  }

  // A button on the dashboard publishes to the pit-call feed.
  function dashboardSend(value) {
    if (!S) return;
    log('sys', 'dashboard: pit-call = "' + value + '"');
    if (!accountPublish('dashboard')) return;
    if (S.mqtt && !S.frozen) S.inbox.push({ at: S.t + 0.4 + rand() * 0.6, value });
    else log('err', 'IO: device not connected. QoS 0 message not delivered.');
    if (!S.running && !S.mqtt) render();
  }

  function tryConnect() {
    if (!S.wifiUp) {
      log('err', 'device: MQTT connect failed (no Wi-Fi)');
      return false;
    }
    if (S.t < S.banUntil) {
      log('err', 'device: MQTT connect refused (banned for ' + Math.ceil(S.banUntil - S.t) + ' s more)');
      return false;
    }
    S.mqtt = true;
    log('sys', 'device: MQTT connected to io.adafruit.com:8883 (TLS)');
    if (S.offlineSince != null) {
      const gone = Math.round(S.t - S.offlineSince);
      if (S.cfg.getOnReconnect) {
        const text = 'back after ' + gone + ' s, missed ' + S.missedOffline;
        if (accountPublish('device')) { S.statusText = text; log('up', 'robot-status <- "' + text + '"'); }
        log('up', 'pit-call/get <- (ask for last command)');
        if (S.lastCloudCommand && S.lastCloudCommand !== S.lastCommand) S.inbox.push({ at: S.t + 0.5, value: S.lastCloudCommand });
      }
    }
    S.offlineSince = null; S.missedOffline = 0;
    S.backoff = 5; S.tries = 0; S.msg = S.box ? 'BOX BOX' : 'Online';
    return true;
  }

  function step(dt) {
    S.t += dt;
    if (S.frozen) return;
    // Battery
    if (S.running) S.soc = Math.max(0, S.soc - dt / 200);
    // Wi-Fi: it takes about 3 s to rejoin once the hotspot is back.
    if (!S.wifiOn && S.wifiUp) {
      S.wifiUp = false;
      if (S.mqtt) { S.mqtt = false; S.offlineSince = S.t; log('err', 'Wi-Fi lost. MQTT link down.'); }
      S.nextTry = Math.max(S.nextTry, S.t + 1);
    }
    if (S.wifiOn && !S.wifiUp && S.t >= S.wifiBackAt) { S.wifiUp = true; log('sys', 'device: Wi-Fi rejoined'); }

    // Reconnect
    if (!S.mqtt && S.t >= S.nextTry) {
      if (!tryConnect()) {
        if (S.cfg.backoff) {
          S.nextTry = S.t + S.backoff;
          S.msg = 'OFFLINE: retry in ' + S.backoff + ' s';
          S.backoff = Math.min(S.backoff * 2, 60);
        } else {
          S.tries++;
          S.msg = 'Connecting... try ' + S.tries + ' of 3';
          S.nextTry = S.t + 5;
          if (S.tries >= 3) {
            S.frozen = true; S.msg = 'FROZEN: press Reset';
            log('err', 'device: 3 tries failed. while(1) runs forever. Screen frozen.');
            say('The version 1 device has frozen. Press Reset on the device.');
            return;
          }
        }
      }
    }
    // Version 1 blocks inside MQTT_connect: no readings, no screen, until it connects.
    const blocked = !S.cfg.backoff && !S.mqtt;

    // Control messages
    if (S.mqtt) {
      const due = S.inbox.filter((m) => m.at <= S.t);
      S.inbox = S.inbox.filter((m) => m.at > S.t);
      due.forEach((m) => handleCommand(m.value));
    }

    // Screen: once a second
    if (!blocked && S.t - S.lastScreen >= 1) {
      S.lastScreen = S.t;
      const v = readAveraged();
      S.screenV = v;
      S.vMin = S.vMin == null ? v : Math.min(S.vMin, v);
      S.vMax = S.vMax == null ? v : Math.max(S.vMax, v);
    }
    // Send
    if (!blocked && S.t - S.lastSend >= S.interval) {
      S.lastSend = S.t;
      const v = Math.round(S.screenV * 100) / 100;
      S.ownSends = S.ownSends.filter((x) => S.t - x < 60);
      if (!S.mqtt) { S.missed++; S.missedOffline++; }
      else if (S.cfg.guard && S.ownSends.length >= 24) {
        S.missed++; log('sys', 'device: own budget of 24 a minute reached. Skipped one send.');
      } else {
        S.ownSends.push(S.t);
        if (accountPublish('device')) {
          S.points.push({ t: S.t, v }); S.lastSeen = S.t;
          log('up', 'robot-volts <- ' + v.toFixed(2));
        } else S.missed++;
      }
    }
    S.points = S.points.filter((p) => S.t - p.t <= CHART_S + 10);
  }

  // Sound: a short beep with Web Audio, only after a click.
  let audio = null;
  function beep() {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 2000; g.gain.value = 0.05;
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + 0.18);
    } catch (e) { /* no sound is fine */ }
  }
  let soundOn = false;

  // ---------- Drawing ----------
  function render() {
    const scr = $('screen');
    scr.classList.toggle('box', S.box && !S.frozen);
    const low = S.screenV > 0 && S.screenV < LOW_V;
    scr.classList.toggle('low', low && !S.box);
    $('scr-wifi').textContent = S.wifiUp ? 'WiFi ok' : 'WiFi --';
    $('scr-wifi').className = S.wifiUp ? 'on' : 'off';
    $('scr-mqtt').textContent = S.mqtt ? 'IO ok' : 'IO --';
    $('scr-mqtt').className = S.mqtt ? 'on' : 'off';
    $('scr-rate').textContent = S.interval + 's';
    $('scr-v').innerHTML = (S.screenV ? S.screenV.toFixed(2) : '-.--') + '<small>V</small>';
    $('scr-min').textContent = 'min ' + (S.vMin == null ? '-.--' : S.vMin.toFixed(2));
    $('scr-max').textContent = 'max ' + (S.vMax == null ? '-.--' : S.vMax.toFixed(2));
    let msg = S.msg;
    if (low && !S.box && S.mqtt && !S.frozen && msg === 'Online') msg = 'LOW: under ' + LOW_V + ' V';
    if (S.missed && S.mqtt && !S.box && msg === 'Online') msg = 'Online. Missed ' + S.missed;
    $('scr-msg').textContent = msg;

    $('clock').textContent = 'T+' + fmtClock(S.t);
    $('soc-bar').style.width = Math.round(S.soc * 100) + '%';
    $('soc-text').textContent = Math.round(S.soc * 100) + '%';
    $('run').textContent = S.running ? 'Stop the run' : 'Start a run';
    $('run').setAttribute('aria-pressed', S.running ? 'true' : 'false');
    $('wifi').textContent = S.wifiOn ? 'Pull the Wi-Fi' : 'Plug the Wi-Fi back';
    $('wifi').setAttribute('aria-pressed', S.wifiOn ? 'false' : 'true');

    // Dashboard tiles
    const last = S.points[S.points.length - 1];
    $('d-last').textContent = last ? last.v.toFixed(2) + ' V' : '--';
    $('d-last').className = 'v' + (last && last.v < LOW_V ? ' warn' : '');
    const ago = last ? S.t - last.t : null;
    $('d-seen').textContent = ago == null ? '--' : Math.floor(ago) + ' s ago';
    $('d-seen').className = 'v' + (ago == null ? '' : ago > 30 ? ' bad' : ago > 15 ? ' warn' : '');
    $('d-status').textContent = S.statusText;
    const used = S.account.filter((x) => S.t - x < 60).length;
    $('rate-bar').style.width = Math.min(100, used / RATE_LIMIT * 100) + '%';
    $('rate-meter').classList.toggle('over', used >= RATE_LIMIT - 2);
    $('rate-text').textContent = used + ' of ' + RATE_LIMIT;
    $('d-ban').textContent = S.t < S.banUntil ? 'Ban ' + Math.ceil(S.banUntil - S.t) + ' s' : 'OK';

    drawChart();
    const list = $('log');
    list.innerHTML = '';
    S.log.slice(0, 40).forEach((e) => {
      const li = document.createElement('li');
      li.className = e.kind; li.textContent = e.text;
      list.appendChild(li);
    });
  }

  function drawChart() {
    const W = 400, H = 220, L = 34, R = 8, T = 10, B = 22;
    const lo = 5.8, hi = 8.4;
    const x = (t) => L + (W - L - R) * (1 - (S.t - t) / CHART_S);
    const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    let s = '';
    for (let v = 6; v <= 8; v += 0.5) {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#233042" />`;
      s += `<text x="${L - 4}" y="${y(v) + 4}" fill="#8c9bb0" font-size="13" text-anchor="end">${v.toFixed(1)}</text>`;
    }
    s += `<line x1="${L}" x2="${W - R}" y1="${y(LOW_V)}" y2="${y(LOW_V)}" stroke="#f5b84a" stroke-dasharray="5 4" />`;
    s += `<text x="${L + 6}" y="${y(LOW_V) + 16}" fill="#f5b84a" font-size="13">swap line ${LOW_V} V</text>`;
    s += `<text x="${L}" y="${H - 6}" fill="#8c9bb0" font-size="13">90 s ago</text>`;
    s += `<text x="${W - R}" y="${H - 6}" fill="#8c9bb0" font-size="13" text-anchor="end">now</text>`;
    // Break the line where readings are missing.
    let path = '', prev = null;
    S.points.forEach((p) => {
      if (S.t - p.t > CHART_S) return;
      const gap = prev && p.t - prev.t > Math.max(S.interval, 5) * 2.2;
      path += (prev && !gap ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' ';
      prev = p;
    });
    s += `<path d="${path}" fill="none" stroke="#39d0f0" stroke-width="2.5" stroke-linejoin="round" />`;
    S.points.forEach((p) => { if (S.t - p.t <= CHART_S) s += `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.2" fill="#39d0f0" />`; });
    $('chart').innerHTML = s;
  }

  // ---------- Controls ----------
  let speed = 1, paused = false, demo = null;
  function reset(version) {
    S = fresh(version || (S && S.version) || 'final');
    S.lastCloudCommand = null;
    log('sys', 'device: ' + S.cfg.name + ' booted. Sends every ' + S.interval + ' s.');
    $('ver-name').textContent = S.cfg.name;
    document.querySelectorAll('[data-ver]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ver === S.version ? 'true' : 'false'));
    caption('');
    render();
  }
  function caption(text) { const c = $('caption'); if (c) c.textContent = text; }

  function wire() {
    $('run').addEventListener('click', () => { soundOn = true; S.running = !S.running; log('sys', S.running ? 'robot: run started' : 'robot: run stopped'); render(); });
    $('swap').addEventListener('click', () => { S.soc = 1; S.vMin = null; S.vMax = null; log('sys', 'robot: fresh pack fitted'); render(); });
    $('wifi').addEventListener('click', () => {
      S.wifiOn = !S.wifiOn;
      if (S.wifiOn) S.wifiBackAt = S.t + 3;
      log('sys', S.wifiOn ? 'hotspot: back on' : 'hotspot: switched off');
      render();
    });
    $('btn-a').addEventListener('click', () => { if (S.frozen) return; S.vMin = null; S.vMax = null; S.msg = 'Min and max reset'; render(); });
    $('btn-reset').addEventListener('click', () => {
      const keep = { soc: S.soc, running: S.running, wifiOn: S.wifiOn, points: S.points, account: S.account, banUntil: S.banUntil, rejects: S.rejects, t: S.t, log: S.log, lastCloudCommand: S.lastCloudCommand, statusText: S.statusText };
      S = Object.assign(fresh(S.version), keep);
      S.wifiUp = S.wifiOn; S.mqtt = false; S.offlineSince = S.t; S.nextTry = S.t + 1;
      log('sys', 'device: reset pressed. Booting.');
      render();
    });
    document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => {
      soundOn = true; S.lastCloudCommand = b.dataset.cmd; dashboardSend(b.dataset.cmd); render();
    }));
    $('custom-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('custom').value.trim();
      if (!v) return;
      dashboardSend(v); $('custom').value = ''; render();
    });
    document.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => { stopDemo(); reset(b.dataset.ver); }));
    $('speed').addEventListener('change', (e) => { speed = Number(e.target.value); });
    $('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; });
    $('demo').addEventListener('click', () => { soundOn = true; startDemo(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !recording) { paused = true; $('pause').textContent = 'Resume'; } });
  }

  // ---------- The scripted demo (the same script made demo.mp4) ----------
  const SCRIPT = [
    [0, 'Box Box: our robot battery, live on the pit wall.', () => { S.soc = 0.32; }],
    [2, 'Run starts. The M5Stack reads the pack and sends every 5 s.', () => { S.running = true; log('sys', 'robot: run started'); }],
    [9, 'Each reading goes by MQTT, over TLS, to an Adafruit IO feed.', null],
    [15, 'We pull the Wi-Fi. The screen keeps going. It counts what it missed.', () => { S.wifiOn = false; log('sys', 'hotspot: switched off'); }],
    [25, 'Wi-Fi back. It reconnects, then reports the gap.', () => { S.wifiOn = true; S.wifiBackAt = S.t + 3; log('sys', 'hotspot: back on'); }],
    [33, 'FAST: every 3 s. 20 a minute stays under the free limit of 30.', () => { S.lastCloudCommand = 'FAST'; dashboardSend('FAST'); }],
    [39, 'Under 6.6 V while running. The coach presses BOX.', null],
    [41, 'BOX BOX reaches the robot screen in about a second.', () => { S.lastCloudCommand = 'BOX'; dashboardSend('BOX'); }],
    [47, 'Run stopped. Fresh pack in. CLEAR.', () => { S.running = false; S.soc = 1; S.vMin = null; S.vMax = null; S.lastCloudCommand = 'CLEAR'; dashboardSend('CLEAR'); log('sys', 'robot: fresh pack fitted'); }],
    [53, 'Back to work. Test, change one thing, test again.', null],
    [56, '', null]
  ];
  function startDemo() {
    reset('final');
    S.soc = 0.32;
    demo = { i: 0 };
    speed = 1; $('speed').value = '1';
    paused = false; $('pause').textContent = 'Pause';
    document.querySelector('.wall').classList.add('recording');
  }
  function stopDemo() { demo = null; if (!recording) document.querySelector('.wall').classList.remove('recording'); }
  function demoTick() {
    if (!demo) return;
    while (demo.i < SCRIPT.length && S.t >= SCRIPT[demo.i][0]) {
      const [, text, fn] = SCRIPT[demo.i];
      if (fn) fn();
      caption(text);
      demo.i++;
    }
    if (demo.i >= SCRIPT.length) stopDemo();
  }

  // ---------- Loop ----------
  let last = null, recording = false;
  function frame(now) {
    if (last == null) last = now;
    let dt = Math.min(0.25, (now - last) / 1000) * speed;
    last = now;
    if (!paused && !recording) {
      while (dt > 0) { const d = Math.min(0.1, dt); step(d); demoTick(); dt -= d; }
      render();
    }
    requestAnimationFrame(frame);
  }

  // The recorder drives the clock itself, one frame at a time.
  window.boxBoxRecorder = {
    start() { recording = true; startDemo(); render(); },
    advance(seconds) { let dt = seconds; while (dt > 1e-9) { const d = Math.min(0.1, dt); step(d); demoTick(); dt -= d; } render(); return S.t; },
    length: SCRIPT[SCRIPT.length - 1][0]
  };

  reset(new URLSearchParams(location.search).get('v') === '1' ? 'v1' : 'final');
  wire();
  requestAnimationFrame(frame);
})();
