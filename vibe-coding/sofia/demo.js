// Starts Kopi Rush on the page, and runs the 90-second demo. The demo plays
// the real game: a red ring shows each tap, and captions tell the story.
// I first made this for the parents' showcase screen on the last camp day.
(function () {
  'use strict';

  const LENGTH = 90;
  const wrap = document.getElementById('demo-wrap');
  const holder = document.getElementById('game');
  const ring = document.getElementById('ring');
  const card = document.getElementById('titlecard');
  const bar = document.getElementById('demo-bar');
  const caption = document.getElementById('caption');
  const playBtn = document.getElementById('demo-play');
  const stopBtn = document.getElementById('demo-stop');
  const seekBar = document.getElementById('demo-seek');
  const clock = document.getElementById('demo-clock');
  const watchBtn = document.getElementById('watch');

  let game = null, now = 0, playing = false, last = 0, inDemo = false;

  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function start(demo) {
    if (game) game.stop();
    game = window.KopiGame.mount(holder, demo
      ? { random: seeded(7), autoNext: false, lockMs: 0 }
      : {});
  }

  const q = (sel) => holder.querySelector(sel);

  function tap(target, instant) {
    if (!target) return;
    const box = target.getBoundingClientRect();
    const base = wrap.getBoundingClientRect();
    ring.style.transition = instant ? 'none' : '';
    ring.style.left = (box.left - base.left + box.width / 2) + 'px';
    ring.style.top = (box.top - base.top + box.height / 2) + 'px';
    ring.classList.add('show');
    target.click();
    if (!instant) {
      const view = target.getBoundingClientRect();
      if (view.top < bar.offsetHeight + 10 || view.bottom > window.innerHeight - 10) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      ring.classList.remove('tap');
      void ring.offsetWidth;
      ring.classList.add('tap');
    }
  }

  const press = (part, key) => (i) => tap(q('[data-part="' + part + '"][data-key="' + key + '"]'), i);
  const act = (name) => (i) => tap(q('[data-act="' + name + '"]'), i);
  const mode = (name) => (i) => tap(q('[data-mode="' + name + '"]'), i);
  const order = (code) => () => game.setOrder(code);

  // t: second. cap: the caption from that second. do: what happens.
  const steps = [
    { t: 0, chapter: 'Start', cap: 'This is Kopi Rush. You run the drinks stall in a kopitiam. Customers order in kopitiam code.',
      do: () => { card.hidden = false; } },
    { t: 6, chapter: 'Learn', cap: 'Learn mode has no timer. Table 3 wants Kopi O. The code board says O means no milk.',
      do: () => { card.hidden = true; game.setOrder('Kopi O'); } },
    { t: 10, do: press('drink', 'kopi') },
    { t: 12, do: press('milk', 'none') },
    { t: 14, cap: 'No sugar word means normal sugar. No peng means hot.', do: press('sugar', 'normal') },
    { t: 16, do: press('temp', 'hot') },
    { t: 18, cap: 'Serve. The cup matches the order, so the customer is happy.', do: act('serve') },
    { t: 23, chapter: 'A mistake', cap: 'Next, Teh C siew dai. Watch me get one part wrong on purpose.', do: order('Teh C siew dai') },
    { t: 26, do: press('drink', 'teh') },
    { t: 28, do: press('milk', 'condensed') },
    { t: 30, do: press('sugar', 'less') },
    { t: 32, do: press('temp', 'hot') },
    { t: 34, cap: 'The customer tells you what was wrong, and the rule. C means evaporated milk.', do: act('serve') },
    { t: 40, cap: 'The wrong cup stays. Fix just the milk and serve again.', do: press('milk', 'evaporated') },
    { t: 43, do: act('serve') },
    { t: 46, chapter: 'Level 3', cap: 'Higher levels add more words. Kopi O kosong peng is no milk, no sugar, iced.', do: order('Kopi O kosong peng') },
    { t: 48, do: press('drink', 'kopi') },
    { t: 49, do: press('milk', 'none') },
    { t: 50, do: press('sugar', 'none') },
    { t: 51, do: press('temp', 'iced') },
    { t: 52, do: act('serve') },
    { t: 55, chapter: 'Rush', cap: 'Rush mode is for early finishers. 90 seconds, and the code board is hidden.', do: mode('rush') },
    { t: 57, do: order('Teh peng') },
    { t: 59, cap: 'Stuck? Peek shows the board for 3 seconds. Then it hides again.', do: act('peek') },
    { t: 63, do: press('drink', 'teh') },
    { t: 64, do: press('milk', 'condensed') },
    { t: 65, do: press('sugar', 'normal') },
    { t: 66, do: press('temp', 'iced') },
    { t: 67, do: act('serve') },
    { t: 70, chapter: 'Call it', cap: 'Call it flips the game. You see the drink and pick its order.', do: mode('call') },
    { t: 75, cap: 'Younger campers like this one best. You read the cup, not the code.',
      do: (i) => tap(q('[data-answer="' + game.current() + '"]'), i) },
    { t: 80, chapter: 'Bug hunt', cap: 'My campers broke it in a two-minute bug hunt. Each bug they found became a prompt.',
      do: () => { ring.classList.remove('show'); } },
    { t: 85, chapter: 'End', cap: 'Have a go yourself. Then read how I built it with Claude.',
      do: () => { card.hidden = false; card.querySelector('span').textContent = 'Play it, then read the prompt log.'; } }
  ];

  function format(sec) {
    const s = Math.floor(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function apply(instant) {
    let cap = '';
    steps.forEach((s) => {
      if (s.t > now) return;
      if (s.cap) cap = s.cap;
      if (!s.done) { s.done = true; s.do(instant); }
    });
    if (caption.textContent !== cap) caption.textContent = cap;
    seekBar.value = now;
    clock.textContent = format(now) + ' / ' + format(LENGTH);
  }

  function seek(t) {
    start(true);
    card.querySelector('span').textContent = 'A kopitiam drinks game for camp. Made with Claude and my campers.';
    steps.forEach((s) => { s.done = false; });
    ring.classList.remove('show');
    now = Math.max(0, Math.min(LENGTH, t));
    apply(true);
    game.hold(!playing);
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
    wrap.classList.toggle('playing', on);
    playBtn.textContent = on ? 'Pause' : (now >= LENGTH ? 'Play again' : 'Play');
    if (on && now >= LENGTH) seek(0);
    game.hold(!on);
    if (on) {
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function openDemo(at) {
    inDemo = true;
    bar.hidden = false;
    watchBtn.hidden = true;
    playing = true;
    seek(at || 0);
    setPlaying(true);
    bar.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function closeDemo() {
    playing = false;
    inDemo = false;
    wrap.classList.remove('playing');
    bar.hidden = true;
    watchBtn.hidden = false;
    card.hidden = true;
    ring.classList.remove('show');
    start(false);
  }

  watchBtn.addEventListener('click', () => openDemo(0));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  stopBtn.addEventListener('click', closeDemo);
  seekBar.addEventListener('input', () => seek(Number(seekBar.value)));

  const chapters = document.getElementById('chapters');
  const script = document.getElementById('script');
  steps.forEach((s) => {
    if (s.chapter) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn plain';
      b.textContent = format(s.t) + ' ' + s.chapter;
      b.addEventListener('click', () => (inDemo ? (seek(s.t), setPlaying(true)) : openDemo(s.t)));
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

  start(false);
})();
