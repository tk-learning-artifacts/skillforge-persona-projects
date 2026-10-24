// Fair Picker: picks students with no repeats, and makes random groups.
// Daniel Ong (an AI persona) built it with ChatGPT for a Sec 2 class.
//
// Who wrote what. Each block starts with one of these tags:
//   [AI] ChatGPT wrote it and I kept it.
//   [AI, then me] ChatGPT wrote it and I changed it. The tag says what.
//   [Me] I wrote it myself.
// "P3" means prompt 3 in my prompt log (prompts.html).

// [AI] P2. One wrapper, so nothing leaks into the page's global names.
(function () {
  'use strict';

  // [AI, then me] P3. ChatGPT saved only the names. I also save who is left
  // this round, so a refresh in the middle of a lesson loses nothing.
  const STORE_KEY = 'fair-picker';

  function emptyClass() {
    return { names: [], absent: [], left: [], history: [] };
  }

  function loadClass(useStorage) {
    if (!useStorage) return emptyClass();
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && Array.isArray(saved.names)) return Object.assign(emptyClass(), saved);
    } catch (err) {
      // Storage is blocked or the data is broken: start with an empty class.
    }
    return emptyClass();
  }

  function saveClass(state, useStorage) {
    if (!useStorage) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      // Storage is full or blocked. The app still works until the page closes.
    }
  }

  // [Me] Two students with the same name get a number, so they stay two people.
  function parseNames(text) {
    const seen = {};
    return text.split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((name) => {
        seen[name] = (seen[name] || 0) + 1;
        return seen[name] === 1 ? name : name + ' (' + seen[name] + ')';
      });
  }

  // [Me] Register numbers instead of names, so no names sit on a shared laptop.
  function registerNumbers(count) {
    const list = [];
    for (let i = 1; i <= count; i++) list.push('No. ' + i);
    return list;
  }

  // [AI, then me] P6. ChatGPT's first shuffle was list.sort(() => Math.random() - 0.5).
  // That is not fair: see code.html. This is the Fisher-Yates shuffle.
  // I made it copy the list first, so the class list keeps its order.
  function shuffle(list, random) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); // any spot from 0 to i
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // [AI, then me] P4. ChatGPT's version left one student alone (28 in groups of 3).
  // Now the number of groups rounds down, and extra students join groups one each.
  function makeGroups(list, size, random) {
    const count = Math.max(1, Math.floor(list.length / size));
    const groups = Array.from({ length: count }, () => []);
    shuffle(list, random).forEach((name, i) => groups[i % count].push(name));
    return groups;
  }

  // [AI, then me] P8. ChatGPT took absent students out of the round for good.
  // I skip them at pick time instead, so they keep their turn for later.
  function pickNext(state, random) {
    const here = state.left.filter((name) => !state.absent.includes(name));
    if (here.length === 0) return null;
    const name = here[Math.floor(random() * here.length)];
    state.left = state.left.filter((n) => n !== name);
    state.history.push(name);
    return name;
  }

  // [AI] P2.
  function undoPick(state) {
    const name = state.history.pop();
    if (name !== undefined) state.left.push(name);
    return name;
  }

  function newRound(state) {
    state.left = state.names.slice();
    state.history = [];
  }

  // [AI, then me] P7. ChatGPT built the page with innerHTML. A name like
  // <img src=x onerror=alert(1)> then ran as code. This helper only ever
  // sets text, so a name always shows as plain text.
  function el(tag, props, children) {
    const node = document.createElement(tag);
    const attrs = (props && props.attrs) || {};
    Object.keys(props || {}).forEach((key) => {
      if (key !== 'attrs') node[key] = props[key];
    });
    Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    (children || []).forEach((child) => node.append(child)); // strings become text
    return node;
  }

  // [AI] P9. Three tabs: Pick, Groups and Class.
  let instances = 0;

  function mount(root, options) {
    const opts = Object.assign({ storage: true, random: Math.random }, options);
    const id = 'fp' + (++instances);
    const state = loadClass(opts.storage);
    let groups = [];

    const save = () => saveClass(state, opts.storage);

    const tabs = {};
    const panels = {};
    const tabList = el('div', { className: 'fp-tabs', attrs: { role: 'tablist', 'aria-label': 'Fair Picker' } });
    [['pick', 'Pick'], ['groups', 'Groups'], ['class', 'Class']].forEach(([key, label]) => {
      tabs[key] = el('button', {
        type: 'button', className: 'fp-tab', textContent: label, id: id + '-tab-' + key,
        attrs: { role: 'tab', 'aria-controls': id + '-' + key, 'data-tab': key }
      });
      panels[key] = el('section', {
        className: 'fp-panel', id: id + '-' + key,
        attrs: { role: 'tabpanel', 'aria-labelledby': id + '-tab-' + key }
      });
      tabs[key].addEventListener('click', () => show(key));
      tabList.append(tabs[key]);
    });

    function show(key) {
      Object.keys(tabs).forEach((k) => {
        tabs[k].setAttribute('aria-selected', String(k === key));
        panels[k].hidden = k !== key;
      });
    }

    // Pick panel
    const count = el('p', { className: 'fp-count' });
    const shown = el('p', { className: 'fp-name', attrs: { 'aria-live': 'polite' } });
    const pickBtn = el('button', { type: 'button', className: 'fp-primary', textContent: 'Pick next', attrs: { 'data-act': 'pick' } });
    const undoBtn = el('button', { type: 'button', textContent: 'Undo', attrs: { 'data-act': 'undo' } });
    const roundBtn = el('button', { type: 'button', textContent: 'New round', attrs: { 'data-act': 'round' } });
    const picked = el('ol', { className: 'fp-picked', attrs: { 'aria-label': 'Picked this round' } });
    panels.pick.append(count, shown, el('div', { className: 'fp-row' }, [pickBtn, undoBtn, roundBtn]), picked);

    // Groups panel
    const sizeSelect = el('select', { id: id + '-size' });
    [2, 3, 4, 5, 6].forEach((n) => sizeSelect.append(el('option', { value: String(n), textContent: String(n), selected: n === 3 })));
    const groupBtn = el('button', { type: 'button', className: 'fp-primary', textContent: 'Make groups', attrs: { 'data-act': 'groups' } });
    const groupHelp = el('p', { className: 'fp-help' });
    const groupBox = el('div', { className: 'fp-groups' });
    panels.groups.append(
      el('div', { className: 'fp-row' }, [el('label', { htmlFor: id + '-size', textContent: 'Group size' }), sizeSelect, groupBtn]),
      groupHelp, groupBox);

    // Class panel
    const listBox = el('textarea', { id: id + '-list', rows: 6, spellcheck: false, placeholder: 'One name per line' });
    const saveBtn = el('button', { type: 'button', textContent: 'Save list', attrs: { 'data-act': 'save' } });
    const howMany = el('input', { type: 'number', id: id + '-n', min: 1, max: 60, value: 28 });
    const numBtn = el('button', { type: 'button', textContent: 'Use register numbers', attrs: { 'data-act': 'numbers' } });
    const chips = el('div', { className: 'fp-chips' });
    const forgetBtn = el('button', { type: 'button', className: 'fp-quiet', textContent: 'Forget this class', attrs: { 'data-act': 'forget' } });
    panels.class.append(
      el('h3', { textContent: 'Your class' }),
      el('label', { htmlFor: id + '-list', textContent: 'Paste names, one per line' }),
      listBox,
      el('div', { className: 'fp-row' }, [saveBtn]),
      el('div', { className: 'fp-row' }, [el('label', { htmlFor: id + '-n', textContent: 'Or use numbers 1 to' }), howMany, numBtn]),
      el('h3', { textContent: 'Who is here today?' }),
      el('p', { className: 'fp-help', textContent: 'Tap a student to mark them absent. Tap again when they are back.' }),
      chips,
      el('div', { className: 'fp-row' }, [forgetBtn]));

    root.textContent = '';
    root.classList.add('fp');
    root.append(tabList, panels.pick, panels.groups, panels.class);

    // [AI, then me] P2. Drawing the page from the state. I added the
    // absent count and the messages for an empty class.
    function render() {
      const absentCount = state.names.filter((n) => state.absent.includes(n)).length;
      const leftHere = state.left.filter((n) => !state.absent.includes(n)).length;
      if (state.names.length === 0) {
        count.textContent = 'No class yet. Open the Class tab to add one.';
      } else if (leftHere === 0) {
        count.textContent = 'Everyone here has had a turn. Press New round.';
      } else {
        count.textContent = state.history.length + ' picked this round. ' + leftHere + ' still to go' +
          (absentCount ? ', ' + absentCount + ' absent.' : '.');
      }
      pickBtn.disabled = leftHere === 0;
      undoBtn.disabled = state.history.length === 0;

      picked.textContent = '';
      state.history.forEach((name) => picked.append(el('li', { textContent: name })));

      chips.textContent = '';
      state.names.forEach((name) => {
        const away = state.absent.includes(name);
        const chip = el('button', {
          type: 'button', className: 'fp-chip', textContent: name,
          attrs: { 'aria-pressed': String(away), 'data-name': name }
        });
        chip.addEventListener('click', () => toggleAbsent(name));
        chips.append(chip);
      });

      groupBox.textContent = '';
      groups.forEach((members, i) => {
        groupBox.append(el('div', { className: 'fp-group' }, [
          el('h4', { textContent: 'Group ' + (i + 1) }),
          el('ul', {}, members.map((name) => el('li', { textContent: name })))
        ]));
      });
    }

    // [AI, then me] P3. Each change saves at once. ChatGPT saved only when
    // you pressed Save list, so a refresh lost the picks.
    function setNames(list) {
      state.names = list;
      state.absent = state.absent.filter((n) => list.includes(n));
      newRound(state);
      groups = [];
      shown.textContent = '';
      save();
      render();
    }

    function pick() {
      const name = pickNext(state, opts.random);
      shown.textContent = name === null ? 'Everyone here has had a turn. Press New round.' : name;
      shown.classList.remove('fp-pop');
      void shown.offsetWidth; // restart the pop animation
      if (name !== null) shown.classList.add('fp-pop');
      save();
      render();
    }

    function toggleAbsent(name) {
      state.absent = state.absent.includes(name)
        ? state.absent.filter((n) => n !== name)
        : state.absent.concat(name);
      save();
      render();
    }

    // [AI] P2 and P8.
    pickBtn.addEventListener('click', pick);
    undoBtn.addEventListener('click', () => {
      const name = undoPick(state);
      shown.textContent = name === undefined ? '' : name + ' goes back in.';
      save();
      render();
    });
    roundBtn.addEventListener('click', () => {
      newRound(state);
      shown.textContent = 'New round. Everyone is back in.';
      save();
      render();
    });
    groupBtn.addEventListener('click', () => {
      const here = state.names.filter((n) => !state.absent.includes(n));
      const size = Number(sizeSelect.value);
      groups = here.length >= 2 ? makeGroups(here, size, opts.random) : [];
      groupHelp.textContent = here.length < 2
        ? 'You need at least 2 students here to make groups.'
        : here.length + ' students here, in ' + groups.length + ' groups. Groups have ' +
          size + ' or ' + (size + 1) + ', so nobody is left alone.';
      if (here.length >= 2 && here.length < size) groupHelp.textContent = 'Fewer students than the group size: one group.';
      render();
    });
    saveBtn.addEventListener('click', () => setNames(parseNames(listBox.value)));

    // [Me] The register-number button, the forget button, and which tab opens first.
    numBtn.addEventListener('click', () => {
      const n = Math.min(60, Math.max(1, Math.floor(Number(howMany.value) || 0)));
      listBox.value = '';
      setNames(registerNumbers(n));
    });
    forgetBtn.addEventListener('click', () => {
      if (!window.confirm('Forget this class? The list and picks are removed from this browser.')) return;
      if (opts.storage) {
        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* nothing saved */ }
      }
      listBox.value = '';
      setNames([]);
    });

    if (state.names.length && state.names[0].indexOf('No. ') !== 0) listBox.value = state.names.join('\n');
    show(state.names.length ? 'pick' : 'class');
    render();
    return { root: root, show: show };
  }

  // [Me] Exposed so the demo page and the code page can use the same code.
  window.FairPicker = { mount: mount, shuffle: shuffle, makeGroups: makeGroups };
})();
