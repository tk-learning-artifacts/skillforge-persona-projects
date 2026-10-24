// The browser copy of Hitbox. It follows the Kotlin app: the same words, the same
// two screens, and the same state (known lives above both screens, revealed lives
// in the detail screen). It also plays a 30-second replay of the app being used.
(function () {
  const words = GAME_WORDS;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // App state, as in HitboxApp() and WordDetailScreen().
  let known = new Set();
  let backStack = [{ screen: 'list' }];
  let revealed = false;
  let saveable = true;
  let scrollTop = 0;

  const topbar = $('topbar'), body = $('body'), toast = $('toast'), log = $('log');

  function current() { return backStack[backStack.length - 1]; }

  function say(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function showState() {
    const top = current();
    const route = top.screen === 'list' ? 'WordList' : `WordDetail(id = ${top.id})`;
    const ids = [...known].sort((a, b) => a - b).join(', ');
    log.textContent = `screen: ${route}\nknown = {${ids}}` + (top.screen === 'detail' ? `\nrevealed = ${revealed}` : '');
  }

  function render() {
    const top = current();
    topbar.replaceChildren();
    body.replaceChildren();
    if (top.screen === 'list') renderList(); else renderDetail(words.find((w) => w.id === top.id));
    showState();
  }

  function renderList() {
    topbar.append(el('span', null, 'Hitbox: game words'));
    body.append(el('div', 'progress-text', `Known ${known.size} of ${words.length}`));
    const bar = el('div', 'bar');
    const fill = el('span');
    fill.style.width = `${(known.size / words.length) * 100}%`;
    bar.append(fill);
    body.append(bar);
    for (const w of words) {
      const row = el('button', 'row');
      row.type = 'button';
      row.dataset.id = w.id;
      const text = el('span');
      text.append(el('span', 'over', `Level ${w.level}`), el('strong', null, w.term), el('span', 'sup', w.meaning));
      const star = el('span', 'star', known.has(w.id) ? '★' : '☆');
      star.setAttribute('aria-label', known.has(w.id) ? 'known' : 'not known yet');
      row.append(text, star);
      row.addEventListener('click', () => openWord(w.id));
      body.append(row);
    }
    body.scrollTop = scrollTop;
  }

  function renderDetail(w) {
    const back = el('button', null, '< Back');
    back.type = 'button';
    back.id = 'app-back';
    back.addEventListener('click', goBack);
    topbar.append(back, el('span', null, `Level ${w.level}`));
    const d = el('div', 'detail');
    d.append(el('h3', null, w.term));
    if (revealed) {
      const m = el('div', 'meaning');
      m.append(el('p', null, w.meaning), el('p', null, `In a game: ${w.example}`));
      d.append(m, el('p', null, 'Did you know it?'));
      const btns = el('div', 'app-btns');
      const yes = el('button', 'app-btn', 'I knew it');
      yes.id = 'app-yes';
      const no = el('button', 'app-btn outline', 'Not yet');
      no.id = 'app-no';
      yes.type = no.type = 'button';
      yes.addEventListener('click', () => { setKnown(w.id, true); goBack(); });
      no.addEventListener('click', () => { setKnown(w.id, false); goBack(); });
      btns.append(yes, no);
      d.append(btns);
    } else {
      d.append(el('p', null, 'Say the meaning out loud first. Then check.'));
      const show = el('button', 'app-btn', 'Show meaning');
      show.type = 'button';
      show.id = 'app-show';
      show.addEventListener('click', () => { revealed = true; render(); });
      d.append(show);
    }
    if (known.has(w.id)) d.append(el('p', 'known-msg', '★ You marked this one as known.'));
    body.append(d);
  }

  function openWord(id) {
    scrollTop = body.scrollTop;
    backStack.push({ screen: 'detail', id });
    revealed = false;
    render();
    body.scrollTop = 0;
  }

  function goBack() {
    if (backStack.length > 1) { backStack.pop(); revealed = false; render(); }
    else say('The list is the first screen. Back would close the app.');
  }

  function setKnown(id, on) {
    if (on) known.add(id); else known.delete(id);
  }

  // Rotation recreates the activity. remember loses its values; rememberSaveable keeps them.
  // The back stack is saved by Navigation either way.
  function rotate() {
    const phone = $('phone');
    phone.classList.add('turn');
    setTimeout(() => {
      phone.classList.remove('turn');
      if (!saveable) known = new Set();
      render();
      say(saveable ? 'Rotated. rememberSaveable kept your stars.' : 'Rotated. remember lost your stars.');
    }, 650);
  }

  function reset() {
    known = new Set(); backStack = [{ screen: 'list' }]; revealed = false; scrollTop = 0; render();
  }

  $('sysback').addEventListener('click', goBack);
  $('rotate').addEventListener('click', rotate);
  $('reset').addEventListener('click', () => { stopReplay(); reset(); });
  $('saveable').addEventListener('change', (e) => { saveable = e.target.checked; say(saveable ? 'Using rememberSaveable' : 'Using remember'); });

  // ---- The 30-second replay ----
  const tapDot = $('tap');
  function tapOn(target) {
    if (!target) return;
    const s = $('screen').getBoundingClientRect();
    const r = target.getBoundingClientRect();
    tapDot.style.left = `${r.left - s.left + Math.min(r.width / 2, 120)}px`;
    tapDot.style.top = `${r.top - s.top + r.height / 2}px`;
    tapDot.classList.add('show');
    setTimeout(() => { tapDot.classList.remove('show'); target.click(); }, 350);
  }
  const rowFor = (id) => body.querySelector(`.row[data-id="${id}"]`);
  const scrollToRow = (id) => { const r = rowFor(id); if (r) body.scrollTop = r.offsetTop - 120; };

  const script = [
    { t: 0, cap: 'The word list. 12 game words, none known yet.', run: () => { reset(); saveable = true; $('saveable').checked = true; } },
    { t: 2.5, cap: 'Tap "Core loop" to open its screen.', run: () => tapOn(rowFor(4)) },
    { t: 5, cap: 'Say it out loud, then tap Show meaning.', run: () => tapOn($('app-show')) },
    { t: 8, cap: 'I knew it. Back to the list: Known 1 of 12, and a star.', run: () => tapOn($('app-yes')) },
    { t: 11, cap: 'Scroll down and tap "Hitbox".', run: () => { scrollToRow(8); setTimeout(() => tapOn(rowFor(8)), 600); } },
    { t: 14, cap: 'Show meaning.', run: () => tapOn($('app-show')) },
    { t: 16.5, cap: 'Not yet. No star for this one.', run: () => tapOn($('app-no')) },
    { t: 19, cap: 'Tap "Cooldown", show it, and mark it known.', run: () => { scrollToRow(12); setTimeout(() => tapOn(rowFor(12)), 600); } },
    { t: 21, cap: 'Tap "Cooldown", show it, and mark it known.', run: () => tapOn($('app-show')) },
    { t: 23, cap: 'Known 2 of 12.', run: () => tapOn($('app-yes')) },
    { t: 25, cap: 'Rotate the phone. rememberSaveable keeps both stars.', run: () => rotate() },
    { t: 28.5, cap: 'End of replay. Now try it yourself, or untick rememberSaveable and rotate.', run: () => {} }
  ];
  const LENGTH = 30;
  let start = 0, timer = null, next = 0;
  const chapters = $('chapters') ? [...$('chapters').children] : [];

  function fmt(s) { const v = Math.min(LENGTH, Math.floor(s)); return `0:${String(v).padStart(2, '0')} / 0:30`; }

  function tick() {
    const t = (performance.now() - start) / 1000;
    while (next < script.length && script[next].t <= t) {
      script[next].run();
      $('caption').textContent = script[next].cap;
      chapters.forEach((li, i) => li.classList.toggle('now', Number(li.dataset.step) <= next && (i === chapters.length - 1 || Number(chapters[i + 1].dataset.step) > next)));
      next++;
    }
    $('track').style.width = `${Math.min(100, (t / LENGTH) * 100)}%`;
    $('time').textContent = fmt(t);
    if (t >= LENGTH) { stopReplay(); $('play').textContent = 'Play again'; return; }
    timer = requestAnimationFrame(tick);
  }
  function stopReplay() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
    $('play').textContent = 'Play replay';
  }
  $('play').addEventListener('click', () => {
    if (timer) { stopReplay(); return; }
    start = performance.now(); next = 0;
    $('play').textContent = 'Stop';
    $('phone').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    timer = requestAnimationFrame(tick);
  });

  render();
})();
