// Lights On, Nobody Home: the gateway page.
// Reads name:value lines from the gateway micro:bit over Web Serial, builds one
// row every 5 minutes, posts it to the Apps Script web app, and passes the mode
// in the reply back to the micro:bit. Failed rows wait in a queue in
// localStorage. The web app address and token live in localStorage only.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'lonh-settings', QKEY = 'lonh-queue';
  const BLOCK_MS = 5 * 60 * 1000;
  const SILENT_MS = 3 * 60 * 1000;

  let settings = load(KEY, { url: '', token: '', room: '2E', lit: 70, quiet: 80 });
  let queue = load(QKEY, []);
  let source = 'none';           // 'none', 'serial' or 'demo'
  let port = null, reader = null, writer = null;
  let demoTimer = null, demoClock = 0;
  let minutes = [], cur = {}, blockStart = null, lastHeard = null, mode = null, sending = false;
  const sent = [];

  function load(k, fallback) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { log('bad', 'Could not save to local storage.'); } }

  // In made-up mode a minute passes every 2 seconds.
  function now() { return source === 'demo' ? demoClock : Date.now(); }
  function sgTime(ms) {   // Singapore time, UTC+8, as 2026-10-21T10:05:00+08:00
    return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 16) + ':00+08:00';
  }
  function hhmm(ms) { return sgTime(ms).slice(11, 16); }

  function log(kind, text) {
    const li = document.createElement('li');
    li.className = kind;
    li.textContent = hhmm(now()) + ' ' + text;
    const ul = $('log');
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 80) ul.removeChild(ul.lastChild);
  }

  // ---------- Lines from the micro:bit ----------
  function handleLine(line) {
    const m = /^([a-z]+):(-?\d+(?:\.\d+)?)$/.exec(line.trim());
    if (!m) { log('bad', 'Ignored a line: ' + line.slice(0, 40)); return; }
    const name = m[1], value = Number(m[2]);
    if (name === 'from') { log('', 'Reading came from serial number ' + value + '. Put it in NODE_SERIAL.'); return; }
    if (name === 'stranger') { log('bad', 'Ignored a micro:bit with serial number ' + value + '.'); return; }
    if (name !== 'light' && name !== 'sound' && name !== 'temp') { log('bad', 'Ignored "' + name + '".'); return; }
    if (value < -10 || value > 255) { log('bad', 'Ignored ' + name + ' = ' + value + ': out of range.'); return; }
    lastHeard = now();
    if (blockStart == null) blockStart = Math.floor(now() / BLOCK_MS) * BLOCK_MS;
    if (cur[name] != null) closeMinute();          // a reading went missing: keep what we have
    cur[name] = value;
    log('', line.trim());
    if (name === 'temp') closeMinute();
    checkBlock();
  }

  function closeMinute() {
    if (cur.light == null && cur.sound == null && cur.temp == null) return;
    minutes.push({ at: now(), light: cur.light, sound: cur.sound, temp: cur.temp });
    cur = {};
    renderBlock();
  }

  // Close the 5-minute block when its time is up. Runs on every line, and on a
  // backup check every 30 s, so a silent node still gets its row.
  function checkBlock() {
    if (blockStart == null) blockStart = Math.floor(now() / BLOCK_MS) * BLOCK_MS;
    while (now() >= blockStart + BLOCK_MS) {
      const inBlock = minutes.filter((x) => x.at < blockStart + BLOCK_MS);
      minutes = minutes.filter((x) => x.at >= blockStart + BLOCK_MS);
      queue.push(buildRow(blockStart, inBlock));
      save(QKEY, queue);
      blockStart += BLOCK_MS;
    }
    renderStatus();
    renderBlock();
    flush();
  }

  function buildRow(start, list) {
    const t = sgTime(start);
    const row = { id: settings.room + '-' + t.slice(0, 16), time: t, room: settings.room };
    const nums = (k) => list.map((x) => x[k]).filter((v) => typeof v === 'number');
    const light = nums('light'), sound = nums('sound'), temp = nums('temp');
    if (!list.length) {
      return Object.assign(row, { light: null, sound_peak: null, temp_c: null, lit_quiet_min: null, status: 'node silent' });
    }
    row.light = light.length ? Math.round(light.reduce((a, b) => a + b, 0) / light.length) : null;
    row.sound_peak = sound.length ? Math.max(...sound) : null;
    row.temp_c = temp.length ? Math.round(temp.reduce((a, b) => a + b, 0) / temp.length * 10) / 10 : null;
    row.lit_quiet_min = list.filter((x) => x.light > settings.lit && x.sound < settings.quiet).length;
    row.status = list.length < 5 ? 'partial' : 'ok';
    return row;
  }

  // ---------- Posting ----------
  async function post(row) {
    if (source === 'demo') return fakeWebApp(row);
    if (!settings.url) throw new Error('no web app address in Settings');
    // A string body is sent as text/plain, a "simple" request: no preflight.
    const res = await fetch(settings.url, { method: 'POST', body: JSON.stringify(Object.assign({}, row, { token: settings.token })) });
    return res.json();
  }

  function fakeWebApp(row) {
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true, mode: $('fake-mode').value }), 250));
  }

  async function flush() {
    if (sending || !queue.length) return;
    sending = true;
    try {
      while (queue.length) {
        const row = queue[0];
        let reply;
        try { reply = await post(row); }
        catch (e) { log('bad', 'Post ' + row.time.slice(11, 16) + ' failed: ' + e.message + '. Kept in the queue.'); break; }
        if (reply && reply.ok) {
          queue.shift(); save(QKEY, queue);
          sent.unshift({ row, reply }); if (sent.length > 10) sent.pop();
          log('ok', 'Row ' + row.time.slice(11, 16) + ' saved. Mode: ' + reply.mode);
          setMode(reply.mode);
        } else if (reply && reply.error === 'value out of range') {
          queue.shift(); save(QKEY, queue);
          log('bad', 'Row ' + row.time.slice(11, 16) + ' refused (value out of range). Dropped.');
        } else {
          log('bad', 'Web app said: ' + JSON.stringify(reply) + '. Check Settings. Kept in the queue.');
          break;
        }
      }
    } finally {
      sending = false;
      renderStatus(); renderSent();
    }
  }

  async function setMode(m) {
    if (m !== 'remind' && m !== 'quiet' && m !== 'test') return;
    if (m === mode && m !== 'test') return;
    mode = m;
    log('out', 'To micro:bit: mode:' + m);
    if (writer) { try { await writer.write('mode:' + m + '\n'); } catch (e) { log('bad', 'Could not write to the micro:bit.'); } }
    renderStatus();
  }

  // ---------- Web Serial ----------
  async function connect() {
    if (!('serial' in navigator)) { log('bad', 'Web Serial is not available here. Use Chrome on a computer or Chromebook.'); return; }
    await stopAll();
    try {
      port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x0d28 }] });
      await port.open({ baudRate: 115200 });
    } catch (e) { log('bad', 'No micro:bit opened: ' + e.message); port = null; return; }
    source = 'serial'; blockStart = null; minutes = []; cur = {};
    log('ok', 'Connected at 115200 baud.');
    const enc = new TextEncoderStream();
    enc.readable.pipeTo(port.writable).catch(() => {});
    writer = enc.writable.getWriter();
    const dec = new TextDecoderStream();
    port.readable.pipeTo(dec.writable).catch(() => {});
    reader = dec.readable.getReader();
    renderStatus();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line) handleLine(line);
        }
      }
    } catch (e) {
      log('bad', 'The micro:bit was unplugged or reset.');
    }
  }

  async function stopAll() {
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    if (reader) { try { await reader.cancel(); } catch (e) { /* already closed */ } reader = null; }
    if (writer) { try { await writer.close(); } catch (e) { /* already closed */ } writer = null; }
    if (port) { try { await port.close(); } catch (e) { /* already closed */ } port = null; }
    if (source !== 'none') log('', 'Stopped.');
    source = 'none';
    $('fake-control').hidden = true;
    renderStatus();
  }

  // ---------- Made-up readings ----------
  let demoMinute = 0;
  async function startDemo() {
    await stopAll();
    source = 'demo';
    demoClock = Math.floor(Date.now() / BLOCK_MS) * BLOCK_MS;
    demoMinute = 0; blockStart = null; minutes = []; cur = {};
    $('fake-control').hidden = false;
    log('ok', 'Made-up readings: one minute every 2 seconds. Nothing leaves this computer.');
    demoTimer = setInterval(demoTick, 2000);
    demoTick();
    renderStatus();
  }
  function demoTick() {
    demoMinute++;
    // A class for 6 minutes, then the room empties with the lights on.
    const phase = demoMinute % 12;
    const inClass = phase < 6;
    const lightsOn = phase < 9;
    const jitter = (n) => Math.round((Math.random() - 0.5) * n);
    handleLine('light:' + ((lightsOn ? 110 : 38) + jitter(20)));
    handleLine('sound:' + ((inClass ? 150 : 52) + jitter(30)));
    handleLine('temp:' + (29 + jitter(2)));
    demoClock += 60 * 1000;
  }

  // ---------- Drawing ----------
  function renderStatus() {
    const support = 'serial' in navigator;
    $('support').innerHTML = support
      ? '<span class="good">Web Serial is available in this browser.</span>'
      : '<span class="bad">Web Serial is not available in this browser. Made-up readings still work.</span>';
    $('connect').disabled = !support;
    $('source').textContent = source === 'serial' ? 'micro:bit' : source === 'demo' ? 'made-up' : 'none';
    if (lastHeard == null || source === 'none') $('heard').textContent = 'never';
    else {
      const ago = Math.max(0, Math.round((now() - lastHeard) / 60000));
      $('heard').textContent = ago >= SILENT_MS / 60000 ? 'silent ' + ago + ' min' : ago + ' min ago';
    }
    $('waiting').textContent = queue.length;
    $('mode').textContent = mode || 'unknown';
  }
  function cellOf(v) { return v == null ? '<td class="n blank"></td>' : '<td class="n">' + v + '</td>'; }
  function renderBlock() {
    const list = minutes.slice(-5);
    $('block').innerHTML = list.length ? list.map((x) => '<tr><td>' + hhmm(x.at) + '</td>' + cellOf(x.light) + cellOf(x.sound) + cellOf(x.temp) +
      '<td>' + (x.light > settings.lit && x.sound < settings.quiet ? 'yes' : 'no') + '</td></tr>').join('')
      : '<tr><td colspan="5">Waiting for readings.</td></tr>';
  }
  function renderSent() {
    $('sent').innerHTML = sent.length ? sent.map(({ row, reply }) => '<tr><td>' + row.time.slice(11, 16) + '</td>' + cellOf(row.light) + cellOf(row.sound_peak) +
      cellOf(row.temp_c) + cellOf(row.lit_quiet_min) + '<td>' + row.status + '</td><td>' + (reply.ok ? 'ok, ' + reply.mode : 'refused') + '</td></tr>').join('')
      : '<tr><td colspan="7">No rows yet. The first one comes after 5 minutes.</td></tr>';
  }

  // ---------- Settings ----------
  function fillSettings() {
    $('url').value = settings.url; $('token').value = settings.token; $('room').value = settings.room;
    $('lit').value = settings.lit; $('quiet').value = settings.quiet;
  }
  $('settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = $('url').value.trim();
    if (url && !/^https:\/\/script\.google\.com\//.test(url)) { $('saved').textContent = 'The address should start with https://script.google.com/'; return; }
    settings = { url, token: $('token').value, room: $('room').value.trim().toUpperCase() || '2E',
      lit: Number($('lit').value) || 70, quiet: Number($('quiet').value) || 80 };
    save(KEY, settings);
    $('saved').textContent = 'Saved in this browser.';
  });
  $('forget').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); localStorage.removeItem(QKEY); } catch (e) { /* nothing saved */ }
    settings = { url: '', token: '', room: '2E', lit: 70, quiet: 80 }; queue = [];
    fillSettings(); renderStatus();
    $('saved').textContent = 'Settings and queue removed from this browser.';
  });

  $('connect').addEventListener('click', connect);
  $('demo').addEventListener('click', startDemo);
  $('stop').addEventListener('click', stopAll);
  $('flush').addEventListener('click', flush);
  setInterval(() => { if (source === 'serial') checkBlock(); else renderStatus(); }, 30000);

  fillSettings(); renderStatus(); renderBlock(); renderSent();
  if (queue.length) log('', queue.length + ' rows are waiting from last time.');
})();
