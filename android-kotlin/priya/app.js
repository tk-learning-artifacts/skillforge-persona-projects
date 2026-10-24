// The browser copy of Word Wall. It follows the Kotlin app: search and saved live in
// WordWallApp, above both screens; the list groups words by week under sticky headers.
// It also plays a 30-second replay of the app being used.
(function () {
  const words = APP_WORDS;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  let search = '';
  let saved = new Set();
  let backStack = [{ screen: 'list' }];
  let saveable = true;
  let listScroll = 0;

  const topbar = $('topbar'), top2 = $('top2'), body = $('body'), toast = $('toast'), state = $('state');
  const current = () => backStack[backStack.length - 1];

  function say(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove('show'), 1900);
  }

  function showState() {
    const c = current();
    const ids = [...saved].sort((a, b) => a - b).join(', ');
    state.textContent = `route: ${c.screen === 'list' ? 'ListScreen' : `WordScreen(id = ${c.id})`}\nsearch = "${search}"\nsaved = {${ids}}`;
  }

  function render() {
    topbar.replaceChildren();
    top2.replaceChildren();
    body.replaceChildren();
    const c = current();
    if (c.screen === 'list') renderList(); else renderDetail(words.find((w) => w.id === c.id));
    showState();
  }

  function renderList() {
    topbar.append(el('span', 't', 'Word Wall'));
    const box = el('div', 'search');
    const label = el('label', null, 'Search words');
    label.htmlFor = 'app-search';
    const input = el('input');
    input.id = 'app-search';
    input.type = 'search';
    input.autocomplete = 'off';
    input.value = search;
    // onValueChange: the event goes up, the parent changes search, the list recomposes.
    input.addEventListener('input', () => { search = input.value; fillList(); showState(); });
    box.append(label, input);
    top2.append(box, el('div', 'count'));
    fillList();
    body.scrollTop = listScroll;
  }

  function fillList() {
    const q = search.trim().toLowerCase();
    const shown = words.filter((w) => w.word.toLowerCase().includes(q));
    top2.querySelector('.count').textContent = `${shown.length} words · ${saved.size} saved for revision`;
    body.replaceChildren();
    const weeks = [...new Set(shown.map((w) => w.week))];
    for (const wk of weeks) {
      body.append(el('div', 'wkhead', WEEK_TITLES[wk]));
      for (const w of shown.filter((x) => x.week === wk)) {
        const row = el('button', 'row');
        row.type = 'button';
        row.dataset.id = w.id;
        const t = el('span');
        t.append(el('strong', null, w.word), el('span', 'sup', w.meaning));
        row.append(t, el('span', 'saved', saved.has(w.id) ? 'Saved' : ''));
        row.addEventListener('click', () => open(w.id));
        body.append(row);
      }
    }
    if (!shown.length) body.append(el('p', 'empty', `No word matches "${search}".`));
  }

  function renderDetail(w) {
    const back = el('button', null, '< List');
    back.type = 'button';
    back.id = 'app-back';
    back.addEventListener('click', goBack);
    topbar.append(back, el('span', 't', WEEK_TITLES[w.week]));
    const d = el('div', 'detail');
    d.append(el('h3', null, w.word), el('p', 'm', w.meaning), el('p', 'lbl', 'In our app'), el('p', null, w.inOurApp));
    const sw = el('button', 'sw');
    sw.type = 'button';
    sw.id = 'app-save';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(saved.has(w.id)));
    sw.append(el('span', 'track'), el('span', null, 'Save for revision'));
    sw.addEventListener('click', () => {
      if (saved.has(w.id)) saved.delete(w.id); else saved.add(w.id);
      sw.setAttribute('aria-checked', String(saved.has(w.id)));
      showState();
    });
    d.append(sw);
    body.append(d);
  }

  function open(id) {
    listScroll = body.scrollTop;
    backStack.push({ screen: 'word', id });
    render();
    body.scrollTop = 0;
  }

  function goBack() {
    if (backStack.length > 1) { backStack.pop(); render(); }
    else say('This is the first screen. Back would close the app.');
  }

  function rotate() {
    const phone = $('phone');
    phone.classList.add('turn');
    setTimeout(() => {
      phone.classList.remove('turn');
      if (!saveable) { search = ''; saved = new Set(); }
      render();
      say(saveable ? 'Rotated. rememberSaveable kept search and saved words.' : 'Rotated. remember lost search and saved words.');
    }, 650);
  }

  function reset() {
    search = ''; saved = new Set(); backStack = [{ screen: 'list' }]; listScroll = 0; render();
  }

  $('sysback').addEventListener('click', goBack);
  $('rotate').addEventListener('click', rotate);
  $('reset').addEventListener('click', () => { stop(); reset(); });
  $('saveable').addEventListener('change', (e) => { saveable = e.target.checked; say(saveable ? 'Using rememberSaveable' : 'Using remember'); });

  // ---- The 30-second replay ----
  const dot = $('tap');
  function tap(target) {
    if (!target) return;
    const s = $('screen').getBoundingClientRect();
    const r = target.getBoundingClientRect();
    dot.style.left = `${r.left - s.left + Math.min(r.width / 2, 110)}px`;
    dot.style.top = `${r.top - s.top + r.height / 2}px`;
    dot.classList.add('show');
    setTimeout(() => { dot.classList.remove('show'); target.click(); }, 350);
  }
  function type(text) {
    const input = $('app-search');
    if (!input) return;
    tap(input);
    [...text].forEach((ch, i) => setTimeout(() => {
      input.value += ch;
      input.dispatchEvent(new Event('input'));
    }, 500 + i * 350));
  }
  function clear() {
    const input = $('app-search');
    if (!input) return;
    input.value = '';
    input.dispatchEvent(new Event('input'));
  }
  const row = (id) => body.querySelector(`.row[data-id="${id}"]`);
  const scrollTo = (id) => { const r = row(id); if (r) body.scrollTop = r.offsetTop - 90; };

  const script = [
    { t: 0, cap: 'The list: 18 words, grouped by the week students meet them.', run: () => { reset(); saveable = true; $('saveable').checked = true; } },
    { t: 2.5, cap: 'Type "st" in the search box. The list filters on every letter.', run: () => type('st') },
    { t: 6, cap: 'Tap "State" to open its screen.', run: () => tap(row(10)) },
    { t: 8.5, cap: 'Turn on Save for revision.', run: () => tap($('app-save')) },
    { t: 11, cap: 'Back to the list. The search is still "st", and State says Saved.', run: () => tap($('app-back')) },
    { t: 13.5, cap: 'Clear the search. All 18 words come back.', run: () => clear() },
    { t: 15.5, cap: 'Scroll down. Each week header sticks to the top.', run: () => scrollTo(13) },
    { t: 18.5, cap: 'Open "LazyColumn" and save it too.', run: () => tap(row(13)) },
    { t: 20.5, cap: 'Open "LazyColumn" and save it too.', run: () => tap($('app-save')) },
    { t: 22.5, cap: '2 saved for revision.', run: () => tap($('sysback')) },
    { t: 25, cap: 'Rotate. rememberSaveable keeps both saved words.', run: () => rotate() },
    { t: 28.5, cap: 'End of replay. Now try it, or untick rememberSaveable and rotate.', run: () => {} }
  ];
  const LENGTH = 30;
  const chapters = [...$('chapters').children];
  let start = 0, raf = null, next = 0;

  function tick() {
    const t = (performance.now() - start) / 1000;
    while (next < script.length && script[next].t <= t) {
      script[next].run();
      $('caption').textContent = script[next].cap;
      chapters.forEach((li, i) => li.classList.toggle('now', Number(li.dataset.step) <= next && (i === chapters.length - 1 || Number(chapters[i + 1].dataset.step) > next)));
      next++;
    }
    $('bar').style.width = `${Math.min(100, (t / LENGTH) * 100)}%`;
    $('time').textContent = `0:${String(Math.min(LENGTH, Math.floor(t))).padStart(2, '0')} / 0:30`;
    if (t >= LENGTH) { stop(); $('play').textContent = 'Play again'; return; }
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    $('play').textContent = 'Play replay';
  }
  $('play').addEventListener('click', () => {
    if (raf) { stop(); return; }
    start = performance.now(); next = 0;
    $('play').textContent = 'Stop';
    $('phone').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    raf = requestAnimationFrame(tick);
  });

  render();
})();
