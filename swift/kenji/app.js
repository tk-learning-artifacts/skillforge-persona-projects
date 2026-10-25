// The web copy of Pig Out. It follows the Swift code: PigGame holds the rules,
// TitleView is screen 1 and GameView is screen 2. Porkchop the bot holds at 20.
// PigOut.mount(element, { rolls }) starts it. `rolls` is an optional list of
// die values to use first, so the video can replay the same game.
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The rules, like PigGame.swift.
  function PigGame(target) {
    this.target = target;
    this.scores = [0, 0];
    this.turnTotal = 0;
    this.current = 0;
    this.lastRoll = null;
    this.winner = null;
  }
  PigGame.prototype.roll = function (value) {
    if (this.winner !== null) return { kind: 'won', player: this.winner };
    this.lastRoll = value;
    if (value === 1) { this.turnTotal = 0; this.current = 1 - this.current; return { kind: 'pigOut' }; }
    this.turnTotal += value;
    return { kind: 'rolled', value };
  };
  PigGame.prototype.hold = function () {
    if (this.winner !== null) return { kind: 'won', player: this.winner };
    const banked = this.turnTotal;
    this.scores[this.current] += banked;
    this.turnTotal = 0;
    if (this.scores[this.current] >= this.target) { this.winner = this.current; return { kind: 'won', player: this.current }; }
    this.current = 1 - this.current;
    return { kind: 'held', banked };
  };
  function botWantsToRoll(turnTotal, score, target) {
    if (score + turnTotal >= target) return false;
    return turnTotal < 20;
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // A die face, like DieView.swift: pips on a 3 by 3 grid.
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function die(value, size) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', 'po-die');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Die showing ' + value);
    const box = document.createElementNS(SVGNS, 'rect');
    box.setAttribute('x', 3); box.setAttribute('y', 3); box.setAttribute('width', 114); box.setAttribute('height', 114);
    box.setAttribute('rx', 24); box.setAttribute('fill', '#ffffff'); box.setAttribute('stroke', '#333'); box.setAttribute('stroke-width', 4);
    svg.appendChild(box);
    PIPS[value].forEach((p) => {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', 30 + (p % 3) * 30); c.setAttribute('cy', 30 + Math.floor(p / 3) * 30); c.setAttribute('r', 10);
      c.setAttribute('fill', value === 1 ? '#bf2966' : '#000000');
      svg.appendChild(c);
    });
    return svg;
  }

  function mount(root, opts) {
    const queued = (opts && opts.rolls ? opts.rolls.slice() : []);
    const nextRoll = () => (queued.length ? queued.shift() : 1 + Math.floor(Math.random() * 6));
    root.classList.add('po');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Pig Out app, web copy');
    const live = el('p', 'visually-hidden');
    live.setAttribute('aria-live', 'polite');
    const title = el('div', 'po-screen po-title');
    const play = el('div', 'po-screen');
    play.dataset.off = 'right';
    play.hidden = true;
    root.append(title, play, live);
    let versusBot = true;
    let target = 50;
    let botTimer = null;

    // Screen 1: TitleView.
    function drawTitle() {
      title.replaceChildren();
      const d = die(5, 84);
      d.setAttribute('aria-hidden', 'true');
      title.append(d, el('h3', '', 'Pig Out'));
      const rules = el('div', 'po-rules');
      rules.append(el('strong', '', 'How to play'));
      const ul = el('ul');
      [['⚃', 'Roll as often as you like. Each roll adds to your turn.'],
       ['⚠', 'Roll a 1 and you lose the whole turn. Pig out!'],
       ['⤓', 'Hold to bank your turn and pass the die.'],
       ['⚑', 'First to ' + target + ' wins.']].forEach(([icon, text]) => {
        const li = el('li');
        const i = el('span', '', icon); i.setAttribute('aria-hidden', 'true');
        li.append(i, el('span', '', text));
        ul.append(li);
      });
      rules.append(ul);
      const seg = el('div', 'po-seg');
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'Play against');
      [['Porkchop the bot', true], ['A friend', false]].forEach(([label, bot]) => {
        const b = el('button', '', label);
        b.type = 'button';
        b.dataset.mode = bot ? 'bot' : 'friend';
        b.setAttribute('aria-pressed', String(versusBot === bot));
        b.addEventListener('click', () => { versusBot = bot; drawTitle(); title.querySelector('[data-mode="' + b.dataset.mode + '"]').focus(); });
        seg.append(b);
      });
      const step = el('div', 'po-step');
      step.append(el('span', '', 'First to ' + target));
      const pair = el('div');
      [['−', -10, 'Lower the target'], ['+', 10, 'Raise the target']].forEach(([label, by, spoken]) => {
        const b = el('button', '', label);
        b.type = 'button';
        b.setAttribute('aria-label', spoken + ', now ' + target);
        b.disabled = (by < 0 && target <= 20) || (by > 0 && target >= 100);
        b.dataset.step = by;
        b.addEventListener('click', () => { target += by; drawTitle(); const again = title.querySelector('[data-step="' + by + '"]'); (again.disabled ? title.querySelector('[data-act="play"]') : again).focus(); });
        pair.append(b);
      });
      step.append(pair);
      const go = el('button', 'po-big-btn', 'Play');
      go.type = 'button';
      go.dataset.act = 'play';
      go.addEventListener('click', startGame);
      title.append(rules, seg, step, go);
    }

    // Screen 2: GameView.
    let game, message, dieNode;
    const name = (p) => p === 0 ? (versusBot ? 'You' : 'Player 1') : (versusBot ? 'Porkchop' : 'Player 2');
    const turnOf = (p) => name(p) === 'You' ? 'Your turn.' : name(p) + "'s turn.";
    const botsTurn = () => versusBot && game.current === 1;

    function startGame() {
      game = new PigGame(target);
      message = turnOf(0) + ' Roll the die.';
      drawGame();
      play.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { play.dataset.off = ''; title.dataset.off = 'left'; }));
      setTimeout(() => play.querySelector('[data-act="roll"]').focus(), reduceMotion() ? 0 : 360);
    }

    function leaveGame() {
      clearTimeout(botTimer);
      botTimer = null;
      play.dataset.off = 'right';
      title.dataset.off = '';
      setTimeout(() => { play.hidden = true; title.querySelector('[data-act="play"]').focus(); }, reduceMotion() ? 0 : 360);
    }

    function card(p) {
      const c = el('div', 'po-card' + (game.current === p && game.winner === null ? ' active' : ''));
      const active = game.current === p && game.winner === null;
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', name(p) + ', ' + game.scores[p] + ' of ' + game.target + (active ? ', playing now' : ''));
      c.append(el('b', '', (active ? '▶ ' : '') + name(p)), el('span', 'n', String(game.scores[p])));
      const track = el('div', 'po-track');
      const fill = el('i');
      fill.style.width = Math.min(100, 100 * game.scores[p] / game.target) + '%';
      track.append(fill);
      c.append(track);
      return c;
    }

    function drawGame(effect) {
      play.replaceChildren();
      const bar = el('div', 'po-bar');
      const back = el('button', 'po-back', '‹ Pig Out');
      back.type = 'button';
      back.dataset.act = 'back';
      back.addEventListener('click', leaveGame);
      bar.append(back, el('span', '', 'First to ' + game.target));
      const cards = el('div', 'po-cards');
      cards.append(card(0), card(1));
      const wrap = el('div', 'po-die-wrap');
      dieNode = die(game.lastRoll || 6, 128);
      if (game.lastRoll === null) dieNode.classList.add('faded');
      if (effect && !reduceMotion()) dieNode.classList.add(effect);
      wrap.append(dieNode);
      const turn = el('p', 'po-turn', 'Turn: ' + game.turnTotal);
      const msg = el('p', 'po-msg', message);
      const btns = el('div', 'po-btns');
      if (game.winner !== null) {
        const again = el('button', 'po-roll', 'Play again');
        again.type = 'button';
        again.dataset.act = 'again';
        again.addEventListener('click', () => { game = new PigGame(game.target); message = turnOf(0) + ' Roll the die.'; drawGame(); play.querySelector('[data-act="roll"]').focus(); });
        btns.append(again);
      } else {
        const roll = el('button', 'po-roll', '⚄ Roll');
        roll.type = 'button';
        roll.dataset.act = 'roll';
        roll.setAttribute('aria-label', 'Roll');
        const hold = el('button', 'po-hold', '⤓ Hold');
        hold.type = 'button';
        hold.dataset.act = 'hold';
        hold.setAttribute('aria-label', 'Hold');
        const busy = botsTurn();
        roll.disabled = busy;
        hold.disabled = busy || game.turnTotal === 0;
        roll.addEventListener('click', () => humanMove('roll'));
        hold.addEventListener('click', () => humanMove('hold'));
        btns.append(roll, hold);
      }
      play.append(bar, cards, wrap, turn, msg, btns);
    }

    function humanMove(kind) {
      const player = game.current;
      const event = kind === 'roll' ? game.roll(nextRoll()) : game.hold();
      report(event, player);
      const keep = play.querySelector('[data-act="' + kind + '"]:not(:disabled)') || play.querySelector('[data-act="roll"]:not(:disabled)') || play.querySelector('[data-act="again"]');
      if (keep) keep.focus();
      if (botsTurn()) playBot();
    }

    // Turn an event into words and motion, like report(_:by:) in GameView.swift.
    function report(event, player) {
      const who = name(player);
      let effect = null;
      if (event.kind === 'rolled') { effect = 'spin'; message = who + ' rolled ' + event.value + '. Turn total ' + game.turnTotal + '.'; }
      else if (event.kind === 'pigOut') { effect = 'shake'; message = 'Pig out! ' + who + ' rolled a 1 and lost the turn. ' + turnOf(game.current); }
      else if (event.kind === 'held') { message = who + ' banked ' + event.banked + '. ' + turnOf(game.current); }
      else { const w = event.player; message = name(w) + (name(w) === 'You' ? ' win, ' : ' wins, ') + game.scores[w] + ' to ' + game.scores[1 - w] + '!'; }
      drawGame(effect);
      live.textContent = message;
    }

    // Porkchop plays slowly, so you can watch every roll.
    function playBot() {
      if (botTimer) return;
      const step = () => {
        if (!botsTurn() || game.winner !== null) { botTimer = null; drawGame(); const r = play.querySelector('[data-act="roll"]') || play.querySelector('[data-act="again"]'); if (r && !play.hidden) r.focus(); return; }
        const wants = botWantsToRoll(game.turnTotal, game.scores[1], game.target);
        report(wants ? game.roll(nextRoll()) : game.hold(), 1);
        botTimer = setTimeout(step, 1200);
      };
      botTimer = setTimeout(step, 1200);
    }

    drawTitle();
    return { root };
  }

  window.PigOut = { mount };
  document.querySelectorAll('[data-pig-out]').forEach((node) => mount(node));
})();
