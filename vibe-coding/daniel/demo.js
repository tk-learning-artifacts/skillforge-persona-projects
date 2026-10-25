// The 90-second demo. It drives the real Fair Picker: a cursor moves to each
// button and clicks it, and my voice-over shows as captions.
(function () {
  'use strict';

  const LENGTH = 90;
  const NAMES = ['Aaron', 'Bala', 'Chloe', 'Dinesh', 'Farah', 'Hui Min', 'Irfan', 'Jia Hui', 'Kavya', 'Nur Aisyah', 'Ryan', 'Wei Jie'];
  const TRICK = '<img src=x onerror=alert(1)>';

  const screen = document.getElementById('screen');
  const stage = document.getElementById('stage');
  const cursor = document.getElementById('cursor');
  const card = document.getElementById('titlecard');
  const caption = document.getElementById('caption');
  const playBtn = document.getElementById('play');
  const restartBtn = document.getElementById('restart');
  const bar = document.getElementById('progress');
  const clock = document.getElementById('clock');

  let app, root, now = 0, playing = false, last = 0;

  // The same seed every time, so the demo always picks the same students.
  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const q = (sel) => root.querySelector(sel);
  const tab = (key) => q('[data-tab="' + key + '"]');
  const act = (name) => q('.fp-panel:not([hidden]) [data-act="' + name + '"]');
  const chip = (name) => q('[data-name="' + name + '"]');
  const list = () => q('textarea');

  // Scroll the app's own box so a target is in view. The page itself never moves.
  function reveal(target) {
    let top = 0;
    for (let node = target; node && node !== root; node = node.offsetParent) top += node.offsetTop;
    if (top < root.scrollTop + 60 || top + target.offsetHeight > root.scrollTop + root.clientHeight - 20) {
      root.scrollTop = Math.max(0, top - 120);
    }
  }

  function moveTo(target, instant) {
    if (!target) return;
    reveal(target);
    const s = scale();
    const box = target.getBoundingClientRect();
    const base = stage.getBoundingClientRect();
    const x = (box.left - base.left) / s + Math.min(40, box.width / 2);
    const y = (box.top - base.top) / s + box.height / 2;
    cursor.style.transition = instant ? 'none' : '';
    cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }

  function click(target, instant) {
    if (!target) return;
    moveTo(target, instant);
    target.click();
    if (instant) return;
    cursor.classList.remove('click');
    void cursor.offsetWidth;
    cursor.classList.add('click');
  }

  function typeInto(text, progress) {
    const box = list();
    box.value = text.slice(0, Math.round(text.length * progress));
    box.scrollTop = box.scrollHeight;
  }

  const namesText = NAMES.join('\n');
  // Each step: t (second), cap (caption from that second), do (what happens).
  // A step with dur types over that many seconds.
  const steps = [
    { t: 0, chapter: 'Start', cap: "Hi, I'm Daniel. This is Fair Picker. It picks students for my Sec 2 class, with no repeats.",
      do: () => { card.hidden = false; } },
    { t: 6, chapter: 'Class list', cap: 'First, the class list. I paste one name per line. These names are made up.',
      do: (i) => { card.hidden = true; click(tab('class'), i); } },
    { t: 9, dur: 8, do: (i, p) => { moveTo(list(), i); typeInto(namesText, p); } },
    { t: 18, cap: 'Save list keeps it in this browser only. Nothing is sent anywhere.',
      do: (i) => click(act('save'), i) },
    { t: 22, chapter: 'Pick', cap: 'Now the Pick tab. Pick next chooses someone who has not had a turn yet.',
      do: (i) => click(tab('pick'), i) },
    { t: 25, do: (i) => click(act('pick'), i) },
    { t: 28, do: (i) => click(act('pick'), i) },
    { t: 31, do: (i) => click(act('pick'), i) },
    { t: 33, cap: 'The counter shows who is left this round. Picked names line up below the big box.',
      do: (i) => moveTo(q('.fp-count'), i) },
    { t: 38, cap: 'Picked someone by mistake? Undo puts them back in the round.',
      do: (i) => click(act('undo'), i) },
    { t: 43, chapter: 'Absent', cap: 'Two students are away today. I tap their names to mark them absent.',
      do: (i) => click(tab('class'), i) },
    { t: 46, do: (i) => click(chip('Chloe'), i) },
    { t: 49, do: (i) => click(chip('Irfan'), i) },
    { t: 52, cap: 'Pick next skips them. They keep their turn for when they come back.',
      do: (i) => moveTo(chip('Irfan'), i) },
    { t: 55, chapter: 'Groups', cap: 'Groups next. The size is set to 3.',
      do: (i) => click(tab('groups'), i) },
    { t: 59, cap: 'Ten students are here, so I get groups of 4, 3 and 3. Nobody is left alone.',
      do: (i) => click(act('groups'), i) },
    { t: 66, cap: "ChatGPT's first version left one student on their own. That was one of my fixes by hand.",
      do: (i) => moveTo(q('.fp-help'), i) },
    { t: 70, chapter: 'Safety test', cap: 'Last, a safety test from MDN. I add a "name" that is really a piece of code.',
      do: (i) => click(tab('class'), i) },
    { t: 73, dur: 3, do: (i, p) => { moveTo(list(), i); typeInto(namesText + '\n' + TRICK, (NAMES.join('\n').length + 1 + TRICK.length * p) / (namesText.length + 1 + TRICK.length)); } },
    { t: 78, cap: "It shows up as plain text, so it can't run. ChatGPT's first version used innerHTML, and that ran it.",
      do: (i) => { click(act('save'), i); moveTo(chip(TRICK), i); } },
    { t: 85, chapter: 'End', cap: 'That is Fair Picker. My prompt log and the code are on the next pages. Thanks for watching.',
      do: () => { card.hidden = false; card.querySelector('strong').textContent = 'Thanks for watching'; card.querySelector('span').textContent = 'Prompt log, code and reflection are on this site.'; } }
  ];

  function scale() { return screen.clientWidth / 800; }
  function fit() { stage.style.transform = 'scale(' + scale() + ')'; }

  function fresh() {
    stage.querySelectorAll('.fp').forEach((n) => n.remove());
    root = document.createElement('div');
    stage.insertBefore(root, cursor);
    app = window.FairPicker.mount(root, { storage: false, random: seeded(2026) });
    card.querySelector('strong').textContent = 'Fair Picker';
    card.querySelector('span').textContent = 'A name picker with no repeats. Made with ChatGPT and me.';
    steps.forEach((s) => { s.done = false; });
    cursor.style.transition = 'none';
    cursor.style.transform = 'translate(380px, 300px)';
  }

  function format(sec) {
    const s = Math.floor(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function apply(instant) {
    let cap = '';
    steps.forEach((s) => {
      if (s.t > now) return;
      if (s.cap) cap = s.cap;
      if (s.dur) {
        if (s.done) return;
        const p = Math.min(1, (now - s.t) / s.dur);
        s.do(instant, p);
        if (p >= 1) s.done = true;
      } else if (!s.done) {
        s.done = true;
        s.do(instant);
      }
    });
    if (caption.textContent !== cap) caption.textContent = cap;
    bar.value = now;
    clock.textContent = format(now) + ' / ' + format(LENGTH);
  }

  function seek(t) {
    fresh();
    now = Math.max(0, Math.min(LENGTH, t));
    apply(true);
  }

  function tick(time) {
    if (!playing) return;
    now += Math.min(0.1, (time - last) / 1000);
    last = time;
    if (now >= LENGTH) { now = LENGTH; setPlaying(false); }
    apply(false);
    if (playing) requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? 'Pause' : (now >= LENGTH ? 'Play again' : 'Play');
    if (on) {
      if (now >= LENGTH) seek(0);
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  restartBtn.addEventListener('click', () => { seek(0); setPlaying(true); });
  bar.addEventListener('input', () => seek(Number(bar.value)));

  const chapters = document.getElementById('chapters');
  const script = document.getElementById('script');
  steps.forEach((s) => {
    if (s.chapter) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = format(s.t) + ' ' + s.chapter;
      b.addEventListener('click', () => { seek(s.t); setPlaying(true); });
      const li = document.createElement('li');
      li.append(b);
      chapters.append(li);
    }
    if (s.cap) {
      const li = document.createElement('li');
      const time = document.createElement('b');
      time.textContent = format(s.t) + ' ';
      li.append(time, s.cap);
      script.append(li);
    }
  });

  window.addEventListener('resize', fit);
  fit();
  seek(0);
})();
