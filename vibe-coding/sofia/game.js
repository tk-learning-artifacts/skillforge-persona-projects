// Kopi Rush: the game screen. Three modes: Learn, Rush and Call it.
// Claude wrote most of this file. Lines that end in "// Sofia" are lines I
// typed or retyped myself. Sofia Reyes is an AI persona.
window.KopiGame = (function () {
  'use strict';
  const K = window.Kopi;

  const RUSH_SECONDS = 90;
  const PEEK_MS = 3000; // Sofia: Claude had 5 seconds. Campers just waited it out.
  const LEVEL_UP = 5; // right in a row to move up a level
  const TABLES = [2, 3, 5, 7, 8, 11, 12, 14];

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.keys(props || {}).forEach((key) => {
      if (key.indexOf('data-') === 0 || key.indexOf('aria-') === 0 || key === 'role') node.setAttribute(key, props[key]);
      else node[key] = props[key];
    });
    (children || []).forEach((child) => node.append(child));
    return node;
  }

  const pick = (list, random) => list[Math.floor(random() * list.length)];

  // ---- The cup picture ----
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  // Lighter brown for milk. Words under the cup say the same thing, // Sofia
  // so colour is never the only clue. // Sofia
  const COLOURS = {
    kopi: { none: '#3b2314', condensed: '#9a6a43', evaporated: '#7a5236' },
    teh: { none: '#7d3f16', condensed: '#c98c58', evaporated: '#ad7146' }
  };

  function drawCup(holder, drink) {
    holder.textContent = '';
    const box = svg('svg', { viewBox: '0 0 200 170', 'aria-hidden': 'true' });
    const iced = drink.temp === 'iced';
    const fill = drink.drink && drink.milk ? COLOURS[drink.drink][drink.milk] : null;
    if (iced) {
      box.append(svg('path', { d: 'M62 18 L138 18 L130 150 Q129 158 121 158 L79 158 Q71 158 70 150 Z', class: 'glass' }));
      if (fill) box.append(svg('path', { d: 'M66 48 L134 48 L130 148 Q129 154 122 154 L78 154 Q71 154 70 148 Z', fill: fill }));
      [[76, 56, -8], [102, 64, 10], [84, 92, 6], [108, 104, -6]].forEach(([x, y, r]) => {
        box.append(svg('rect', { x: x, y: y, width: 20, height: 20, rx: 4, class: 'ice', transform: 'rotate(' + r + ' ' + (x + 10) + ' ' + (y + 10) + ')' }));
      });
    } else {
      box.append(svg('ellipse', { cx: 100, cy: 150, rx: 74, ry: 12, class: 'saucer' }));
      box.append(svg('path', { d: 'M144 78 Q176 80 170 104 Q164 124 136 120', class: 'handle' }));
      box.append(svg('path', { d: 'M48 62 L152 62 L144 132 Q142 144 128 144 L72 144 Q58 144 56 132 Z', class: 'cup' }));
      if (fill) {
        box.append(svg('ellipse', { cx: 100, cy: 70, rx: 50, ry: 8, fill: fill }));
        ['M80 50 q-8 -12 0 -24 q8 -12 0 -22', 'M100 50 q-8 -12 0 -24 q8 -12 0 -22', 'M120 50 q-8 -12 0 -24 q8 -12 0 -22']
          .forEach((d) => box.append(svg('path', { d: d, class: 'steam' })));
      }
    }
    // Sugar cubes: 0 for kosong, 1 less, 2 normal, 3 more.
    const cubes = { none: 0, less: 1, normal: 2, more: 3 }[drink.sugar];
    for (let i = 0; i < (cubes || 0); i++) {
      box.append(svg('rect', { x: 16, y: 136 - i * 22, width: 18, height: 18, rx: 3, class: 'sugar' }));
    }
    holder.append(box);
  }

  function partsText(drink) {
    return K.ORDER.map((part) => drink[part] ? K.find(part, drink[part]).label : '?').join(', ');
  }

  // ---- The game ----
  function mount(root, options) {
    const opts = Object.assign({ random: Math.random, autoNext: true, lockMs: 1200 }, options);
    let mode = 'learn';
    let level = 1;
    let score = 0;
    let streak = 0;
    let wanted = null;
    let table = 3;
    let made = {};
    let locked = false;
    let rushLeft = 0;
    let rushTimer = null;
    let held = false;
    let missed = [];
    let nextTimer = null;
    let peekTimer = null;

    root.textContent = '';
    root.classList.add('kr');

    const modeBtns = {};
    const modes = el('div', { className: 'kr-modes', role: 'group', 'aria-label': 'Game mode' });
    [['learn', 'Learn'], ['rush', 'Rush'], ['call', 'Call it']].forEach(([key, label]) => {
      modeBtns[key] = el('button', { type: 'button', textContent: label, 'data-mode': key });
      modeBtns[key].addEventListener('click', () => setMode(key));
      modes.append(modeBtns[key]);
    });

    const stats = el('p', { className: 'kr-stats' });
    const timer = el('div', { className: 'kr-timer', hidden: true }, [el('span')]);
    const ticket = el('div', { className: 'kr-ticket' });
    const cup = el('div', { className: 'kr-cup' });
    const cupText = el('p', { className: 'kr-cuptext' });
    const say = el('p', { className: 'kr-say', 'aria-live': 'polite' });

    const builder = el('div', { className: 'kr-builder' });
    const choiceBtns = {};
    const titles = { drink: 'Drink', milk: 'Milk', sugar: 'Sugar', temp: 'Hot or iced' };
    K.ORDER.forEach((part) => {
      choiceBtns[part] = {};
      const row = el('div', { className: 'kr-choices', role: 'group', 'aria-label': titles[part] });
      K.PARTS[part].forEach((p) => {
        const b = el('button', { type: 'button', textContent: p.label, 'data-part': part, 'data-key': p.key, 'aria-pressed': 'false' });
        b.addEventListener('click', () => choose(part, p.key));
        choiceBtns[part][p.key] = b;
        row.append(b);
      });
      builder.append(el('fieldset', {}, [el('legend', { textContent: titles[part] }), row]));
    });
    const serveBtn = el('button', { type: 'button', className: 'kr-serve', textContent: 'Serve', 'data-act': 'serve' });
    const clearBtn = el('button', { type: 'button', className: 'kr-clear', textContent: 'Empty the cup', 'data-act': 'clear' });
    serveBtn.addEventListener('click', serve);
    clearBtn.addEventListener('click', () => { made = {}; draw(); });

    const callBox = el('div', { className: 'kr-call', hidden: true, role: 'group', 'aria-label': 'Which order is this?' });

    const board = el('div', { className: 'kr-board' });
    const boardRows = [
      ['Kopi', 'coffee'], ['Teh', 'tea'], ['(no word)', 'condensed milk'], ['C', 'evaporated milk'], ['O', 'no milk'],
      ['(no word)', 'normal sugar'], ['siew dai', 'less sugar'], ['gah dai', 'more sugar'], ['kosong', 'no sugar'],
      ['(no word)', 'hot'], ['peng', 'iced']
    ];
    const boardList = el('dl', {}, boardRows.flatMap(([w, m]) => [el('dt', { textContent: w }), el('dd', { textContent: m })]));
    const boardToggle = el('button', { type: 'button', className: 'kr-boardbtn', textContent: 'Hide the code board', 'data-act': 'board' });
    const peekBtn = el('button', { type: 'button', className: 'kr-boardbtn', textContent: 'Peek for 3 seconds', 'data-act': 'peek', hidden: true });
    board.append(el('h4', { textContent: 'Code board' }), boardList);
    boardToggle.addEventListener('click', () => {
      board.hidden = !board.hidden;
      boardToggle.textContent = board.hidden ? 'Show the code board' : 'Hide the code board';
    });
    peekBtn.addEventListener('click', () => {
      board.hidden = false;
      clearTimeout(peekTimer);
      peekTimer = setTimeout(() => { if (mode === 'rush') board.hidden = true; }, PEEK_MS);
    });

    const endBox = el('div', { className: 'kr-end', hidden: true });

    const counter = el('div', { className: 'kr-counter' }, [
      el('div', { className: 'kr-order' }, [ticket, el('div', { className: 'kr-pic' }, [cup, cupText]), say]),
      el('div', { className: 'kr-work' }, [builder, callBox, el('div', { className: 'kr-actions' }, [serveBtn, clearBtn])])
    ]);
    root.append(modes, stats, timer, counter, el('div', { className: 'kr-boardrow' }, [boardToggle, peekBtn]), board, endBox);

    // ---- Drawing ----
    function draw() {
      K.ORDER.forEach((part) => Object.keys(choiceBtns[part]).forEach((key) => {
        choiceBtns[part][key].setAttribute('aria-pressed', String(made[part] === key));
      }));
      if (mode !== 'call') {
        drawCup(cup, made);
        cupText.textContent = 'Your cup: ' + partsText(made);
      }
      const ready = K.ORDER.every((part) => made[part]);
      serveBtn.disabled = !ready || locked || !wanted || (mode === 'rush' && rushLeft <= 0);
      const bits = ['Score ' + score];
      if (mode === 'learn') bits.push('Level ' + level + ' of 3', 'In a row ' + streak);
      if (mode === 'call') bits.push('In a row ' + streak);
      stats.textContent = bits.join(' · ');
      Object.keys(modeBtns).forEach((k) => modeBtns[k].setAttribute('aria-pressed', String(k === mode)));
    }

    function showOrder() {
      ticket.textContent = '';
      if (!wanted) return;
      ticket.append(el('span', { className: 'kr-table', textContent: 'Table ' + table + ' orders' }),
        el('strong', { textContent: K.name(wanted) }));
    }

    function newOrder(drink) {
      clearTimeout(nextTimer);
      const pool = mode === 'learn' ? K.drinksForLevel(level) : K.allDrinks();
      let next = drink;
      while (!next) {
        const candidate = pick(pool, opts.random);
        if (!wanted || K.name(candidate) !== K.name(wanted) || pool.length === 1) next = candidate; // Sofia: no same order twice in a row
      }
      wanted = next;
      table = pick(TABLES, opts.random);
      made = {};
      locked = false;
      say.textContent = '';
      if (mode === 'call') setUpCall(); else showOrder();
      draw();
    }

    function choose(part, key) {
      if (locked) return;
      made[part] = key;
      draw();
    }

    // Serve is locked while the customer talks. Campers double-tapped it // Sofia
    // and scored twice for one drink. // Sofia
    function serve() {
      if (locked || !wanted || !K.ORDER.every((part) => made[part])) return;
      const wrong = K.mistakes(made, wanted);
      if (wrong.length === 0) {
        score++;
        streak++;
        say.textContent = pick(['Shiok, thank you!', 'Perfect, thanks!', 'Just right!'], opts.random);
        say.className = 'kr-say good';
        if (mode === 'learn' && streak % LEVEL_UP === 0 && level < 3) {
          level++;
          say.textContent += ' Level ' + level + ': ' + (level === 2 ? 'sugar words now.' : 'peng now.');
        }
        locked = true;
        if (opts.autoNext) nextTimer = setTimeout(() => newOrder(), opts.lockMs);
      } else {
        streak = 0;
        say.textContent = wrong[0].text + (wrong.length > 1 ? ' And ' + (wrong.length - 1) + ' more thing.' : '') + (mode === 'rush' ? '' : ' Fix it and serve again.'); // Sofia
        say.className = 'kr-say bad';
        if (mode === 'rush') {
          missed.push({ order: K.name(wanted), note: wrong.map((w) => w.text).join(' ') });
          locked = true;
          if (opts.autoNext) nextTimer = setTimeout(() => newOrder(), opts.lockMs + 600);
        } else {
          // Keep the wrong cup, so the player only fixes what was wrong. // Sofia
          if (opts.lockMs > 0) {
            locked = true;
            setTimeout(() => { locked = false; draw(); }, opts.lockMs);
          }
        }
      }
      draw();
    }

    // ---- Call it: see the drink, pick its code ----
    function setUpCall() {
      ticket.textContent = '';
      ticket.append(el('span', { className: 'kr-table', textContent: 'Table ' + table + ' got this drink' }),
        el('strong', { textContent: 'What did they order?' }));
      drawCup(cup, wanted);
      cupText.textContent = 'The cup: ' + partsText(wanted);
      // Two wrong answers, each one part away from the right one.
      const near = K.allDrinks().filter((d) => K.mistakes(d, wanted).length === 1);
      const answers = [wanted];
      while (answers.length < 3 && near.length) answers.push(near.splice(Math.floor(opts.random() * near.length), 1)[0]);
      answers.sort(() => opts.random() - 0.5); // order doesn't need to be fair here
      callBox.textContent = '';
      answers.forEach((d) => {
        const b = el('button', { type: 'button', textContent: K.name(d), 'data-answer': K.name(d) });
        b.addEventListener('click', () => answer(d, b));
        callBox.append(b);
      });
    }

    function answer(d, button) {
      if (locked) return;
      if (K.name(d) === K.name(wanted)) {
        score++;
        streak++;
        say.textContent = 'Yes! ' + K.name(wanted) + '.';
        say.className = 'kr-say good';
        button.classList.add('right');
        locked = true;
        if (opts.autoNext) nextTimer = setTimeout(() => newOrder(), opts.lockMs);
      } else {
        streak = 0;
        const part = K.mistakes(d, wanted)[0].part;
        const p = K.find(part, d[part]);
        say.textContent = 'Not quite. ' + (p.word ? '"' + p.word + '" would mean ' : 'That order means ') + p.label + '.'; // Sofia
        say.className = 'kr-say bad';
        button.disabled = true;
      }
      draw();
    }

    // ---- Rush: 90 seconds, board hidden ----
    function startRush() {
      clearInterval(rushTimer);
      rushLeft = RUSH_SECONDS;
      missed = [];
      timer.hidden = false;
      tickRush();
      rushTimer = setInterval(() => {
        if (held) return;
        rushLeft--;
        tickRush();
        if (rushLeft <= 0) endRush();
      }, 1000);
    }

    function tickRush() {
      timer.firstChild.style.width = (100 * rushLeft / RUSH_SECONDS) + '%';
      timer.setAttribute('aria-label', rushLeft + ' seconds left');
      timer.dataset.left = Math.floor(rushLeft / 60) + ':' + String(rushLeft % 60).padStart(2, '0');
    }

    function endRush() {
      clearInterval(rushTimer);
      clearTimeout(nextTimer);
      locked = true;
      endBox.hidden = false;
      endBox.textContent = '';
      endBox.append(el('h4', { textContent: 'Time! You served ' + score + ' right.' }));
      if (missed.length) {
        endBox.append(el('p', { textContent: 'Your mix-ups, so you can learn them:' }),
          el('ul', {}, missed.map((m) => el('li', {}, [el('strong', { textContent: m.order + ': ' }), m.note]))));
      } else {
        endBox.append(el('p', { textContent: 'No mix-ups at all. Try Call it next.' }));
      }
      const again = el('button', { type: 'button', textContent: 'Rush again', 'data-act': 'again' });
      again.addEventListener('click', () => setMode('rush'));
      endBox.append(again);
      draw();
    }

    function setMode(next) {
      mode = next;
      clearInterval(rushTimer);
      clearTimeout(nextTimer);
      score = 0;
      streak = 0;
      wanted = null;
      endBox.hidden = true;
      timer.hidden = true;
      builder.hidden = mode === 'call';
      callBox.hidden = mode !== 'call';
      serveBtn.hidden = clearBtn.hidden = mode === 'call';
      board.hidden = mode === 'rush';
      boardToggle.hidden = mode === 'rush';
      boardToggle.textContent = 'Hide the code board';
      peekBtn.hidden = mode !== 'rush';
      if (mode === 'rush') startRush();
      newOrder();
    }

    setMode('learn');

    return {
      setMode: setMode,
      setOrder: (code) => newOrder(K.parse(code)),
      current: () => (wanted ? K.name(wanted) : ''),
      hold: (on) => { held = on; },
      stop: () => { clearInterval(rushTimer); clearTimeout(nextTimer); clearTimeout(peekTimer); }
    };
  }

  return { mount: mount, drawCup: drawCup };
})();
